import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'
import { formatMoney } from '../utils/format'

const reports = {
  staffing: { title: 'Staffing', fields: ['shift_id', 'role', 'date', 'required_workers', 'confirmed_workers', 'remaining_slots', 'status', 'payment'] },
  workers: { title: 'Workers', fields: ['worker_id', 'worker_name', 'completed_shifts', 'total_hours', 'total_earnings'] },
  attendance: { title: 'Attendance', fields: ['worker_id', 'worker_name', 'shift_id', 'role', 'date', 'application_status', 'attendance_status', 'completion_status', 'rejection_reason'] },
}
const label = (field) => field.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
const cell = (field, value) => value == null ? '—' : ['payment', 'total_earnings'].includes(field) ? formatMoney(value) : value
const rowKey = (kind, row) => kind === 'staffing' ? row.shift_id : kind === 'workers' ? row.worker_id : `${row.shift_id}-${row.worker_id}`

export function Reports() {
  const [kind, setKind] = useState('staffing')
  const [draft, setDraft] = useState({ from_date: '', to_date: '' })
  const [filters, setFilters] = useState({ from_date: '', to_date: '' })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')
  const requestId = useRef(0)
  const load = useCallback(async () => {
    const id = ++requestId.current
    try { const data = await api.report(kind, filters); if (id === requestId.current) { setRows(data); setError('') } }
    catch (caught) { if (id === requestId.current) setError(caught.message) }
    finally { if (id === requestId.current) setLoading(false) }
  }, [kind, filters])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  async function download() {
    setExporting(true); setExportError('')
    try {
      const blob = await api.exportReport(kind, filters)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `${kind}-report.csv`; document.body.append(anchor); anchor.click(); anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (caught) { setExportError(caught.message) }
    finally { setExporting(false) }
  }
  return <div className="screen reports-screen"><header className="screen-heading"><div><span className="intro-eyebrow">SHIFTLY · BUSINESS</span><h1>Business reports</h1><p>Review live shift data and download the same filtered rows as CSV.</p></div><Button type="button" variant="secondary" disabled={loading || exporting || !!error} onClick={download}>{exporting ? 'Preparing…' : 'Download CSV'}</Button></header>
    <div className="report-tabs" role="group" aria-label="Report type">{Object.entries(reports).map(([key, report]) => <button type="button" className={kind === key ? 'report-tab active' : 'report-tab'} key={key} aria-pressed={kind === key} onClick={() => { if (kind === key) return; requestId.current += 1; setKind(key); setRows([]); setLoading(true); setError(''); setExportError('') }}>{report.title}</button>)}</div>
    <form className="report-filters panel" onSubmit={(event) => { event.preventDefault(); if (draft.from_date && draft.to_date && draft.from_date > draft.to_date) { requestId.current += 1; setLoading(false); setError('From date must be on or before to date.'); return }; requestId.current += 1; setRows([]); setLoading(true); setFilters({ ...draft }); setError('') }}><Field id="report-from" label="From date" type="date" value={draft.from_date} onChange={(event) => setDraft({ ...draft, from_date: event.target.value })} /><Field id="report-to" label="To date" type="date" value={draft.to_date} onChange={(event) => setDraft({ ...draft, to_date: event.target.value })} /><Button type="submit">Apply dates</Button></form>
    {exportError && <StatusMessage type="error">{exportError}</StatusMessage>}
    <section className="panel report-results"><span className="report-watermark" aria-hidden="true">SHIFTLY</span><h2>{reports[kind].title} report</h2><p className="report-caption">Shiftly business data</p><DataState loading={loading} error={error} onRetry={() => { setLoading(true); load() }} empty={rows.length === 0} emptyMessage="No rows for these dates."><div className="table-scroll"><table><thead><tr>{reports[kind].fields.map((field) => <th key={field}>{label(field)}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={rowKey(kind, row)}>{reports[kind].fields.map((field) => <td key={field}>{cell(field, row[field])}</td>)}</tr>)}</tbody></table></div></DataState></section>
  </div>
}
