// js/modules/slots.js
import { supabase, fetchWithRetry } from '../core/supabase.js'
import { utcToMsk, mskToUtc, formatDateTime } from '../core/time.js'

// Расписание слотов (время МСК)
const MORNING_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']
const EVENING_TIMES = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']
const SATURDAY_TIMES = ['10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00']

export async function generateSlotsForDate(date, half) {
  // date - объект Date в МСК, half - 'morning' или 'evening'
  const times = half === 'morning' ? MORNING_TIMES : EVENING_TIMES
  const slots = []
  
  for (const time of times) {
    const [hours, minutes] = time.split(':')
    const startDateTime = new Date(date)
    startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + 30)
    
    // Конвертируем в UTC для БД
    const startUtc = mskToUtc(startDateTime)
    const endUtc = mskToUtc(endDateTime)
    
    // Проверяем, нет ли уже такого слота
    const { data: existing } = await supabase
      .from('slots')
      .select('id')
      .eq('start_time', startUtc.toISOString())
      .maybeSingle()
    
    if (!existing) {
      slots.push({
        start_time: startUtc.toISOString(),
        end_time: endUtc.toISOString(),
        is_locked: false
      })
    }
  }
  
  if (slots.length > 0) {
    const { error } = await supabase.from('slots').insert(slots)
    if (error) throw new Error('Ошибка генерации слотов: ' + error.message)
  }
  
  return slots.length
}

export async function generateWeekFromDate(startDate) {
  // startDate - текущая дата (МСК), генерируем ПН-СБ
  const current = new Date(startDate)
  const dayOfWeek = current.getDay() // 0 вс, 1 пн...
  
  // Находим ближайший понедельник
  let monday = new Date(current)
  if (dayOfWeek === 0) {
    monday.setDate(current.getDate() - 6)
  } else {
    monday.setDate(current.getDate() - (dayOfWeek - 1))
  }
  
  let totalGenerated = 0
  
  for (let i = 0; i < 6; i++) { // ПН-СБ
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    
    if (i === 5) { // Суббота
      for (const time of SATURDAY_TIMES) {
        const [hours, minutes] = time.split(':')
        const startDateTime = new Date(date)
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        const endDateTime = new Date(startDateTime)
        endDateTime.setMinutes(endDateTime.getMinutes() + 30)
        
        const startUtc = mskToUtc(startDateTime)
        const endUtc = mskToUtc(endDateTime)
        
        const { data: existing } = await supabase
          .from('slots')
          .select('id')
          .eq('start_time', startUtc.toISOString())
          .maybeSingle()
        
        if (!existing) {
          await supabase.from('slots').insert({
            start_time: startUtc.toISOString(),
            end_time: endUtc.toISOString(),
            is_locked: false
          })
          totalGenerated++
        }
      }
    } else { // ПН-ПТ
      for (const time of [...MORNING_TIMES, ...EVENING_TIMES]) {
        const [hours, minutes] = time.split(':')
        const startDateTime = new Date(date)
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        const endDateTime = new Date(startDateTime)
        endDateTime.setMinutes(endDateTime.getMinutes() + 30)
        
        const startUtc = mskToUtc(startDateTime)
        const endUtc = mskToUtc(endDateTime)
        
        const { data: existing } = await supabase
          .from('slots')
          .select('id')
          .eq('start_time', startUtc.toISOString())
          .maybeSingle()
        
        if (!existing) {
          await supabase.from('slots').insert({
            start_time: startUtc.toISOString(),
            end_time: endUtc.toISOString(),
            is_locked: false
          })
          totalGenerated++
        }
      }
    }
  }
  
  return totalGenerated
}

export async function toggleLockHalfDay(date, half, lock) {
  // lock: true = заблокировать, false = разблокировать
  const times = half === 'morning' ? MORNING_TIMES : EVENING_TIMES
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)
  
  const dayStartUtc = mskToUtc(dayStart)
  const dayEndUtc = mskToUtc(dayEnd)
  
  // Получаем все слоты за этот день
  const { data: slots } = await supabase
    .from('slots')
    .select('*')
    .gte('start_time', dayStartUtc.toISOString())
    .lte('start_time', dayEndUtc.toISOString())
  
  if (!slots) return 0
  
  // Фильтруем по времени
  const slotsToUpdate = slots.filter(slot => {
    const mskTime = utcToMsk(slot.start_time)
    const timeStr = `${String(mskTime.getHours()).padStart(2, '0')}:${String(mskTime.getMinutes()).padStart(2, '0')}`
    return times.includes(timeStr)
  })
  
  for (const slot of slotsToUpdate) {
    await supabase
      .from('slots')
      .update({ is_locked: lock })
      .eq('id', slot.id)
  }
  
  return slotsToUpdate.length
}

export async function getAllSlots() {
  return await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .order('start_time', { ascending: true })
    if (error) throw error
    return data
  })
}

export function checkAdjacentSlots(slotsMap, currentSlotStart) {
  // slotsMap: Map ключ-start_time, значение - забронирован ли слот
  // Возвращает: 'left', 'right', 'both', или null для рекомендации
  const currentTime = new Date(currentSlotStart).getTime()
  const halfHour = 30 * 60 * 1000
  
  const leftTime = currentTime - halfHour
  const rightTime = currentTime + halfHour
  
  let leftBooked = false
  let rightBooked = false
  
  for (const [startStr, isBooked] of slotsMap.entries()) {
    const slotTime = new Date(startStr).getTime()
    if (Math.abs(slotTime - leftTime) < 1000) leftBooked = isBooked
    if (Math.abs(slotTime - rightTime) < 1000) rightBooked = isBooked
  }
  
  if (leftBooked && rightBooked) return 'both'
  if (leftBooked) return 'left'
  if (rightBooked) return 'right'
  return null
}