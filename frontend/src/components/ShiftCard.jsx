// Present a shift summary and its available actions.
import { formatMoney, formatShiftTime } from '../utils/format'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faClock, faCoins, faFileLines, faUsers } from '@fortawesome/free-solid-svg-icons'
import { photoUrl } from '../services/api'

export function ShiftCard({ shift, actions }) {
  return (
    <article className="shift-card">
      <div className="shift-card-main">
        <div className="shift-business-photo">{shift.business_photo_url ? <img src={photoUrl(shift.business_photo_url)} alt="" /> : <span>{(shift.business_name || 'S').trim().slice(0, 1).toUpperCase()}</span>}</div>
        <div className="shift-card-top"><h2>{shift.role}</h2><span className={`chip chip-${shift.status?.toLowerCase()}`}>{shift.status}</span></div>
        <p>{shift.business_name || 'Your business'}</p>
        <dl className="facts">
          <div><dt><FontAwesomeIcon icon={faCalendarDays} /> Date</dt><dd>{shift.date}</dd></div>
          <div><dt><FontAwesomeIcon icon={faClock} /> Time</dt><dd>{formatShiftTime(shift)}</dd></div>
          <div><dt><FontAwesomeIcon icon={faFileLines} /> Required skill</dt><dd>{shift.required_skill_name}</dd></div>
          <div><dt><FontAwesomeIcon icon={faCoins} /> Payment</dt><dd>{formatMoney(shift.payment)}</dd></div>
          <div><dt><FontAwesomeIcon icon={faUsers} /> Places remaining</dt><dd>{shift.remaining_slots}</dd></div>
        </dl>
      </div>
      {actions && <div className="shift-actions">{actions}</div>}
    </article>
  )
}
