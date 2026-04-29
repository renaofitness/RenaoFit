// js/ui/screens.js
import { renderAuthScreen, renderMainScreen, renderBookingScreen, renderMyBookings, renderAdminPanel, renderClientsList, renderAllBookingsList } from './render.js'

export function showAuthScreen(authCallback) {
  renderAuthScreen()
  window.authCallback = authCallback
}

export function showMainScreen(user, isAdmin, switchTabCallback, logoutCallback) {
  renderMainScreen(user, isAdmin)
  window.switchTabCallback = switchTabCallback
  window.logoutCallback = logoutCallback
}

export function showBookingScreen(slots, bookingsMap, userId, bookSlotCallback) {
  renderBookingScreen(slots, bookingsMap, userId)
  window.bookSlotCallback = bookSlotCallback
}

export function showMyBookingsScreen(bookings, cancelCallback) {
  renderMyBookings(bookings, cancelCallback)
  window.cancelCallback = cancelCallback
}

export function showAdminScreen(adminCallbacks) {
  renderAdminPanel(adminCallbacks)
  window.adminCallbacks = adminCallbacks
}

export function updateClientsList(profiles, bookingsByUser) {
  renderClientsList(profiles, bookingsByUser)
}

export function updateAllBookingsList(bookings) {
  renderAllBookingsList(bookings)
}