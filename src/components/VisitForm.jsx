import { useEffect, useState } from 'react'
import { findAgent, useAgentsCatalog } from '../agents/agentsCatalog.js'
import { useAuth } from '../auth/useAuth.js'
import {
  ASSIGNED_TYPES,
  canStartVisit,
  CREATABLE_TYPES,
  VISIT_TYPES,
  visitStatusLabel,
  visitTypeLabel,
} from '../visits/constants.js'
import { nowTime, todayISO } from '../visits/dates.js'
import { getCurrentLocation } from '../visits/location.js'
import { createVisit, saveVisit } from '../visits/visitsApi.js'
import AgentInfoCard from './AgentInfoCard.jsx'
import BackHeader from './BackHeader.jsx'

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Nueva visita: recibe `agent` ({ id, name, code, address, municipality }).
// Editar (visitas programadas): recibe `visit`.
// onSaved(visit, action) con action 'save' | 'start'. Al iniciar, la app abre
// la pantalla de visita en curso.
// reschedule: el botón principal dice "Reprogramar" (al editar desde Mis Visitas).
// Instalación y retiro (creadas desde otra app) se muestran como "Datos
// Generales": tipo fijo, fecha de planificación e información del agente.
function VisitForm({ agent, visit, reschedule = false, onBack, onSaved }) {
  const editing = Boolean(visit)
  const assigned = editing && ASSIGNED_TYPES.includes(visit.type)
  // Información general del agente, desde la copia guardada en el dispositivo.
  const { user } = useAuth()
  const catalog = useAgentsCatalog(user.id)
  const agentInfo = findAgent(catalog, editing ? visit.agentId : agent?.id) ?? (editing ? null : agent)
  const agentInfoError = agentInfo
    ? ''
    : 'La información del agente no está guardada en este dispositivo. Toque "Sincronizar" en Inicio.'
  const [type, setType] = useState(visit?.type ?? '')
  const [visitDate, setVisitDate] = useState(visit?.visitDate ?? todayISO)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])


  // La visita no se realizará: queda "Cancelada" y ya no se puede modificar.
  const cancelVisit = async () => {
    if (!window.confirm('¿Cancelar esta visita? Ya no se podrá modificar ni iniciar.')) return
    setError('')
    setSaving('cancel')
    try {
      const saved = await saveVisit(visit, { status: 'cancelada' })
      onSaved(saved, 'cancel')
    } catch (err) {
      setError(err.message)
      setSaving(null)
    }
  }

  const submit = async (action) => {
    setError('')
    if (!type) {
      setError('Selecciona el tipo de visita.')
      return
    }
    if (!visitDate) {
      setError('Selecciona la fecha de visita.')
      return
    }
    if (action === 'start' && !canStartVisit(type)) {
      setError(`El inicio de visitas ${visitTypeLabel(type)} estará disponible próximamente.`)
      return
    }

    // El tipo solo se elige al crear la visita; después no se puede cambiar.
    const changes = editing ? { visitDate } : { type, visitDate }
    if (action === 'start') {
      changes.status = 'en_proceso'
      changes.visitTime = nowTime()
    } else if (!editing || visit.status === 'sin_programar') {
      // Al guardar o reprogramar con una fecha, la visita queda programada.
      changes.status = 'programada'
    }

    setSaving(action)
    try {
      // Las coordenadas se registran al iniciar la visita y ya no cambian.
      if (action === 'start') {
        setLocating(true)
        try {
          Object.assign(changes, await getCurrentLocation())
        } finally {
          setLocating(false)
        }
      }
      const saved = editing ? await saveVisit(visit, changes) : await createVisit(agent, changes)
      onSaved(saved, action === 'save' && (reschedule || assigned) ? 'reschedule' : action)
    } catch (err) {
      setError(err.message)
      setSaving(null)
    }
  }

  const agentName = editing ? visit.agentName : agent?.name
  // Solo algunos tipos ya tienen pantalla de visita en curso.
  const startBlocked = Boolean(type) && !canStartVisit(type)

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main visit-form">
        <h1 className="page-heading">
          {assigned ? 'Datos Generales' : editing ? 'Editar Visita' : 'Registro de Visita'}
        </h1>
        <p className="page-subtitle">
          {assigned
            ? 'Visita asignada. Puede reprogramar la fecha o iniciarla.'
            : editing
              ? 'Modifique los datos de la visita o iníciela.'
              : 'Complete el siguiente formulario para registrar una visita de campo.'}
        </p>

        <p className="visit-agent">
          <span>Agente:</span> {agentName || '—'}
          {editing && (
            <span className={`status-badge ${visit.status}`}>{visitStatusLabel(visit.status)}</span>
          )}
        </p>

        <form className="form-card" onSubmit={(e) => e.preventDefault()}>
          <label>
            Tipo de Visita
            <span className="input-with-icon">
              <ListIcon />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={editing}
                required
              >
                <option value="" disabled>
                  Seleccione…
                </option>
                {(editing ? VISIT_TYPES : CREATABLE_TYPES).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
            {editing && (
              <span className="hint">El tipo de visita no se puede cambiar.</span>
            )}
          </label>

          <label>
            {assigned ? 'Fecha de planificación' : 'Fecha de Visita'}
            <span className="input-with-icon">
              <CalendarIcon />
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
            </span>
          </label>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
        </form>

        {agentInfo && (
          <div className="assigned-agent">
            <AgentInfoCard agent={agentInfo} title="Información General del Agente" />
          </div>
        )}
        {agentInfoError && <p className="hint">{agentInfoError}</p>}

        <div className="visit-actions">
          <button
            type="button"
            className="outline"
            onClick={() => submit('save')}
            disabled={saving !== null}
          >
            {assigned
              ? saving === 'save'
                ? 'Reprogramando…'
                : 'Reprogramar Visita'
              : reschedule
              ? saving === 'save'
                ? 'Reprogramando…'
                : 'Reprogramar'
              : saving === 'save'
                ? 'Guardando…'
                : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => submit('start')}
            disabled={saving !== null || startBlocked}
          >
            {saving === 'start' ? (locating ? 'Obteniendo ubicación…' : 'Iniciando…') : 'Iniciar'}
          </button>
          {startBlocked && (
            <p className="hint start-blocked">
              El inicio de visitas {visitTypeLabel(type)} estará disponible próximamente. Por ahora
              puede guardarla como programada.
            </p>
          )}
        </div>

        {editing && !assigned && (
          <button
            type="button"
            className="cancel-visit"
            onClick={cancelVisit}
            disabled={saving !== null}
          >
            {saving === 'cancel' ? 'Cancelando…' : 'Cancelar visita'}
          </button>
        )}
      </main>
    </>
  )
}

export default VisitForm
