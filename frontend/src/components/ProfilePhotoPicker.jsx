// Reusable profile photo upload and removal controls.
import { useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { Button } from './Button'
import { photoUrl } from '../services/api'

export function ProfilePhotoPicker({ name, photoUrl: photoPath, busy = false, onUpload, onRemove }) {
  const input = useRef(null)
  const imageUrl = photoUrl(photoPath)
  return <div className="photo-picker">
    <span className="avatar photo-picker-avatar">{imageUrl ? <img src={imageUrl} alt={`${name} profile`} /> : <span>{(name || '?').trim().slice(0, 1).toUpperCase()}</span>}</span>
    <div className="photo-picker-actions"><strong>{name} photo</strong><p>JPEG, PNG or WebP. Up to 3 MB.</p><div>
      <input ref={input} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = '' }} />
      <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}><FontAwesomeIcon icon={faCamera} /> {photoPath ? 'Change photo' : 'Upload photo'}</Button>
      {photoPath && <Button type="button" variant="secondary" disabled={busy} onClick={onRemove}><FontAwesomeIcon icon={faTrashCan} /> Remove</Button>}
    </div></div>
  </div>
}
