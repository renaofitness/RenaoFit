// js/modules/auth.js
import { supabase } from '../core/supabase.js'

export async function loginOrRegister(phone, name) {
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length < 10) throw new Error('Введите 10 цифр телефона')
  
  // Генерируем email и пароль из телефона
  const email = `${cleanPhone}@gmail.com`
  const password = `${cleanPhone}simplepass`
  
  // Пробуем войти
  let { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  })
  
  // Если вход не удался (пользователь не существует), регистрируем
  if (error && error.message.includes('Invalid login credentials')) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          phone: cleanPhone,
          name: name
        }
      }
    })
    
    if (signUpError) throw new Error('Ошибка регистрации: ' + signUpError.message)
    
    // Создаём профиль
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: signUpData.user.id,
        phone: cleanPhone,
        name: name,
        is_admin: false
      }])
    
    if (profileError) throw new Error('Ошибка профиля: ' + profileError.message)
    
    return signUpData.user
  } else if (error) {
    throw new Error('Ошибка входа: ' + error.message)
  }
  
  return data.user
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return profile
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}
