import { useEffect, useState } from 'react'
import { getMovements } from '../inventory/inventoryApi.js'
import { visitTypeLabel } from '../visits/constants.js'
import { formatLongDate, formatLongDateTime } from '../visits/dates.js'
import BackHeader from './BackHeader.jsx'

const KINDS = {
  instalacion: 'Instalación',
  retiro: 'Retiro',
  asignacion: 'Asignación',
}

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'instalacion', label: 'Instalaciones' },
  { value: 'retiro', label: 'Retiros' },
  { value: 'asignacion', label: 'Asignaciones' },
]

// Origen → destino del activo según el tipo de movimiento.
function route(m) {
  const advisor = m.advisorName ? `Asesor ${m.advisorName}` : 'Asesor'
  const agent = m.agentName ? `Agente ${m.agentName}` : 'Agente'
  if (m.kind === 'instalacion') return `${advisor} → ${agent}`
  if (m.kind === 'retiro') return `${agent} → ${advisor}`
  return `Asignado a ${m.advisorName ?? 'asesor'}${m.performedByName ? ` por ${m.performedByName}` : ''}`
}

// Historial de movimientos de activos, filtrado por asesor, agente o activo.
// filter: { advisorId?, agentId?, assetCode? }; subtitle: texto de contexto.
function MovementsHistoryPage({ filter, subtitle, onBack }) {
  const [state, setState] = useState({ loading: true, movements: [], error: '' })
  const [kind, setKind] = useState('')
  const [search, setSearch] = useState('')
  const filterKey = JSON.stringify(filter)

  useEffect(() => {
    window.scrollTo(0, 0)
    getMovements(JSON.parse(filterKey))
      .then((movements) => setState({ loading: false, movements, error: '' }))
      .catch((err) => setState({ loading: false, movements: [], error: err.message }))
  }, [filterKey])

  const term = search.trim().toUpperCase()
  const visible = state.movements.filter(
    (m) => (!kind || m.kind === kind) && (!term || m.assetCode.includes(term)),
  )

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main movements-page">
        <h1 className="page-heading">Historial de Movimientos</h1>
        <p className="page-subtitle">{subtitle}</p>

        {!filter.assetCode && (
          <input
            type="search"
            className="search"
            placeholder="Buscar por código de activo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <div className="result-filters" role="group" aria-label="Tipo de movimiento">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={kind === f.value ? 'active' : ''}
              onClick={() => setKind(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {state.loading && <p className="hint">Cargando…</p>}
        {state.error && (
          <p className="login-error" role="alert">
            {state.error}
          </p>
        )}
        {!state.loading && !state.error && visible.length === 0 && (
          <p className="empty-state">
            {state.movements.length === 0
              ? 'Todavía no hay movimientos registrados.'
              : 'Ningún movimiento coincide con el filtro.'}
          </p>
        )}

        <div className="movement-history">
          {visible.map((m) => (
            <article key={m.id} className="history-movement">
              <div className="history-movement-top">
                <span className={`movement-kind ${m.kind}`}>{KINDS[m.kind]}</span>
                <small>{formatLongDateTime(m.createdAt)}</small>
              </div>
              <p className="movement-asset">
                <strong>{m.assetCode}</strong>
                {(m.assetFamily || m.assetBrand) && (
                  <span> · {[m.assetFamily, m.assetBrand].filter(Boolean).join(' · ')}</span>
                )}
              </p>
              <p className="movement-route">{route(m)}</p>
              {m.visitId && (
                <p className="movement-visit">
                  Visita #{m.visitId}: {visitTypeLabel(m.visitType)}
                  {m.agentCode && ` · ${m.agentCode}`}
                  {m.visitDate && ` · ${formatLongDate(m.visitDate)}`}
                </p>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  )
}

export default MovementsHistoryPage
