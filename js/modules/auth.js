// js/modules/auth.js
import { supabase, fetchWithRetry } from '../core/supabase.js'

export async function loginOrRegister(phone, name) {
  // Нормализуем телефон
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length < 10) throw new Error('Неверный телефон')
  
  // Сначала проверим, существует ли пользователь с таким телефоном в profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', cleanPhone)
    .maybeSingle()
  
  let authUser
  
  if (existingProfile) {
    // Вход: нужно получить auth user по email (Supabase требует email, создадим фейк)
    const fakeEmail = `${cleanPhone}@phone.local`
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password: cleanPhone.slice(-6)
    })
    if (error) throw new Error('Ошибка входа: ' + error.message)
    authUser = data.user
  } else {
    // Регистрация
    const fakeEmail = `${cleanPhone}@phone.local`
    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
      password: cleanPhone.slice(-6),
      options: { data: { phone: cleanPhone, name: name } }
    })
    if (error) throw new Error('Ошибка регистрации: ' + error.message)
    authUser = data.user
    
    // Создаём профиль
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.id,
      phone: cleanPhone,
      name: name,
      is_admin: false
    })
    if (profileError) throw new Error('Ошибка создания профиля: ' + profileError.message)
  }
  
  return authUser
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (profileError) return null
  return profile
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}