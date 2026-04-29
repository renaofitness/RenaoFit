// js/app.js
import { supabase } from './core/supabase.js'
import { getCurrentUser, loginOrRegister, logout, onAuthChange } from './modules/auth.js'
import { getAllSlots } from './modules/slots.js'
import { createBookings, cancelBooking, getUserBookings, getAllBookings, getBookingsMap } from './modules/bookings.js'
import { isAdmin, getAllProfiles, getAllBookingsWithDetails, getClientBookings, generateMorning, generateEvening, generateWeek, lockMorning, lockEvening } from './modules/admin.js'
import { showAuthScreen, showMainScreen, showBookingScreen, showMyBookingsScreen, showAdminScreen, updateClientsList, updateAllBookingsList } from './ui/screens.js'

let currentUser = null
let currentIsAdmin = false
let currentSlots = []
let currentBookingsMap = new Map()
let currentUserBookings = []

async function loadAllData() {
  if (!currentUser) return
  
  try {
    currentSlots = await getAllSlots()
    const bookingsData = await getAllBookings()
    currentBookingsMap = new Map()
    bookingsData.forEach(booking => {
      currentBookingsMap.set(booking.slot_id, booking.user_id)
    })
    currentUserBookings = await getUserBookings(currentUser.id)
  } catch (err) {
    console.error('Ошибка загрузки данных:', err)
  }
}

async function refreshBookingScreen() {
  await loadAllData()
  showBookingScreen(currentSlots, currentBookingsMap, currentUser.id, bookSlot)
}

async function refreshMyBookingsScreen() {
  currentUserBookings = await getUserBookings(currentUser.id)
  showMyBookingsScreen(currentUserBookings, cancelMyBooking)
}

async function bookSlot(slotId) {
  try {
    await createBookings([slotId], currentUser.id)
    await refreshBookingScreen()
    alert('✅ Вы успешно записаны!')
  } catch (err) {
    alert('❌ Ошибка записи: ' + err.message)
  }
}

async function cancelMyBooking(bookingId) {
  if (confirm('Отменить запись?')) {
    try {
      await cancelBooking(bookingId)
      await refreshMyBookingsScreen()
      await refreshBookingScreen()
      alert('✅ Запись отменена')
    } catch (err) {
      alert('❌ Ошибка отмены: ' + err.message)
    }
  }
}

async function switchTab(tabName, user, isAdmin) {
  if (tabName === 'booking') {
    await refreshBookingScreen()
  } else if (tabName === 'my') {
    await refreshMyBookingsScreen()
  } else if (tabName === 'admin' && isAdmin) {
    showAdminScreen({
      genMorning: async (date) => {
        await generateMorning(date)
        alert('Утро сгенерировано')
        if (tabName === 'admin') switchTab('admin', user, isAdmin)
      },
      genEvening: async (date) => {
        await generateEvening(date)
        alert('Вечер сгенерирован')
        if (tabName === 'admin') switchTab('admin', user, isAdmin)
      },
      genWeek: async (date) => {
        await generateWeek(date)
        alert('Неделя сгенерирована')
        if (tabName === 'admin') switchTab('admin', user, isAdmin)
      },
      lockMorning: async (date, lock) => {
        await lockMorning(date, lock)
        alert(lock ? 'Утро заблокировано' : 'Утро разблокировано')
        if (tabName === 'admin') switchTab('admin', user, isAdmin)
      },
      lockEvening: async (date, lock) => {
        await lockEvening(date, lock)
        alert(lock ? 'Вечер заблокирован' : 'Вечер разблокирован')
        if (tabName === 'admin') switchTab('admin', user, isAdmin)
      },
      loadClients: async () => {
        const profiles = await getAllProfiles()
        const allBookings = await getAllBookingsWithDetails()
        const bookingsByUser = new Map()
        allBookings.forEach(booking => {
          if (!bookingsByUser.has(booking.user_id)) bookingsByUser.set(booking.user_id, [])
          bookingsByUser.get(booking.user_id).push(booking)
        })
        updateClientsList(profiles, bookingsByUser)
      },
      loadAllBookings: async () => {
        const bookings = await getAllBookingsWithDetails()
        updateAllBookingsList(bookings)
      }
    })
  }
}

async function handleAuth(phone, name) {
  try {
    await loginOrRegister(phone, name)
    await initializeApp()
  } catch (err) {
    document.getElementById('authError').innerText = err.message
  }
}

async function handleLogout() {
  await logout()
  currentUser = null
  showAuthScreen(handleAuth)
}

async function initializeApp() {
  const user = await getCurrentUser()
  if (!user) {
    showAuthScreen(handleAuth)
    return
  }
  
  currentUser = user
  currentIsAdmin = await isAdmin(user.id)
  await loadAllData()
  
  showMainScreen(user, currentIsAdmin, switchTab, handleLogout)
}

onAuthChange(async (user) => {
  if (!user) {
    currentUser = null
    showAuthScreen(handleAuth)
  }
})

initializeApp()