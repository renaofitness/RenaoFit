// js/core/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'

const SUPABASE_URL = 'https://rdhvdizpatjrnxylncdc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHZkaXpwYXRqcm54eWxuY2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjEwNDgsImV4cCI6MjA5MzAzNzA0OH0.DMLCKB7HdnHkKpRxE3-jhpc157722dLz60q5qYANeZk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: 'public' },
  global: { headers: { 'x-myapp-version': '1.0.0' } },
  realtime: { params: { eventsPerSecond: 2 } }
})

// Таймаут и retry для запросов
export async function fetchWithRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout 60s')), 60000)
      )
      const result = await Promise.race([fn(), timeoutPromise])
      if (result.error) throw result.error
      return result.data
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}