import { useEffect, useState } from 'react'
import { assignAsset, getAdvisors, getMyAssets, getUserAssets } from '../inventory/inventoryApi.js'
import AssetInventory from './AssetInventory.jsx'

const EMPTY_FORM = { code: '', family: '', brand: '', model: '', serial: '' }

// "Mi Inventario": activos que anda cargando el asesor. Un administrador puede
// ver el inventario de cada asesor y asignarle activos.
function MyInventoryPage({ user, version, onOpenMovements }) {
  const isAdmin = user.role === 'admin'
  const [advisors, setAdvisors] = useState([])
  const [advisorId, setAdvisorId] = useState(user.id)
  const [state, setState] = useState({ key: null, assets: [], offline: false, error: '' })
  const [reload, setReload] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [savingAsset, setSavingAsset] = useState(false)
  const [notice, setNotice] = useState('')

  const key = `${advisorId}#${version}#${reload}`
  const loading = state.key !== key

  useEffect(() => {
    if (!isAdmin) return
    getAdvisors()
      .then(setAdvisors)
      .catch(() => {})
  }, [isAdmin, reload])

  useEffect(() => {
    let cancelled = false
    const load = advisorId === user.id ? getMyAssets() : getUserAssets(advisorId)
    load
      .then(({ assets, offline }) => !cancelled && setState({ key, assets, offline, error: '' }))
      .catch((err) => !cancelled && setState({ key, assets: [], offline: false, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [key, advisorId, user.id])

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const submitAsset = async (event) => {
    event.preventDefault()
    setFormError('')
    setSavingAsset(true)
    try {
      const asset = await assignAsset({ ...form, holderUserId: advisorId })
      setForm(EMPTY_FORM)
      setShowForm(false)
      setNotice(`Activo ${asset.code} asignado.`)
      setReload((n) => n + 1)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSavingAsset(false)
    }
  }

  const selected = advisors.find((a) => a.id === advisorId)

  return (
    <div className="my-inventory">
      <h1 className="page-heading">Mi Inventario</h1>
      <p className="page-subtitle">
        {isAdmin ? 'Activos que anda cargando cada asesor.' : 'Activos que tienes asignados para instalar.'}
      </p>

      {isAdmin && (
        <section className="form-card section-card">
          <label className="compact-field">
            Asesor
            <select
              value={advisorId}
              onChange={(e) => {
                setAdvisorId(Number(e.target.value))
                setNotice('')
                setShowForm(false)
              }}
            >
              {advisors.length === 0 && <option value={user.id}>{user.name}</option>}
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.assets} {a.assets === 1 ? 'activo' : 'activos'})
                </option>
              ))}
            </select>
          </label>

          {!showForm ? (
            <button type="button" className="outline" onClick={() => setShowForm(true)}>
              + Asignar activo {selected?.name ? `a ${selected.name.split(' ')[0]}` : ''}
            </button>
          ) : (
            <form className="assign-form" onSubmit={submitAsset}>
              <div className="two-columns">
                <label className="compact-field">
                  Código
                  <input value={form.code} onChange={set('code')} placeholder="LTE-5001" required />
                </label>
                <label className="compact-field">
                  Familia
                  <input value={form.family} onChange={set('family')} placeholder="TERMINALES" required />
                </label>
                <label className="compact-field">
                  Marca
                  <input value={form.brand} onChange={set('brand')} />
                </label>
                <label className="compact-field">
                  Modelo
                  <input value={form.model} onChange={set('model')} />
                </label>
                <label className="compact-field">
                  Serie
                  <input value={form.serial} onChange={set('serial')} />
                </label>
              </div>
              {formError && <p className="field-error">{formError}</p>}
              <div className="two-columns">
                <button type="button" className="secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingAsset}>
                  {savingAsset ? 'Asignando…' : 'Asignar'}
                </button>
              </div>
            </form>
          )}
          {notice && <p className="hint assign-notice">✓ {notice}</p>}
        </section>
      )}

      <button
        type="button"
        className="outline history-button"
        onClick={() =>
          onOpenMovements(
            { advisorId },
            `Asesor: ${advisorId === user.id ? user.name : (selected?.name ?? '')}`,
          )
        }
      >
        Historial de movimientos
      </button>

      {loading && <p className="hint">Cargando…</p>}
      {!loading && state.error && (
        <p className="login-error" role="alert">
          {state.error}
        </p>
      )}
      {!loading && !state.error && (
        <AssetInventory
          key={advisorId}
          assets={state.assets}
          offline={state.offline}
          label="asignados"
          onAssetHistory={(asset) => onOpenMovements({ assetCode: asset.code }, `Activo: ${asset.code}`)}
          emptyText={
            advisorId === user.id
              ? 'No tienes activos asignados.'
              : 'Este asesor no tiene activos asignados.'
          }
        />
      )}
    </div>
  )
}

export default MyInventoryPage
