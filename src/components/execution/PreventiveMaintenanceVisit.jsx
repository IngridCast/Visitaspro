import { useState } from 'react'
import { useVisitExecution } from '../../visits/useVisitExecution.js'
import BackHeader from '../BackHeader.jsx'
import { ExecutionActions, PhotoField, VisitTimesFields } from './ExecutionFields.jsx'

const MIN_PM_PHOTOS = 1

// Visita PM (mantenimiento preventivo) en curso: observaciones, evidencia
// fotográfica, ubicación y hora de fin.
function PreventiveMaintenanceVisit({ visit: summary, onBack, onSaved }) {
  const [notes, setNotes] = useState('')

  const ex = useVisitExecution(summary, {
    onSaved,
    onLoaded: (detail) => setNotes(detail.notes ?? ''),
  })

  const submit = (action) =>
    ex.save(action, {
      changes: { notes: notes.trim() || null },
      validate: (act) =>
        act === 'finish' && ex.photos.length < MIN_PM_PHOTOS
          ? 'Para finalizar la visita agrega al menos 1 foto de evidencia.'
          : null,
    })

  const { visit } = ex

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main visit-execution pm-visit">
        <h1 className="page-heading">Mantenimiento Preventivo</h1>
        <p className="page-subtitle">Registro de observaciones y evidencia fotográfica.</p>

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

            <section className="form-card section-card">
              <VisitTimesFields visit={visit} ex={ex} coordsVariant="fields" />
            </section>

            <section className="form-card section-card">
              <label className="section-title-sm">
                Observaciones
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="Escriba sus observaciones aquí..."
                />
              </label>
            </section>

            <section className="form-card section-card">
              <PhotoField
                variant="grid"
                label="Evidencia Fotográfica"
                note={`(Mínimo ${MIN_PM_PHOTOS} imagen requerida)`}
                photos={ex.photos}
                error={ex.photoError}
                onAdd={ex.addPhotos}
                onRemove={ex.removePhoto}
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
              finishLabel="Finalizar Visita"
              finishingLabel="Finalizando…"
            />
          </>
        )}
      </main>
    </>
  )
}

export default PreventiveMaintenanceVisit
