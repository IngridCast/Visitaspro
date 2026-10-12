import { useEffect, useState } from 'react'
import { listVisits } from './visitsApi.js'

// Carga visitas con los filtros dados. `version` permite forzar una recarga
// (por ejemplo, después de guardar o sincronizar una visita).
export function useVisits(filters, version = 0) {
  const key = JSON.stringify(filters) + '#' + version
  const [state, setState] = useState({
    key: null,
    visits: [],
    offline: false,
    olderUnavailable: false,
    neverSynced: false,
    error: '',
  })

  useEffect(() => {
    let cancelled = false
    listVisits(JSON.parse(key.slice(0, key.lastIndexOf('#'))))
      .then((result) => {
        if (!cancelled) setState({ key, ...result, error: '' })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            key,
            visits: [],
            offline: false,
            olderUnavailable: false,
            neverSynced: false,
            error: error.message,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [key])

  return { ...state, loading: state.key !== key }
}
