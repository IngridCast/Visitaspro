import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'
import { FINAL_STATUSES, visitTypeLabel } from '../visits/constants.js'
import { formatLongDate, formatTime, toISODate, todayISO } from '../visits/dates.js'
import { getSnapshot } from '../sync/snapshot.js'
import { useVisits } from '../visits/useVisits.js'
import BackHeader from './BackHeader.jsx'

// Agrupación de estados para el historial.
const RESULT = {
  cerrada: { key: 'completed', label: 'Completada' },
  cancelada: { key: 'cancelled', label: 'Cancelada' },
  programada: { key: 'pending', label: 'Pendiente' },
  sin_programar: { key: 'pending', label: 'Pendiente' },
  en_proceso: { key: 'pending', label: 'Pendiente' },
}

const FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'cancelled', label: 'Canceladas' },
]

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function firstDayOfMonth() {
  const now = new Date()
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1))
}

// Motivo principal de la visita según su tipo.
function visitReason(visit) {
  return visit.reason || visit.formData?.supportCase || visitTypeLabel(visit.type)
}

// Historial consolidado de visitas de un agente: totales y visitas del periodo.
function AgentHistory({ agent, version, onEdit, onBack }) {
  const [from, setFrom] = useState(firstDayOfMonth)
  const [to, setTo] = useState(todayISO)
  const [summary, setSummary] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Totales: con conexión, de todas las fechas; sin conexión, de las visitas
  // guardadas en el dispositivo (últimos 3 meses).
  const [summaryLocal, setSummaryLocal] = useState(false)
  useEffect(() => {
    let cancelled = false
    apiFetch(`/agents/${agent.id}/visit-summary`)
      .then((data) => {
        if (cancelled) return
        setSummary(data.summary)
        setSummaryLocal(false)
      })
      .catch(async () => {
        const snapshot = await getSnapshot()
        if (cancelled) return
        const own = (snapshot?.visits ?? []).filter((v) => v.agentId === agent.id)
        const count = (statuses) => own.filter((v) => statuses.includes(v.status)).length
        setSummary(
          snapshot
            ? {
                total: own.length,
                completed: count(['cerrada']),
                pending: count(['programada', 'sin_programar', 'en_proceso']),
                cancelled: count(['cancelada']),
              }
            : null,
        )
        setSummaryLocal(Boolean(snapshot))
      })
    return () => {
      cancelled = true
    }
  }, [agent.id, version])

  const { visits, loading, error, offline, olderUnavailable } = useVisits(
    { agentId: agent.id, from, to },
    version,
  )
  const listed = [...visits]
    .filter((v) => !result || RESULT[v.status]?.key === result)
    // Las más recientes primero.
    .reverse()

  const successRate =
    summary && summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main agent-history">
        <h1 className="page-heading">Historial Consolidado</h1>
        <p className="page-subtitle">Historial de visitas realizadas al agente</p>

        <section className="form-card section-card history-agent">
          <strong>{agent.name}</strong>
          <span>
            <span className="code-pill">Código: {agent.code}</span>
            <small>Agente visitado</small>
          </span>
        </section>

        <div className="history-stats">
          <div className="history-stat">
            <span>Total de visitas recibidas</span>
            <div>
              <strong>{summary ? summary.total : '—'}</strong>
              <small>{summaryLocal ? 'Últimos 3 meses' : 'Acumulado'}</small>
            </div>
          </div>
          <div className="history-stat">
            <span>Completadas</span>
            <div>
              <strong className="stat-completed">{summary ? summary.completed : '—'}</strong>
              <small>{successRate}% éxito</small>
            </div>
          </div>
          <div className="history-stat">
            <span>Pendientes</span>
            <div>
              <strong className="stat-pending">{summary ? summary.pending : '—'}</strong>
              <small>En seguimiento</small>
            </div>
          </div>
          <div className="history-stat">
            <span>Canceladas</span>
            <div>
              <strong className="stat-cancelled">{summary ? summary.cancelled : '—'}</strong>
              <small>No realizadas</small>
            </div>
          </div>
        </div>

        <div className="history-range">
          <label className="compact-field">
            Desde
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => e.target.value && setFrom(e.target.value)}
            />
          </label>
          <label className="compact-field">
            Hasta
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => e.target.value && setTo(e.target.value)}
            />
          </label>
        </div>

        <div className="section-row">
          <h2>Visitas del Periodo</h2>
          <button
            type="button"
            className="link-button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            Filtrar ({loading ? '…' : listed.length})
          </button>
        </div>

        {showFilters && (
          <div className="result-filters" role="group" aria-label="Filtrar por resultado">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={result === f.value ? 'active' : ''}
                onClick={() => setResult(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {offline && (
          <p className="offline-note">
            {olderUnavailable
              ? 'Las visitas de más de 3 meses solo se pueden ver con conexión.'
              : 'Sin conexión: solo se muestran las visitas guardadas en este dispositivo.'}
          </p>
        )}
        {loading && <p className="hint">Cargando…</p>}
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && listed.length === 0 && (
          <p className="empty-state">No hay visitas en este periodo.</p>
        )}

        {!loading && !error && (
          <div className="history-list">
            {listed.map((visit) => {
              const status = RESULT[visit.status] ?? { key: 'pending', label: visit.status }
              return (
                <article key={visit.id} className="history-visit">
                  <div className="history-visit-top">
                    <div>
                      <h3>
                        {formatLongDate(visit.visitDate)}
                        {visit.visitTime && ` · ${formatTime(visit.visitTime)}`}
                      </h3>
                      <small>Visitador: {visit.userName || '—'}</small>
                    </div>
                    <span className={`result-badge ${status.key}`}>{status.label}</span>
                    {!FINAL_STATUSES.includes(visit.status) && onEdit && (
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => onEdit(visit)}
                        aria-label="Editar visita"
                      >
                        <PencilIcon />
                      </button>
                    )}
                  </div>
                  <p className="history-reason">
                    <span className={`type-tag ${visit.type}`}>{visitTypeLabel(visit.type)}</span>
                    <strong>Razón:</strong> {visitReason(visit)}
                  </p>
                  {visit.formData?.movements?.length > 0 && (
                    <ul className="visit-movements">
                      {visit.formData.movements.flatMap((m) => [
                        m.inAsset && (
                          <li key={`${m.id}-in`} className="instalacion">
                            {visit.status === 'cerrada' ? 'Instalado' : 'Por instalar'}: {m.inAsset}
                          </li>
                        ),
                        m.outAsset && (
                          <li key={`${m.id}-out`} className="retiro">
                            {visit.status === 'cerrada' ? 'Retirado' : 'Por retirar'}: {m.outAsset}
                          </li>
                        ),
                      ])}
                    </ul>
                  )}
                  {visit.notes && (
                    <p className="history-notes">
                      <strong>Observaciones:</strong> {visit.notes}
                    </p>
                  )}
                  {visit.pendingSync && <p className="sync-state pending">Pendiente de sincronizar</p>}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}

export default AgentHistory
