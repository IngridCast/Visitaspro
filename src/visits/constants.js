export const VISIT_TYPES = [
  { value: 'comercial', label: 'Visita comercial' },
  { value: 'hotline', label: 'Hotline' },
  { value: 'pm', label: 'PM' },
  { value: 'otros_soportes', label: 'Otros soportes' },
  { value: 'instalacion', label: 'Instalación' },
  { value: 'retiro', label: 'Retiro' },
]

// Tipos que llegan ya creados desde otra aplicación: aquí solo se pueden
// reprogramar e iniciar (no se crean ni se cancelan desde esta app).
export const ASSIGNED_TYPES = ['instalacion', 'retiro']

// Tipos que se pueden elegir al crear una visita en esta app.
export const CREATABLE_TYPES = VISIT_TYPES.filter((t) => !ASSIGNED_TYPES.includes(t.value))

export const VISIT_STATUSES = [
  { value: 'programada', label: 'Programada' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'sin_programar', label: 'Sin Programar' },
  { value: 'cancelada', label: 'Cancelada' },
]

// Estados finales: la visita ya no se puede editar.
export const FINAL_STATUSES = ['cerrada', 'cancelada']

// Tipos de visita que ya tienen su pantalla de visita en curso.
// Si se agrega un tipo nuevo, incluirlo también en STARTABLE_TYPES de
// server/src/visits.js.
export const STARTABLE_TYPES = ['comercial', 'pm', 'hotline', 'otros_soportes', 'instalacion', 'retiro']

export function canStartVisit(type) {
  return STARTABLE_TYPES.includes(type)
}

export function visitTypeLabel(value) {
  return VISIT_TYPES.find((t) => t.value === value)?.label ?? value
}

export function visitStatusLabel(value) {
  return VISIT_STATUSES.find((s) => s.value === value)?.label ?? value
}
