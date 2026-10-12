import { useMemo } from 'react'
import { dayHeading, todayISO } from '../visits/dates.js'
import { useVisits } from '../visits/useVisits.js'
import SyncInfoButton from './SyncInfoButton.jsx'
import VisitCard from './VisitCard.jsx'

// Pantalla de inicio: saludo y visitas de hoy.
function HomePage({ user, version, onEdit, onSeeAll }) {
  const today = todayISO()
  const filters = useMemo(() => ({ mine: true, from: today, to: today }), [today])
  const { visits, loading, error } = useVisits(filters, version)

  const counts = {
    total: visits.length,
    pending: visits.filter((v) => v.status === 'programada' || v.status === 'sin_programar').length,
    inProgress: visits.filter((v) => v.status === 'en_proceso').length,
    closed: visits.filter((v) => v.status === 'cerrada').length,
  }

  return (
    <div className="home-page">
      <h1 className="page-heading">Hola, {(user.name ?? '').split(' ')[0]}</h1>
      <p className="page-subtitle">{dayHeading(today)}</p>

      <SyncInfoButton />

      <div className="stats-grid">
        <div className="stat">
          <strong>{loading ? '–' : counts.total}</strong>
          <span>Visitas hoy</span>
        </div>
        <div className="stat">
          <strong>{loading ? '–' : counts.pending}</strong>
          <span>Por iniciar</span>
        </div>
        <div className="stat">
          <strong>{loading ? '–' : counts.inProgress}</strong>
          <span>En proceso</span>
        </div>
        <div className="stat">
          <strong>{loading ? '–' : counts.closed}</strong>
          <span>Cerradas</span>
        </div>
      </div>

      <div className="section-row">
        <h2>Visitas de hoy</h2>
        <button type="button" className="link-button" onClick={onSeeAll}>
          Ver todas
        </button>
      </div>

      {loading && <p className="hint">Cargando…</p>}
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && visits.length === 0 && (
        <p className="empty-state">No tienes visitas para hoy.</p>
      )}
      <div className="day-visits">
        {visits.map((visit) => (
          <VisitCard key={visit.id} visit={visit} onEdit={onEdit} />
        ))}
      </div>
    </div>
  )
}

export default HomePage
