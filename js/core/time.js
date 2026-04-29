// js/core/time.js
export function utcToMsk(utcDateStr) {
  const date = new Date(utcDateStr)
  return new Date(date.getTime() + 3 * 60 * 60 * 1000)
}

export function mskToUtc(mskDateStr) {
  const date = new Date(mskDateStr)
  return new Date(date.getTime() - 3 * 60 * 60 * 1000)
}

export function getNowMSK() {
  const now = new Date()
  return new Date(now.getTime() + 3 * 60 * 60 * 1000)
}

export function formatDateTime(date, withTime = true) {
  const d = utcToMsk(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  if (!withTime) return `${yyyy}-${mm}-${dd}`
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}