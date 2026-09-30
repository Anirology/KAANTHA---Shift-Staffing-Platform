// Format values consistently for display in the user interface.
export function formatMoney(payment) {
  // Reject unexpected number formats and render valid amounts with grouping and two decimals.
  const value = String(payment ?? '')
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return 'LKR —'
  const [whole, fraction = ''] = value.split('.')
  return `LKR ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`
}

export function formatShiftTime(shift) {
  return `${shift.start_time?.slice(0, 5)}–${shift.end_time?.slice(0, 5)}`
}

export function toApiTime(time) {
  // Native time inputs return HH:MM; the backend time parser expects seconds too.
  return `${time}:00`
}

export function decimalString(value) {
  const [whole, fraction = ''] = value.split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}
