import { useState } from 'react'

const ASSET_STATUS = {
  disponible: 'Disponible',
  instalado: 'Instalado',
  en_reparacion: 'En reparación',
  retirado: 'Retirado',
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
}

// Tabla de activos con filtros por familia y marca (inventario del agente o
// del asesor).
function AssetInventory({ assets, label = 'en inventario de campo', emptyText, offline, onAssetHistory }) {
  const [family, setFamily] = useState('')
  const [brand, setBrand] = useState('')
  const [expanded, setExpanded] = useState(null)

  const families = uniqueSorted(assets.map((a) => a.family))
  const brands = uniqueSorted(assets.filter((a) => !family || a.family === family).map((a) => a.brand))
  const visible = assets.filter(
    (a) => (!family || a.family === family) && (!brand || a.brand === brand),
  )

  return (
    <>
      <p className="info-banner">
        <InfoIcon />
        Mostrando {visible.length} {visible.length === 1 ? 'activo' : 'activos'} {label}.
      </p>
      {offline && (
        <p className="offline-note">Sin conexión: se muestra la última copia guardada.</p>
      )}

      <section className="form-card section-card two-columns">
        <label className="compact-field">
          Familia
          <select
            value={family}
            onChange={(e) => {
              setFamily(e.target.value)
              setBrand('')
            }}
          >
            <option value="">Todas</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          Marca
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="form-card section-card asset-table">
        <div className="asset-row asset-head" aria-hidden="true">
          <span>Activo</span>
          <span>Familia</span>
          <span>Marca</span>
          <span>Serie</span>
        </div>
        {visible.length === 0 && (
          <p className="hint asset-empty">
            {assets.length === 0 ? emptyText : 'Ningún activo coincide con los filtros.'}
          </p>
        )}
        {visible.map((asset) => (
          <div key={asset.id} className="asset-item">
            <button
              type="button"
              className="asset-row"
              onClick={() => setExpanded(expanded === asset.id ? null : asset.id)}
              aria-expanded={expanded === asset.id}
            >
              <span className="asset-code">
                <strong title={asset.code}>{asset.code}</strong>
                <small className={`asset-status ${asset.status}`}>
                  {ASSET_STATUS[asset.status] ?? asset.status}
                </small>
              </span>
              <span>
                <span className="family-chip" title={asset.family}>
                  {asset.family}
                </span>
              </span>
              <span className="truncate" title={asset.brand}>
                {asset.brand || '—'}
              </span>
              <span className="truncate" title={asset.serial}>
                {asset.serial || '—'}
              </span>
            </button>
            {expanded === asset.id && (
              <dl className="asset-details">
                <div>
                  <dt>Activo</dt>
                  <dd>{asset.code}</dd>
                </div>
                <div>
                  <dt>Marca</dt>
                  <dd>{asset.brand || '—'}</dd>
                </div>
                <div>
                  <dt>Modelo</dt>
                  <dd>{asset.model || '—'}</dd>
                </div>
                <div>
                  <dt>Serie</dt>
                  <dd>{asset.serial || '—'}</dd>
                </div>
                {onAssetHistory && (
                  <button type="button" className="link-button asset-history" onClick={() => onAssetHistory(asset)}>
                    Ver historial del activo
                  </button>
                )}
              </dl>
            )}
          </div>
        ))}
      </section>
    </>
  )
}

export default AssetInventory
