// js/modules/bookings.js
import { supabase, fetchWithRetry } from '../core/supabase.js'

export async function createBookings(slotIds, userId) {
  // slotIds - массив ID слотов для записи
  const bookings = slotIds.map(slotId => ({
    slot_id: slotId,
    user_id: userId
  }))
  
  const { data, error } = await supabase
    .from('bookings')
    .insert(bookings)
    .select()
  
  if (error) throw new Error('Ошибка записи: ' + error.message)
  return data
}

export async function cancelBooking(bookingId) {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)
  
  if (error) throw new Error('Ошибка отмены: ' + error.message)
  return true
}

export async function getUserBookings(userId) {
  return await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        slot_id,
        booked_at,
        slots:slot_id (*)
      `)
      .eq('user_id', userId)
      .order('booked_at', { ascending: false })
    
    if (error) throw error
    return data
  })
}

export async function getAllBookings() {
  return await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booked_at,
        slot_id,
        user_id,
        slots:slot_id (*),
        profiles:user_id (id, phone, name)
      `)
      .order('booked_at', { ascending: false })
    
    if (error) throw error
    return data
  })
}

export async function getBookingsMap() {
  // Возвращает Map: ключ = slot_id, значение = true (забронирован)
  const { data, error } = await supabase
    .from('bookings')
    .select('slot_id')
  
  if (error) throw error
  
  const map = new Map()
  data.forEach(b => map.set(b.slot_id, true))
  return map
}