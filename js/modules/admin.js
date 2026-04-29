// js/modules/admin.js
import { supabase, fetchWithRetry } from '../core/supabase.js'
import { generateSlotsForDate, generateWeekFromDate, toggleLockHalfDay } from './slots.js'
import { formatDateTime } from '../core/time.js'

export async function isAdmin(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  
  if (error) return false
  return data?.is_admin === true
}

export async function getAllProfiles() {
  return await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  })
}

export async function getAllBookingsWithDetails() {
  return await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booked_at,
        slot_id,
        user_id,
        slots:slot_id (id, start_time, end_time, is_locked),
        profiles:user_id (id, phone, name)
      `)
      .order('booked_at', { ascending: false })
    
    if (error) throw error
    return data
  })
}

export async function getClientBookings(userId) {
  return await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booked_at,
        slot_id,
        slots:slot_id (id, start_time, end_time, is_locked)
      `)
      .eq('user_id', userId)
      .order('booked_at', { ascending: false })
    
    if (error) throw error
    return data
  })
}

export async function generateMorning(date) {
  const dateObj = new Date(date)
  return await generateSlotsForDate(dateObj, 'morning')
}

export async function generateEvening(date) {
  const dateObj = new Date(date)
  return await generateSlotsForDate(dateObj, 'evening')
}

export async function generateWeek(date) {
  const dateObj = new Date(date)
  return await generateWeekFromDate(dateObj)
}

export async function lockMorning(date, lock) {
  const dateObj = new Date(date)
  return await toggleLockHalfDay(dateObj, 'morning', lock)
}

export async function lockEvening(date, lock) {
  const dateObj = new Date(date)
  return await toggleLockHalfDay(dateObj, 'evening', lock)
}