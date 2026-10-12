import { useEffect, useState } from 'react'
import { getAgentAssets } from '../inventory/inventoryApi.js'
import AssetInventory from './AssetInventory.jsx'
import BackHeader from './BackHeader.jsx'

// Inventario de activos instalados en un agente.
function InventoryPage({ agent, onBack, onOpenMovements }) {
  const [state, setState] = useState({ loading: true, assets: [], offline: false, error: '' })

  useEffect(() => {
    window.scrollTo(0, 0)
    getAgentAssets(agent.id)
      .then(({ assets, offline }) => setState({ loading: false, assets, offline, error: '' }))
      .catch((err) => setState({ loading: false, assets: [], offline: false, error: err.message }))
  }, [agent.id])

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main inventory-page">
        <h1 className="page-heading">Inventario</h1>
        <p className="page-subtitle">Consulta y gestión de activos asignados.</p>

        <button
          type="button"
          className="outline history-button"
          onClick={() => onOpenMovements({ agentId: agent.id }, `Agente: ${agent.name}`)}
        >
          Historial de movimientos
        </button>

        {state.loading && <p className="hint">Cargando…</p>}
        {state.error && (
          <p className="login-error" role="alert">
            {state.error}
          </p>
        )}
        {!state.loading && !state.error && (
          <AssetInventory
            assets={state.assets}
            offline={state.offline}
            emptyText="Este agente no tiene activos asignados."
            onAssetHistory={(asset) => onOpenMovements({ assetCode: asset.code }, `Activo: ${asset.code}`)}
          />
        )}
      </main>
    </>
  )
}

export default InventoryPage
