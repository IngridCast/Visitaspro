import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'
import { getAdvisors } from '../inventory/inventoryApi.js'
import BackHeader from './BackHeader.jsx'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function Icon({ d, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICONS = {
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  tools: 'M14.7 6.3a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.7-7.7zM4 20l3-3',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  install: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  remove: 'M12 20V9m0 0-4 4m4-4 4 4M5 4h14',
  support: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01',
  folder: 'M3 7h7l2 2h9v10H3z',
  check: 'M4 5h16v14H4zM8 12l3 3 5-6',
  alert: 'M12 4 2 20h20zM12 10v4M12 17h.01',
  calendar: 'M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  userCheck: 'M14 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 3 17.5V19M8.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16 11l2 2 4-4',
  percent: 'M19 5 5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  arrowLeft: 'm15 6-6 6 6 6',
  arrowRight: 'm9 6 6 6-6 6',
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(month, delta) {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month) {
  const [year, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${year}`
}

// 95 → "1h 35m", 30 → "30m", 120 → "2h"
function formatMinutes(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

function Tile({ icon, tone, label, value }) {
  return (
    <div className="report-tile">
      <span className={`report-icon ${tone}`}>
        <Icon d={ICONS[icon]} />
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

// Reporte mensual del asesor: trabajos, tiempo invertido y productividad.
// Un administrador puede elegir el asesor.
function ReportPage({ user, onBack }) {
  const isAdmin = user.role === 'admin'
  const [month, setMonth] = useState(currentMonth)
  const [advisorId, setAdvisorId] = useState(user.id)
  const [advisors, setAdvisors] = useState([])
  const [state, setState] = useState({ key: null, report: null, error: '' })
  const key = `${month}#${advisorId}`
  const loading = state.key !== key

  useEffect(() => {
    if (!isAdmin) return
    getAdvisors()
      .then(setAdvisors)
      .catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let cancelled = false
    const query = advisorId === user.id ? '' : `&userId=${advisorId}`
    apiFetch(`/reports/monthly?month=${month}${query}`)
      .then(({ report }) => !cancelled && setState({ key, report, error: '' }))
      .catch((err) =>
        !cancelled &&
        setState({
          key,
          report: null,
          error: err.status === 0 ? 'Necesitas conexión para ver el reporte.' : err.message,
        }),
      )
    return () => {
      cancelled = true
    }
  }, [key, month, advisorId, user.id])

  const { report } = state
  const isCurrent = month === currentMonth()

  const timeRows = report
    ? [
        { label: 'Comercial', value: report.minutes.comercial },
        { label: 'Hotline', value: report.minutes.hotline },
        { label: 'Preventivos', value: report.minutes.pm },
        { label: 'Otros Soportes', value: report.minutes.otros_soportes },
        { label: 'Instalaciones', value: report.minutes.instalacion ?? 0 },
        { label: 'Retiros', value: report.minutes.retiro ?? 0 },
      ]
    : []
  const maxMinutes = Math.max(1, ...timeRows.map((r) => r.value))

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main report-page">
        <h1 className="page-heading">Reporte Mensual</h1>
        <div className="report-month">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
            <Icon d={ICONS.arrowLeft} />
          </button>
          <span>{monthLabel(month)}</span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrent}
            aria-label="Mes siguiente"
          >
            <Icon d={ICONS.arrowRight} />
          </button>
        </div>

        {isAdmin && (
          <section className="form-card section-card report-advisor">
            <label className="compact-field">
              Asesor
              <select value={advisorId} onChange={(e) => setAdvisorId(Number(e.target.value))}>
                {advisors.length === 0 && <option value={user.id}>{user.name}</option>}
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        {loading && <p className="hint">Cargando…</p>}
        {!loading && state.error && (
          <p className="login-error" role="alert">
            {state.error}
          </p>
        )}

        {!loading && report && (
          <>
            <h2 className="report-title">Visualizar en tiempo real</h2>
            <p className="report-subtitle">Desglose general y métricas operativas</p>
            <div className="report-grid">
              <Tile icon="phone" tone="teal" label="Hotline" value={report.counts.hotline} />
              <Tile icon="tools" tone="teal" label="Mantenimientos Prev." value={report.counts.preventive} />
              <Tile icon="install" tone="teal" label="Instalaciones" value={report.counts.installations} />
              <Tile icon="remove" tone="orange" label="Retiros" value={report.counts.removals} />
              <Tile icon="support" tone="blue" label="Otros Soportes" value={report.counts.otherSupport} />
              <Tile icon="briefcase" tone="teal" label="Comerciales" value={report.counts.commercial} />
              <Tile icon="folder" tone="amber" label="Trabajos Abiertos" value={report.counts.open} />
              <Tile icon="check" tone="green" label="Trabajos Cerrados" value={report.counts.closed} />
              <Tile icon="alert" tone="red" label="Sin Planificar" value={report.counts.unplanned} />
              <Tile icon="calendar" tone="purple" label="Planificados" value={report.counts.planned} />
            </div>

            <section className="form-card section-card report-card">
              <h3>Tiempo Invertido por Categoría</h3>
              {timeRows.map((row) => (
                <div key={row.label} className="time-row">
                  <span className="time-label">
                    <Icon d={ICONS.clock} size={16} />
                    {row.label}
                  </span>
                  <span className="time-bar">
                    <span style={{ width: `${(row.value / maxMinutes) * 100}%` }} />
                  </span>
                  <strong>{formatMinutes(row.value)}</strong>
                </div>
              ))}
              <div className="time-total">
                <span>Total</span>
                <strong>{formatMinutes(report.minutes.total)}</strong>
              </div>
            </section>

            <h2 className="report-title">Indicadores de Productividad</h2>
            <p className="report-subtitle">Rendimiento del equipo y cobertura</p>
            <section className="form-card section-card report-card productivity">
              <div className="kpi-row">
                <span className="kpi-label">
                  <span className="report-icon teal small">
                    <Icon d={ICONS.users} size={16} />
                  </span>
                  Agentes Asignados
                </span>
                <strong>{report.productivity.assignedAgents}</strong>
              </div>
              <div className="kpi-row">
                <span className="kpi-label">
                  <span className="report-icon teal small">
                    <Icon d={ICONS.userCheck} size={16} />
                  </span>
                  Agentes Visitados
                </span>
                <strong>{report.productivity.visitedAgents}</strong>
              </div>
              <div className="kpi-row">
                <span className="kpi-label">
                  <span className="report-icon teal small">
                    <Icon d={ICONS.percent} size={16} />
                  </span>
                  Cobertura
                </span>
                <strong className="accent">{report.productivity.coverage}%</strong>
              </div>
              <span className="coverage-bar">
                <span style={{ width: `${Math.min(100, report.productivity.coverage)}%` }} />
              </span>
              <div className="kpi-row">
                <span className="kpi-label">
                  <span className="report-icon teal small">
                    <Icon d={ICONS.check} size={16} />
                  </span>
                  Trabajos Ejecutados
                </span>
                <strong>{report.productivity.executedJobs}</strong>
              </div>
              <div className="kpi-row column">
                <span className="kpi-label">
                  <span className="report-icon teal small">
                    <Icon d={ICONS.chart} size={16} />
                  </span>
                  Distribución de Agentes
                </span>
                <div className="distribution">
                  <span>
                    <strong>{report.productivity.ownAgents}</strong> Propios
                  </span>
                  <span className="accent">
                    <strong>{report.productivity.supportAgents}</strong> Apoyo a Otras Zonas
                  </span>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  )
}

export default ReportPage
