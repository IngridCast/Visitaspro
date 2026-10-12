import { useEffect, useState } from 'react'
import { getSnapshot, onDataChanged } from '../sync/snapshot.js'
import { syncAll } from '../sync/syncAll.js'
import { formatLongDateTime } from '../visits/dates.js'
import { pendingVisitsCount } from '../visits/visitsApi.js'

function SyncIcon({ spinning }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className={spinning ? 'spin' : ''}>
      <path
        d="M20 11a8 8 0 0 0-14.3-4.9L4 8m0-4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16m0 4v-4h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Sincronización manual: envía lo pendiente y descarga la información al
// dispositivo. Muestra la hora de la última sincronización.
function SyncInfoButton() {
  const [syncedAt, setSyncedAt] = useState(undefined)
  const [pending, setPending] = useState(pendingVisitsCount)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null) // { ok, text }

  useEffect(() => {
    const refresh = () => {
      getSnapshot().then((s) => setSyncedAt(s?.syncedAt ?? null))
      setPending(pendingVisitsCount())
    }
    refresh()
    return onDataChanged(refresh)
  }, [])

  const sync = async () => {
    setMessage(null)
    setSyncing(true)
    try {
      const r = await syncAll()
      const parts = []
      if (r.sent > 0) parts.push(`${r.sent} ${r.sent === 1 ? 'visita enviada' : 'visitas enviadas'}`)
      parts.push(`${r.visits} visitas`, `${r.agents} agentes`, `${r.assets} activos descargados`)
      setMessage({
        ok: r.stillPending === 0,
        text:
          r.stillPending > 0
            ? `Sincronizado, pero ${r.stillPending} ${r.stillPending === 1 ? 'visita no se pudo enviar' : 'visitas no se pudieron enviar'}. Revíselas en Mis Visitas.`
            : `Listo: ${parts.join(', ')}.`,
      })
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="sync-info">
      <div className="sync-info-row">
        <span className="sync-info-text">
          {syncedAt
            ? `Última sincronización: ${formatLongDateTime(syncedAt)}`
            : syncedAt === null
              ? 'Información sin descargar en este dispositivo'
              : ''}
          {pending > 0 && (
            <strong className="sync-pending">
              {' '}
              · {pending} {pending === 1 ? 'pendiente' : 'pendientes'} de enviar
            </strong>
          )}
        </span>
        <button type="button" className="outline sync-button" onClick={sync} disabled={syncing}>
          <SyncIcon spinning={syncing} />
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>
      {message && <p className={message.ok ? 'sync-ok' : 'field-error'}>{message.text}</p>}
    </div>
  )
}

export default SyncInfoButton
