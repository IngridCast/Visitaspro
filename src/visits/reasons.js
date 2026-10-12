// Razones y sub razones de cada tipo de visita.
// Edita estas listas para ajustarlas a las del negocio.
export const VISIT_REASONS = {
  comercial: {
    'Reunión de Seguimiento': [
      'Presentación de Propuesta Comercial',
      'Revisión de Metas de Venta',
      'Negociación de Condiciones',
    ],
    'Prospección': ['Nuevo Cliente Potencial', 'Levantamiento de Necesidades'],
    'Activación de Marca': ['Colocación de Material POP', 'Promoción en Punto de Venta'],
    'Cobranza': ['Gestión de Pago Pendiente', 'Conciliación de Saldos'],
  },
  hotline: {
    'Soporte Técnico': ['Falla de Equipo', 'Problema de Conexión', 'Configuración'],
    'Reclamo': ['Producto Defectuoso', 'Error en Facturación', 'Atención al Cliente'],
    'Consulta': ['Información de Productos', 'Estado de Pedido'],
  },
  pm: {
    'Mantenimiento Preventivo': ['Limpieza de Equipo', 'Revisión General', 'Calibración'],
    'Mantenimiento Correctivo': ['Reemplazo de Piezas', 'Reparación en Sitio'],
    'Inspección': ['Verificación de Inventario', 'Auditoría de Equipo'],
  },
}
