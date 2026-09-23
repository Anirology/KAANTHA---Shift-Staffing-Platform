import { formatMoney, formatShiftTime } from '../utils/format'

export function ShiftCard({ shift, actions }) {
  return (
    <article className="shift-card">
      <div className="shift-card-main">
        <div className="shift-card-top"><h2>{shift.role}</h2><span className={`chip chip-${shift.status?.toLowerCase()}`}>{shift.status}</span></div>
        <p>{shift.business_name || 'Your business'}</p>
        <dl className="facts">
          <div><dt>Date</dt><dd>{shift.date}</dd></div>
          <div><dt>Time</dt><dd>{formatShiftTime(shift)}</dd></div>
          <div><dt>Required skill</dt><dd>{shift.required_skill_name}</dd></div>
          <div><dt>Payment</dt><dd>{formatMoney(shift.payment)}</dd></div>
          <div><dt>Places remaining</dt><dd>{shift.remaining_slots}</dd></div>
        </dl>
      </div>
      {actions && <div className="shift-actions">{actions}</div>}
    </article>
  )
}
