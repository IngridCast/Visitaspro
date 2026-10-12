import { useEffect, useState } from 'react'
import { assetPrefix, getAgentAssets, getMyAssets } from '../../inventory/inventoryApi.js'

const MOVEMENT_LABELS = {
  retirar: 'Retirar Equipo',
  agregar: 'Agregar Equipo',
  cambio: 'Cambio',
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// options: textos o { value, label }.
function SelectField({ label, value, onChange, options, placeholder = 'Seleccione', disabled }) {
  return (
    <label className="compact-field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}

const uniqueSorted = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'))

const assetOption = (asset) => ({
  value: asset.code,
  label: [asset.code, asset.family].filter(Boolean).join(' · '),
})

// Movimientos de equipo de una visita.
//   Activo Sale:  del inventario del agente.
//   Activo Entra: del inventario del asesor (solo los disponibles).
// options: opciones de "Cambio de equipo a realizar" ({ value, label }).
// Los activos ya usados en otro movimiento no se repiten.
function EquipmentMovements({ agentId, options, option, onOptionChange, movements, onMovementsChange }) {
  const [outPrefix, setOutPrefix] = useState('')
  const [outAsset, setOutAsset] = useState('')
  const [inPrefix, setInPrefix] = useState('')
  const [inAsset, setInAsset] = useState('')
  const [error, setError] = useState('')
  const [agentAssets, setAgentAssets] = useState([])
  const [myAssets, setMyAssets] = useState([])
  const [inventoryNote, setInventoryNote] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([getAgentAssets(agentId), getMyAssets()]).then(([agent, mine]) => {
      if (cancelled) return
      if (agent.status === 'fulfilled') setAgentAssets(agent.value.assets)
      if (mine.status === 'fulfilled') setMyAssets(mine.value.assets)
      const failed = [agent, mine].some((r) => r.status === 'rejected')
      const offline = [agent, mine].some((r) => r.status === 'fulfilled' && r.value.offline)
      setInventoryNote(
        failed
          ? 'No se pudo cargar el inventario. Conéctate al menos una vez para guardarlo en el dispositivo.'
          : offline
            ? 'Sin conexión: se usa la última copia guardada del inventario.'
            : '',
      )
    })
    return () => {
      cancelled = true
    }
  }, [agentId])

  const showsOut = option === 'retirar' || option === 'cambio'
  const showsIn = option === 'agregar' || option === 'cambio'

  const used = new Set(movements.flatMap((m) => [m.outAsset, m.inAsset]).filter(Boolean))
  const outCandidates = agentAssets.filter((a) => !used.has(a.code))
  const inCandidates = myAssets.filter((a) => a.status === 'disponible' && !used.has(a.code))
  const outPrefixes = uniqueSorted(outCandidates.map((a) => assetPrefix(a.code)))
  const inPrefixes = uniqueSorted(inCandidates.map((a) => assetPrefix(a.code)))
  const outOptions = outCandidates
    .filter((a) => !outPrefix || assetPrefix(a.code) === outPrefix)
    .map(assetOption)
  const inOptions = inCandidates
    .filter((a) => !inPrefix || assetPrefix(a.code) === inPrefix)
    .map(assetOption)

  const saveMovement = () => {
    setError('')
    if ((showsOut && !outAsset) || (showsIn && !inAsset)) {
      setError('Selecciona el activo.')
      return
    }
    onMovementsChange([
      ...movements,
      {
        id: crypto.randomUUID(),
        kind: option,
        ...(showsOut ? { outPrefix: assetPrefix(outAsset), outAsset } : {}),
        ...(showsIn ? { inPrefix: assetPrefix(inAsset), inAsset } : {}),
      },
    ])
    setOutPrefix('')
    setOutAsset('')
    setInPrefix('')
    setInAsset('')
  }

  const removeMovement = (id) => onMovementsChange(movements.filter((m) => m.id !== id))

  return (
    <>
      <section className="form-card section-card">
        {inventoryNote && <p className="offline-note">{inventoryNote}</p>}
        <span className="section-title-sm accent">Cambio de equipo a realizar:</span>
        <div className="radio-grid" role="radiogroup">
          {options.map((item) => (
            <label key={item.value} className="radio-option">
              <input
                type="radio"
                name="equipment-option"
                value={item.value}
                checked={option === item.value}
                onChange={() => {
                  onOptionChange(item.value)
                  setError('')
                }}
              />
              {item.label}
            </label>
          ))}
        </div>

        {showsOut && (
          <div className="two-columns">
            <SelectField
              label="Prefijo"
              value={outPrefix}
              onChange={(v) => {
                setOutPrefix(v)
                setOutAsset('')
              }}
              options={outPrefixes}
              placeholder="Todos"
            />
            <SelectField
              label="Activo Sale"
              value={outAsset}
              onChange={setOutAsset}
              options={outOptions}
              disabled={outOptions.length === 0}
            />
            {outCandidates.length === 0 && (
              <p className="hint full-row">El agente no tiene activos para retirar.</p>
            )}
          </div>
        )}
        {showsIn && (
          <div className="two-columns">
            <SelectField
              label="Prefijo"
              value={inPrefix}
              onChange={(v) => {
                setInPrefix(v)
                setInAsset('')
              }}
              options={inPrefixes}
              placeholder="Todos"
            />
            <SelectField
              label="Activo Entra"
              value={inAsset}
              onChange={setInAsset}
              options={inOptions}
              disabled={inOptions.length === 0}
            />
            {inCandidates.length === 0 && (
              <p className="hint full-row">No tienes activos disponibles en tu inventario.</p>
            )}
          </div>
        )}
        {option === 'ninguno' && <p className="hint">No se realizará cambio de equipo.</p>}
        {error && <p className="field-error">{error}</p>}
        {option !== 'ninguno' && (
          <button type="button" className="outline" onClick={saveMovement}>
            Guardar Movimiento
          </button>
        )}
      </section>

      <h2 className="list-title">Movimientos Guardados</h2>
      {movements.length === 0 && <p className="empty-state small">Todavía no hay movimientos.</p>}
      <div className="movement-list">
        {movements.map((m) => (
          <article key={m.id} className="movement-card">
            <div>
              <div className="movement-head">
                <span className={`movement-tag ${m.kind}`}>{MOVEMENT_LABELS[m.kind]}</span>
                <span className="movement-prefix">
                  {[m.outPrefix, m.inPrefix].filter(Boolean).join(' / ')}
                </span>
              </div>
              {m.outAsset && <p>Sale: {m.outAsset}</p>}
              {m.inAsset && <p>Entra: {m.inAsset}</p>}
            </div>
            <button
              type="button"
              className="movement-delete"
              onClick={() => removeMovement(m.id)}
              aria-label="Eliminar movimiento"
            >
              <TrashIcon />
            </button>
          </article>
        ))}
      </div>
    </>
  )
}

export default EquipmentMovements
