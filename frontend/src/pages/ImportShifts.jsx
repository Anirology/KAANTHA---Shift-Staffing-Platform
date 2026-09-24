import { useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { StatusMessage } from '../components/StatusMessage'

export function ImportShifts() {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); if (!file) return
    setBusy(true); setError(''); setResult(null)
    try { setResult(await api.importShifts(file)) }
    catch (caught) { setError(caught.message) }
    finally { setBusy(false) }
  }
  return <div className="screen narrow-screen"><header className="screen-heading"><div><span className="intro-eyebrow">Business</span><h1>Import shifts</h1><p>Upload a CSV to create valid shifts. Invalid rows are reported below.</p></div></header>
    <section className="panel"><h2>CSV file</h2><p>Required headers: <code>role,date,start_time,end_time,required_workers,payment,required_skill_id</code>. Use YYYY-MM-DD dates and existing skill IDs.</p><form className="form" onSubmit={submit}><FieldFile file={file} setFile={(next) => { setFile(next); setResult(null); setError('') }} /><Button type="submit" disabled={!file || busy}>{busy ? 'Processing…' : 'Import shifts'}</Button></form></section>
    {error && <StatusMessage type="error">{error}</StatusMessage>}
    {result && <section className="panel" aria-live="polite"><h2>Import result</h2><div className="import-summary"><div><strong>{result.total_rows}</strong><span>Total rows</span></div><div><strong>{result.created}</strong><span>Created</span></div><div><strong>{result.failed}</strong><span>Failed</span></div></div>{result.errors?.length > 0 && <><h3>Row errors</h3><div className="table-scroll"><table><thead><tr><th>Row</th><th>Field</th><th>Message</th></tr></thead><tbody>{result.errors.map((item, index) => <tr key={`${item.row}-${item.field}-${index}`}><td>{item.row}</td><td>{item.field}</td><td>{item.message}</td></tr>)}</tbody></table></div></>}</section>}
  </div>
}

function FieldFile({ file, setFile }) {
  return <label className="field" htmlFor="shift-csv">Select CSV file<input id="shift-csv" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} /><span className="field-hint">{file ? `Selected: ${file.name}` : 'No file selected'}</span></label>
}
