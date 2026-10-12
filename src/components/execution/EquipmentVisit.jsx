import { useState } from 'react'
import { useVisitExecution } from '../../visits/useVisitExecution.js'
import BackHeader from '../BackHeader.jsx'
import EquipmentMovements from './EquipmentMovements.jsx'
import { ExecutionActions, VisitTimesFields } from './ExecutionFields.jsx'

// Configuración de cada tipo: la instalación toma activos del inventario del
// asesor (Activo Entra) y el retiro los saca del agente (Activo Sale).
const CONFIG = {
  instalacion: {
    title: 'Instalación',
    option: { value: 'agregar', label: 'Instalar Equipo' },
    missing: 'Para finalizar la visita registra al menos un equipo instalado.',
  },
  retiro: {
    title: 'Retiro',
    option: { value: 'retirar', label: 'Retiro Equipo' },
    missing: 'Para finalizar la visita registra al menos un equipo retirado.',
  },
}

// Visita de instalación o retiro en curso (creadas desde otra aplicación).
function EquipmentVisit({ visit: summary, onBack, onSaved }) {
  const config = CONFIG[summary.type] ?? CONFIG.instalacion
  const [movements, setMovements] = useState([])

  const ex = useVisitExecution(summary, {
    onSaved,
    onLoaded: (detail) => setMovements(detail.formData?.movements ?? []),
  })

  const submit = (action) =>
    ex.save(action, {
      changes: { formData: { equipmentOption: config.option.value, movements } },
      validate: (act) => (act === 'finish' && movements.length === 0 ? config.missing : null),
    })

  const { visit } = ex

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main visit-execution hotline-visit">
        <h1 className="page-heading">{config.title}</h1>
        <p className="page-subtitle">Gestione y documente los movimientos de activos durante la visita.</p>

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

            {/* Siempre al inicio: fecha de inicio, fecha de fin y ubicación. */}
            <section className="form-card section-card">
              <VisitTimesFields visit={visit} ex={ex} coordsVariant="fields" />
            </section>

            <EquipmentMovements
              agentId={summary.agentId}
              options={[config.option]}
              option={config.option.value}
              onOptionChange={() => {}}
              movements={movements}
              onMovementsChange={setMovements}
            />

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

export default EquipmentVisit
