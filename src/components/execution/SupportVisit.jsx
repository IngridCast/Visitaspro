import { useState } from 'react'
import { EQUIPMENT_OPTIONS } from '../../visits/hotlineOptions.js'
import { useVisitExecution } from '../../visits/useVisitExecution.js'
import BackHeader from '../BackHeader.jsx'
import SignaturePad from '../SignaturePad.jsx'
import EquipmentMovements from './EquipmentMovements.jsx'
import { ExecutionActions, VisitTimesFields } from './ExecutionFields.jsx'

const STEP_INFO = {
  case: { title: 'Hotline', subtitle: 'Asistencia de soporte en campo y registro de problemas.' },
  equipment: {
    title: 'Cambio de Equipo',
    subtitle: 'Gestione y documente los movimientos de activos durante la visita.',
  },
  notes: {
    title: 'Observaciones y Firma',
    subtitle: 'Finalice el reporte registrando los hallazgos finales y la firma digital del responsable.',
  },
}

// Pasos de cada tipo de visita de soporte.
const STEPS_BY_TYPE = {
  hotline: ['case', 'equipment', 'notes'],
  otros_soportes: ['case', 'equipment', 'notes'],
}

// Título del paso del caso de soporte según el tipo.
const CASE_TITLES = {
  hotline: 'Hotline',
  otros_soportes: 'Otros Soportes',
}

// Visitas de soporte en curso, por pasos:
//   Hotline:         caso de soporte → cambio de equipo → observaciones y firma
//   Otros soportes:  caso de soporte → cambio de equipo → observaciones y firma
function SupportVisit({ visit: summary, onBack, onSaved }) {
  const steps = STEPS_BY_TYPE[summary.type] ?? STEPS_BY_TYPE.hotline
  const hasCase = steps.includes('case')
  const [step, setStep] = useState(0)
  const stepId = steps[step]
  // Paso 1
  const [supportCase, setSupportCase] = useState('')
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')
  const [caseClosed, setCaseClosed] = useState(false)
  // Paso 2
  const [equipmentOption, setEquipmentOption] = useState('ninguno')
  const [movements, setMovements] = useState([])
  // Paso 3
  const [notes, setNotes] = useState('')
  const [signature, setSignature] = useState(null)
  const [signatureDirty, setSignatureDirty] = useState(false)

  const ex = useVisitExecution(summary, {
    onSaved,
    onLoaded: (detail) => {
      const form = detail.formData ?? {}
      setSupportCase(form.supportCase ?? '')
      setProblem(form.problem ?? '')
      setSolution(form.solution ?? '')
      setCaseClosed(Boolean(form.caseClosed))
      setEquipmentOption(form.equipmentOption ?? 'ninguno')
      setMovements(form.movements ?? [])
      setNotes(detail.notes ?? '')
      setSignature(detail.signature ?? null)
    },
  })

  const goTo = (next) => {
    setStep(next)
    window.scrollTo(0, 0)
  }

  const back = () => (step > 0 ? goTo(step - 1) : onBack())

  const formChanges = () => ({
    notes: notes.trim() || null,
    signature,
    formData: {
      ...(hasCase
        ? {
            supportCase: supportCase.trim(),
            problem: problem.trim(),
            solution: solution.trim(),
            caseClosed,
          }
        : {}),
      equipmentOption,
      movements,
    },
  })

  // "Siguiente" guarda el avance antes de pasar al otro paso.
  const next = async () => {
    if (await ex.saveDraft(formChanges())) goTo(step + 1)
  }

  // La hora de fin y la ubicación están en el paso 1: si faltan, se avisa ahí.
  const [missingOnFirstStep, setMissingOnFirstStep] = useState('')

  const submit = (action) => {
    if (!ex.endedAt || !ex.coords) {
      setMissingOnFirstStep(
        !ex.endedAt
          ? 'Falta registrar la hora de fin (paso 1).'
          : 'Falta registrar la ubicación (paso 1).',
      )
      return
    }
    setMissingOnFirstStep('')
    return ex.save(action, {
      changes: formChanges(),
      validate: (act) => {
        if (act !== 'finish') return null
        if (hasCase && (!supportCase.trim() || !problem.trim() || !solution.trim())) {
          return 'Para finalizar la visita completa el caso de soporte, el problema y la solución (paso 1).'
        }
        if (signatureDirty) return 'Confirma la firma antes de finalizar.'
        if (!signature) return 'Para finalizar la visita se necesita la firma.'
        return null
      },
    })
  }

  const { visit } = ex
  const current =
    stepId === 'case'
      ? { ...STEP_INFO.case, title: CASE_TITLES[summary.type] ?? STEP_INFO.case.title }
      : STEP_INFO[stepId]

  return (
    <>
      <BackHeader onBack={back} />

      <main className="app-main visit-execution hotline-visit">
        <p className="step-indicator">
          Paso {step + 1} de {steps.length}
        </p>
        <h1 className="page-heading">{current.title}</h1>
        <p className="page-subtitle">{current.subtitle}</p>

        {ex.loadError && (
          <p className="login-error" role="alert">
            {ex.loadError}
          </p>
        )}
        {!visit && !ex.loadError && <p className="hint">Cargando…</p>}

        {visit && (
          <>
            {/* Solo en el primer paso: fecha de inicio, fecha de fin y ubicación. */}
            {step === 0 && (
              <section className="form-card section-card">
                <VisitTimesFields visit={visit} ex={ex} coordsVariant="fields" />
              </section>
            )}

            {stepId === 'case' && (
              <section className="form-card section-card two-columns">
                <label className="compact-field">
                  Caso de Soporte
                  <input value={supportCase} onChange={(e) => setSupportCase(e.target.value)} />
                </label>
                <label className="compact-field">
                  Problema
                  <input value={problem} onChange={(e) => setProblem(e.target.value)} />
                </label>
                <label className="compact-field">
                  Solución
                  <input value={solution} onChange={(e) => setSolution(e.target.value)} />
                </label>
                <div className="compact-field">
                  <span>Estado</span>
                  <label className="toggle-field">
                    <span>{caseClosed ? 'Cerrado' : 'Abierto'}</span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={caseClosed}
                      onChange={(e) => setCaseClosed(e.target.checked)}
                    />
                  </label>
                </div>
              </section>
            )}

            {stepId === 'equipment' && (
              <EquipmentMovements
                agentId={summary.agentId}
                options={EQUIPMENT_OPTIONS}
                option={equipmentOption}
                onOptionChange={setEquipmentOption}
                movements={movements}
                onMovementsChange={setMovements}
              />
            )}

            {stepId === 'notes' && (
              <>
                <section className="form-card section-card">
                  <label className="section-title-sm">
                    Observaciones
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="Escriba los comentarios o hallazgos de la visita de campo..."
                    />
                  </label>
                </section>
                <section className="form-card section-card signature-card">
                  <SignaturePad
                    value={signature}
                    onChange={setSignature}
                    onDirtyChange={setSignatureDirty}
                  />
                </section>
              </>
            )}

            {ex.error && (
              <p className="login-error execution-error" role="alert">
                {ex.error}
              </p>
            )}
            {missingOnFirstStep && step !== 0 && (
              <div className="login-error execution-error missing-step" role="alert">
                <span>{missingOnFirstStep}</span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setMissingOnFirstStep('')
                    goTo(0)
                  }}
                >
                  Ir al paso 1
                </button>
              </div>
            )}

            {step < steps.length - 1 ? (
              <div className="visit-actions">
                <button type="button" onClick={next} disabled={ex.saving !== null}>
                  {ex.saving === 'draft' ? 'Guardando…' : 'Siguiente'}
                </button>
              </div>
            ) : (
              <ExecutionActions
                saving={ex.saving}
                onSave={() => submit('save')}
                onFinish={() => submit('finish')}
                finishLabel="Finalizar Visita"
                finishingLabel="Finalizando…"
              />
            )}
          </>
        )}
      </main>
    </>
  )
}

export default SupportVisit
