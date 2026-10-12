import { useEffect, useState } from 'react'
import { useAgentsCatalog } from '../agents/agentsCatalog.js'
import { useAuth } from '../auth/useAuth.js'
import { VISIT_STATUSES, VISIT_TYPES } from '../visits/constants.js'
import {
  addDays,
  addMonths,
  dayHeading,
  formatLongDate,
  monthRange,
  rangeLabel,
  todayISO,
  weekRange,
} from '../visits/dates.js'
import { useVisits } from '../visits/useVisits.js'
import BackHeader from './BackHeader.jsx'
import VisitCard from './VisitCard.jsx'

function Arrow({ direction }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d={direction === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function groupByDate(visits) {
  const groups = new Map()
  for (const visit of visits) {
    if (!groups.has(visit.visitDate)) groups.set(visit.visitDate, [])
    groups.get(visit.visitDate).push(visit)
  }
  return [...groups.entries()]
}

// Sin `agent`: "Mis Visitas" del usuario. Con `agent`: historial de ese agente.
function VisitsPage({ agent, version, onEdit, onBack }) {
  const [mode, setMode] = useState(agent ? 'month' : 'week')
  const [range, setRange] = useState(() =>
    agent ? monthRange(todayISO()) : weekRange(todayISO()),
  )
  const [agentCode, setAgentCode] = useState('')
  const [debouncedCode, setDebouncedCode] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [city, setCity] = useState('')
  const { user } = useAuth()
  const catalog = useAgentsCatalog(user.id)
  const cities = [...new Set((catalog?.agents ?? []).map((a) => a.municipality).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'es'),
  )

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCode(agentCode), 350)
    return () => clearTimeout(timer)
  }, [agentCode])


  const filters = {
    mine: !agent,
    agentId: agent?.id,
    from: range.from,
    to: range.to,
    status,
    type,
    city: agent ? '' : city,
    agentCode: agent ? '' : debouncedCode,
  }
  const { visits, loading, error, offline, olderUnavailable, neverSynced } = useVisits(filters, version)

  const changeMode = (next) => {
    setMode(next)
    setRange(next === 'week' ? weekRange(range.from) : monthRange(range.from))
  }

  const shift = (direction) => {
    setRange(
      mode === 'week'
        ? weekRange(addDays(range.from, 7 * direction))
        : monthRange(addMonths(range.from, direction)),
    )
  }

  // Dentro de la app principal ya hay un <main>; el historial es pantalla propia.
  const Wrapper = agent ? 'main' : 'div'

  const standardRange = mode === 'week' ? weekRange(range.from) : monthRange(range.from)
  const isStandard = standardRange.from === range.from && standardRange.to === range.to
  const currentRange = mode === 'week' ? weekRange(todayISO()) : monthRange(todayISO())
  const isCurrentPeriod = range.from === currentRange.from && range.to === currentRange.to

  // Filtros activos (las fechas cuentan solo si se cambiaron a mano).
  const activeFilters = [agentCode.trim(), status, type, city, !isStandard].filter(Boolean).length
  const canClear = activeFilters > 0 || !isCurrentPeriod

  // Quita todos los filtros y vuelve al periodo actual (semana o mes).
  const clearFilters = () => {
    setAgentCode('')
    setDebouncedCode('')
    setStatus('')
    setType('')
    setCity('')
    setRange(currentRange)
  }
  const label = isStandard
    ? rangeLabel(range.from, range.to, mode)
    : `${formatLongDate(range.from)} - ${formatLongDate(range.to)}`

  return (
    <>
      {agent && <BackHeader onBack={onBack} />}

      <Wrapper className={agent ? 'app-main visits-page' : 'visits-page'}>
        <h1 className="page-heading">{agent ? 'Historial de Visitas' : 'Mis Visitas'}</h1>
        {agent && <p className="page-subtitle">{agent.name}</p>}

        <div className="segmented visits-segmented" role="tablist" aria-label="Periodo">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'week'}
            className={mode === 'week' ? 'active' : ''}
            onClick={() => changeMode('week')}
          >
            Semana
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'month'}
            className={mode === 'month' ? 'active' : ''}
            onClick={() => changeMode('month')}
          >
            Mes
          </button>
        </div>

        <div className="filters-card">
          <div className="filters-header">
            <span>
              Filtros
              {activeFilters > 0 && <span className="filters-count">{activeFilters}</span>}
            </span>
            {canClear && (
              <button type="button" className="clear-filters" onClick={clearFilters}>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Limpiar filtros
              </button>
            )}
          </div>
          {!agent && (
            <label>
              Código de Agente
              <input
                value={agentCode}
                onChange={(e) => setAgentCode(e.target.value)}
                placeholder="Ej: AG-001"
                autoCapitalize="characters"
                autoComplete="off"
              />
            </label>
          )}
          <label>
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {VISIT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de Visita
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todo</option>
              {VISIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {!agent && (
            <label>
              Ciudad
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Todas</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Fecha de Inicio
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })}
            />
          </label>
          <label>
            Fecha Fin
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })}
            />
          </label>
        </div>

        <div className="period-nav">
          <button type="button" onClick={() => shift(-1)} aria-label="Periodo anterior">
            <Arrow direction="left" />
          </button>
          <strong>{label}</strong>
          <button type="button" onClick={() => shift(1)} aria-label="Periodo siguiente">
            <Arrow direction="right" />
          </button>
        </div>

        {offline && olderUnavailable && (
          <p className="offline-note">
            Las visitas de más de 3 meses solo se pueden ver con conexión. Se muestran las guardadas
            en este dispositivo.
          </p>
        )}
        {offline && !olderUnavailable && (
          <p className="offline-note">
            Sin conexión: solo se muestran las visitas guardadas en este dispositivo.
          </p>
        )}
        {neverSynced && !offline && (
          <p className="offline-note">
            Toque "Sincronizar" en Inicio para guardar sus visitas en este dispositivo y verlas sin conexión.
          </p>
        )}

        {!loading && !error && (
          <p className="total-banner">
            Total: {visits.length} {visits.length === 1 ? 'visita' : 'visitas'}
          </p>
        )}

        {loading && <p className="hint">Cargando…</p>}
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && visits.length === 0 && (
          <p className="empty-state">No hay visitas en este periodo.</p>
        )}

        {!loading &&
          !error &&
          groupByDate(visits).map(([date, dayVisits]) => (
            <section key={date} className="day-group">
              <h2>{dayHeading(date)}</h2>
              <div className="day-visits">
                {dayVisits.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} onEdit={onEdit} />
                ))}
              </div>
            </section>
          ))}
      </Wrapper>
    </>
  )
}

export default VisitsPage
