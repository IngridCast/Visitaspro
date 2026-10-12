import { FINAL_STATUSES, visitStatusLabel, visitTypeLabel } from '../visits/constants.js'
import { formatLongDate, formatLongDateTime, formatTime } from '../visits/dates.js'

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  )
}

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

function VisitCard({ visit, onEdit }) {
  const address = [visit.agentAddress, visit.agentCity].filter(Boolean).join(', ')

  return (
    <article className="visit-card">
      <div className="visit-card-top">
        <div className="visit-card-title">
          <h3>{visit.agentName}</h3>
          <span className={`type-tag ${visit.type}`}>{visitTypeLabel(visit.type)}</span>
          <p>
            Fecha: {formatLongDate(visit.visitDate)}
            {visit.visitTime && ` · Hora: ${formatTime(visit.visitTime)}`}
          </p>
        </div>
        <span className={`status-badge ${visit.status}`}>{visitStatusLabel(visit.status)}</span>
        {!FINAL_STATUSES.includes(visit.status) && onEdit && (
          <button
            type="button"
            className="edit-button"
            onClick={() => onEdit(visit)}
            aria-label={`Editar visita a ${visit.agentName}`}
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {address && (
        <p className="visit-address">
          <PinIcon />
          {address}
        </p>
      )}

      {visit.pendingSync ? (
        <p className={`sync-state pending ${visit.syncError ? 'failed' : ''}`}>
          {visit.syncError ? `No se pudo sincronizar: ${visit.syncError}` : 'Pendiente de sincronizar'}
        </p>
      ) : (
        <p className="sync-state synced">Sincronizado · {formatLongDateTime(visit.syncedAt)}</p>
      )}
    </article>
  )
}

export default VisitCard
