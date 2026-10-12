import { useEffect, useState } from 'react'
import { formatLongDateTime } from '../visits/dates.js'
import { DEPARTMENT_NAMES, DEPARTMENTS } from '../workday/locations.js'
import { getTodayWorkday, lastWorkPlace, registerWorkday } from '../workday/workdayApi.js'
import BackHeader from './BackHeader.jsx'

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Hora actual que se actualiza cada 30 segundos.
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

// Inicio de labores: registra la hora de inicio de la jornada y el lugar.
// Solo se puede registrar una vez por día.
function WorkdayPage({ onBack, onRegistered }) {
  const now = useNow()
  const [loading, setLoading] = useState(true)
  const [workday, setWorkday] = useState(null)
  const [pending, setPending] = useState(false)
  const [department, setDepartment] = useState(() => lastWorkPlace().department ?? '')
  const [municipality, setMunicipality] = useState(() => lastWorkPlace().municipality ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    getTodayWorkday()
      .then((result) => {
        setWorkday(result.workday)
        setPending(result.pending)
        if (result.workday) {
          setDepartment(result.workday.department)
          setMunicipality(result.workday.municipality)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const municipalities = DEPARTMENTS[department] ?? []
  const municipalityOptions =
    municipality && department && !municipalities.includes(municipality)
      ? [municipality, ...municipalities]
      : municipalities

  const submit = async () => {
    setError('')
    if (!department || !municipality) {
      setError('Selecciona el departamento y el municipio.')
      return
    }
    setSaving(true)
    try {
      const result = await registerWorkday({ department, municipality })
      setWorkday(result.workday)
      setPending(result.pending)
      onRegistered(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main workday-page">
        <h1 className="page-heading">Inicio de Labores</h1>
        <p className="page-subtitle">Registre el inicio de su jornada laboral.</p>

        {loading && <p className="hint">Cargando…</p>}

        {!loading && (
          <>
            {workday && (
              <p className="info-banner">
                ✓ Jornada iniciada el {formatLongDateTime(workday.startedAt)} en {workday.municipality}
                {pending && ' (pendiente de sincronizar)'}.
              </p>
            )}

            <section className="form-card section-card">
              <div className="field">
                <span className="field-label">Fecha y Hora de Inicio</span>
                <span className="readonly-input">
                  <CalendarIcon />
                  {formatLongDateTime(workday ? workday.startedAt : now.toISOString())}
                </span>
                {!workday && (
                  <span className="hint">Se registra la hora en que toque "Registrar Inicio".</span>
                )}
              </div>
            </section>

            <section className="form-card section-card two-columns">
              <label className="compact-field">
                Departamento
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value)
                    setMunicipality('')
                  }}
                  disabled={Boolean(workday)}
                >
                  <option value="">Seleccione</option>
                  {DEPARTMENT_NAMES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="compact-field">
                Municipio
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  disabled={!department || Boolean(workday)}
                >
                  <option value="">Seleccione</option>
                  {municipalityOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <div className="workday-actions">
              {workday ? (
                <p className="hint workday-done">
                  El inicio de labores solo se puede registrar una vez al día.
                </p>
              ) : (
                <button type="button" onClick={submit} disabled={saving}>
                  {saving ? 'Registrando…' : 'Registrar Inicio'}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}

export default WorkdayPage
