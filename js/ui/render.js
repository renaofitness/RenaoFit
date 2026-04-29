// js/ui/render.js
import { formatDateTime, utcToMsk } from '../core/time.js'
import { checkAdjacentSlots } from '../modules/slots.js'

export function renderAuthScreen() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="auth-container">
      <h1>🏋️ Запись на тренировки</h1>
      <div class="auth-card">
        <h2>Вход / Регистрация</h2>
        <input type="tel" id="phone" placeholder="Телефон (10 цифр)" maxlength="10">
        <input type="text" id="name" placeholder="Ваше имя">
        <button id="authBtn">Продолжить</button>
        <div id="authError" class="error"></div>
      </div>
    </div>
  `
  
  document.getElementById('authBtn').onclick = async () => {
    const phone = document.getElementById('phone').value
    const name = document.getElementById('name').value
    if (!phone || !name) {
      document.getElementById('authError').innerText = 'Заполните все поля'
      return
    }
    window.authCallback && window.authCallback(phone, name)
  }
}

export function renderMainScreen(user, isAdmin) {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="main-container">
      <div class="header">
        <h2>👋 Здравствуй, ${user.name}</h2>
        <button id="logoutBtn" class="logout">Выйти</button>
      </div>
      <div class="tabs">
        <button class="tab active" data-tab="booking">📅 Запись</button>
        <button class="tab" data-tab="my">📋 Мои записи</button>
        ${isAdmin ? '<button class="tab" data-tab="admin">🔧 Админка</button>' : ''}
      </div>
      <div id="tabContent" class="tab-content"></div>
    </div>
  `
  
  document.getElementById('logoutBtn').onclick = () => window.logoutCallback()
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const tabName = tab.dataset.tab
      window.switchTabCallback && window.switchTabCallback(tabName, user, isAdmin)
    }
  })
  
  window.switchTabCallback && window.switchTabCallback('booking', user, isAdmin)
}

export function renderBookingScreen(slots, bookingsMap, userId) {
  const container = document.getElementById('tabContent')
  
  // Группируем слоты по датам
  const grouped = new Map()
  slots.forEach(slot => {
    const date = formatDateTime(slot.start_time, false)
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date).push(slot)
  })
  
  let html = `<div class="booking-container"><h3>Доступные слоты</h3>`
  
  for (const [date, daySlots] of grouped) {
    const isBookedByUser = (slotId) => bookingsMap.has(slotId) && bookingsMap.get(slotId) === userId
    
    // Создаем карту занятости для рекомендаций
    const slotStatusMap = new Map()
    daySlots.forEach(slot => {
      const isBooked = bookingsMap.has(slot.id)
      slotStatusMap.set(slot.start_time, isBooked)
    })
    
    html += `<div class="date-group"><h4>📅 ${date}</h4><div class="slots-grid">`
    
    daySlots.forEach(slot => {
      const isBooked = bookingsMap.has(slot.id)
      const isMyBook = isBookedByUser(slot.id)
      const isLocked = slot.is_locked
      const disabled = isBooked || isLocked || isMyBook
      
      // Рекомендация
      let recommendation = null
      if (!isBooked && !isLocked && !isMyBook) {
        recommendation = checkAdjacentSlots(slotStatusMap, slot.start_time)
      }
      
      const timeStr = formatDateTime(slot.start_time, true).split(' ')[1]
      let recHtml = ''
      if (recommendation) recHtml = '<span class="rec-star">⭐ РЕКОМЕНДУЕМОЕ</span>'
      
      let statusHtml = ''
      if (isLocked) statusHtml = '<span class="status-locked">🔒 ЗАБЛОКИРОВАНО</span>'
      else if (isBooked && !isMyBook) statusHtml = '<span class="status-booked">❌ ЗАНЯТО</span>'
      else if (isMyBook) statusHtml = '<span class="status-my">✅ ВЫ ЗАПИСАНЫ</span>'
      
      html += `
        <div class="slot-card ${disabled ? 'disabled' : ''} ${recommendation ? 'recommended' : ''}">
          <div class="slot-time">${timeStr}</div>
          ${recHtml}
          ${statusHtml}
          ${!disabled && !isMyBook ? `<button class="book-slot" data-slot-id="${slot.id}">📝 Записаться</button>` : ''}
        </div>
      `
    })
    
    html += `</div></div>`
  }
  
  html += `</div>`
  container.innerHTML = html
  
  document.querySelectorAll('.book-slot').forEach(btn => {
    btn.onclick = () => {
      const slotId = parseInt(btn.dataset.slotId)
      window.bookSlotCallback && window.bookSlotCallback(slotId)
    }
  })
}

export function renderMyBookings(bookings, cancelCallback) {
  const container = document.getElementById('tabContent')
  
  if (bookings.length === 0) {
    container.innerHTML = `<div class="empty"><p>У вас нет записей</p></div>`
    return
  }
  
  let html = `<div class="my-bookings"><h3>Мои записи</h3>`
  bookings.forEach(booking => {
    const slot = booking.slots
    const dateTime = formatDateTime(slot.start_time, true)
    html += `
      <div class="booking-card">
        <div>📅 ${dateTime}</div>
        <button class="cancel-btn" data-id="${booking.id}">❌ Отменить</button>
      </div>
    `
  })
  html += `</div>`
  container.innerHTML = html
  
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.onclick = () => cancelCallback(parseInt(btn.dataset.id))
  })
}

export function renderAdminPanel(adminCallbacks) {
  const container = document.getElementById('tabContent')
  const today = new Date().toISOString().split('T')[0]
  
  container.innerHTML = `
    <div class="admin-panel">
      <div class="admin-section">
        <h3>🎛️ Генерация слотов</h3>
        <input type="date" id="genDate" value="${today}">
        <button id="genMorningBtn">🌅 Сгенерировать утро</button>
        <button id="genEveningBtn">🌙 Сгенерировать вечер</button>
        <button id="genWeekBtn">📅 Сгенерировать неделю (ПН-СБ)</button>
      </div>
      
      <div class="admin-section">
        <h3>🔒 Блокировка половинок дня</h3>
        <input type="date" id="lockDate" value="${today}">
        <button id="lockMorningBtn">🔒 Заблокировать утро</button>
        <button id="unlockMorningBtn">🔓 Разблокировать утро</button>
        <button id="lockEveningBtn">🔒 Заблокировать вечер</button>
        <button id="unlockEveningBtn">🔓 Разблокировать вечер</button>
      </div>
      
      <div class="admin-section">
        <h3>👥 Клиенты и их записи</h3>
        <div id="clientsList">Загрузка...</div>
      </div>
      
      <div class="admin-section">
        <h3>📋 Все записи</h3>
        <div id="allBookingsList">Загрузка...</div>
      </div>
    </div>
  `
  
  document.getElementById('genMorningBtn').onclick = () => adminCallbacks.genMorning(document.getElementById('genDate').value)
  document.getElementById('genEveningBtn').onclick = () => adminCallbacks.genEvening(document.getElementById('genDate').value)
  document.getElementById('genWeekBtn').onclick = () => adminCallbacks.genWeek(document.getElementById('genDate').value)
  document.getElementById('lockMorningBtn').onclick = () => adminCallbacks.lockMorning(document.getElementById('lockDate').value, true)
  document.getElementById('unlockMorningBtn').onclick = () => adminCallbacks.lockMorning(document.getElementById('lockDate').value, false)
  document.getElementById('lockEveningBtn').onclick = () => adminCallbacks.lockEvening(document.getElementById('lockDate').value, true)
  document.getElementById('unlockEveningBtn').onclick = () => adminCallbacks.lockEvening(document.getElementById('lockDate').value, false)
  
  adminCallbacks.loadClients()
  adminCallbacks.loadAllBookings()
}

export function renderClientsList(profiles, bookingsByUser) {
  const container = document.getElementById('clientsList')
  if (!container) return
  
  let html = `<div class="clients-grid">`
  profiles.forEach(profile => {
    const userBookings = bookingsByUser.get(profile.id) || []
    html += `
      <div class="client-card">
        <div><strong>${profile.name}</strong></div>
        <div>📞 ${profile.phone}</div>
        <div>📅 Записей: ${userBookings.length}</div>
        <details>
          <summary>Показать записи</summary>
          <div class="client-bookings">
            ${userBookings.map(b => `<div>${formatDateTime(b.slots.start_time, true)}</div>`).join('')}
            ${userBookings.length === 0 ? '<div>Нет записей</div>' : ''}
          </div>
        </details>
      </div>
    `
  })
  html += `</div>`
  container.innerHTML = html
}

export function renderAllBookingsList(bookings) {
  const container = document.getElementById('allBookingsList')
  if (!container) return
  
  if (bookings.length === 0) {
    container.innerHTML = '<p>Нет записей</p>'
    return
  }
  
  let html = `<table class="bookings-table">
    <thead><tr><th>Клиент</th><th>Телефон</th><th>Дата и время</th><th>Записан</th></tr></thead><tbody>`
  
  bookings.forEach(booking => {
    const profile = booking.profiles
    const slot = booking.slots
    html += `
      <tr>
        <td>${profile?.name || 'Неизвестно'}</td>
        <td>${profile?.phone || '-'}</td>
        <td>${formatDateTime(slot.start_time, true)}</td>
        <td>${formatDateTime(booking.booked_at, true)}</td>
      </tr>
    `
  })
  html += `</tbody></table>`
  container.innerHTML = html
}