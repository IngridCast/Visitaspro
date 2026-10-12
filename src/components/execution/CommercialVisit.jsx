import { useState } from 'react'
import { VISIT_REASONS } from '../../visits/reasons.js'
import { useVisitExecution } from '../../visits/useVisitExecution.js'
import BackHeader from '../BackHeader.jsx'
import SignaturePad from '../SignaturePad.jsx'
import { ExecutionActions, PhotoField, VisitTimesFields } from './ExecutionFields.jsx'

// Visita comercial en curso: razón, observaciones, fotos, ubicación y firma.
function CommercialVisit({ visit: summary, onBack, onSaved }) {
  const [reason, setReason] = useState('')
  const [subreason, setSubreason] = useState('')
  const [notes, setNotes] = useState('')
  const [signature, setSignature] = useState(null)
  const [signatureDirty, setSignatureDirty] = useState(false)

  const ex = useVisitExecution(summary, {
    onSaved,
    onLoaded: (detail) => {
      setReason(detail.reason ?? '')
      setSubreason(detail.subreason ?? '')
      setNotes(detail.notes ?? '')
      setSignature(detail.signature ?? null)
    },
  })

  const submit = (action) =>
    ex.save(action, {
      changes: {
        reason: reason || null,
        subreason: subreason || null,
        notes: notes.trim() || null,
        signature,
      },
      validate: (act) => {
        if (act !== 'finish') return null
        if (!reason || !subreason) return 'Para enviar la visita indica la razón y la sub razón.'
        if (signatureDirty) return 'Confirma la firma antes de enviar.'
        if (!signature) return 'Para enviar la visita se necesita la firma.'
        return null
      },
    })

  const reasons = VISIT_REASONS.comercial
  const reasonOptions = Object.keys(reasons)
  if (reason && !reasonOptions.includes(reason)) reasonOptions.push(reason)
  const subreasonOptions = [...(reasons[reason] ?? [])]
  if (subreason && !subreasonOptions.includes(subreason)) subreasonOptions.push(subreason)

  const { visit } = ex

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main visit-execution">
        <h1 className="page-heading">Visita Comercial</h1>
        <p className="page-subtitle">Complete el siguiente formulario para registrar la visita.</p>

        {ex.loadError && (
          <p className="login-error" role="alert">
            {ex.loadError}
          </p>
        )}
        {!visit && !ex.loadError && <p className="hint">Cargando…</p>}

        {visit && (
          <>
            <p className="visit-agent">
              <span>Agente:</span> {visit.agentName}
            </p>

            <section className="form-card">
              <VisitTimesFields visit={visit} ex={ex} />

              <label>
                Razón
                <span className="input-with-icon no-icon">
                  <select
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value)
                      setSubreason('')
                    }}
                  >
                    <option value="">Seleccione…</option>
                    {reasonOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label>
                Sub razón
                <span className="input-with-icon no-icon">
                  <select
                    value={subreason}
                    onChange={(e) => setSubreason(e.target.value)}
                    disabled={!reason}
                  >
                    <option value="">{reason ? 'Seleccione…' : 'Primero elija la razón'}</option>
                    {subreasonOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label>
                Observaciones
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Escribe aquí los comentarios o acuerdos alcanzados durante la visita..."
                />
              </label>

              <PhotoField
                photos={ex.photos}
                error={ex.photoError}
                onAdd={ex.addPhotos}
                onRemove={ex.removePhoto}
              />

              <SignaturePad
                value={signature}
                onChange={setSignature}
                onDirtyChange={setSignatureDirty}
              />
            </section>

            {ex.error && (
              <p className="login-error execution-error" role="alert">
                {ex.error}
              </p>
            )}

            <ExecutionActions
              saving={ex.saving}
              onSave={() => submit('save')}
              onFinish={() => submit('finish')}
              finishLabel="Enviar"
              finishingLabel="Enviando…"
            />
          </>
        )}
      </main>
    </>
  )
}

export default CommercialVisit
