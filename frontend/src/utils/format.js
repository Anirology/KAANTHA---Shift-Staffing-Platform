export function formatMoney(payment) {
  return `LKR ${Number(payment).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatShiftTime(shift) {
  return `${shift.start_time?.slice(0, 5)}–${shift.end_time?.slice(0, 5)}`
}

export function toApiTime(time) {
  return `${time}:00`
}

export function decimalString(value) {
  const [whole, fraction = ''] = value.split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}
