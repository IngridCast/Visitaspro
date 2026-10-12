import { formatLongDateTime } from '../visits/dates.js'

// "2026-08-13T00:00" → "13 ago 2026 - 12:00 AM"
function formatDate(value) {
  return value ? formatLongDateTime(value) || value : '—'
}

function display(value) {
  return value === null || value === undefined || value === '' ? '—' : value
}

function Field({ label, value, full = false }) {
  return (
    <div className={`detail-field ${full ? 'full' : ''}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{display(value)}</span>
    </div>
  )
}

// Información general del agente (solo lectura).
function AgentInfoCard({ agent, title }) {
  return (
    <section className="detail-card">
      {title && <h2 className="detail-card-title">{title}</h2>}
      <Field label="Código" value={agent.code} />
      <Field label="Agente" value={agent.name} />
      <Field label="Zona" value={agent.zone} />
      <Field label="Sub zona" value={agent.subzone} />
      <Field label="Localidad" value={agent.locality} />
      <Field label="Categoría" value={agent.category} />
      <Field label="Dirección" value={agent.address} full />
      <Field label="Gerente de ventas" value={agent.salesManager} full />
      <Field label="Asesor" value={agent.advisor} full />
      <Field label="PM realizado por" value={agent.pmBy} full />
      <Field label="Último PM" value={formatDate(agent.lastPmAt)} full />
      <Field label="Última visita comercial" value={formatDate(agent.lastVisitAt)} full />
      <Field label="Ubicación latitude" value={agent.latitude} />
      <Field label="Ubicación longitude" value={agent.longitude} />
    </section>
  )
}

export default AgentInfoCard
