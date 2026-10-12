import { useState } from 'react'
import { useAgentsCatalog } from '../agents/agentsCatalog.js'
import { useAuth } from '../auth/useAuth.js'

function initials(name) {
  return (name ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

// Quita acentos para que "morazan" encuentre "Morazán".
function normalize(text) {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  )
}

function AgentCard({ agent, onOpen }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      className="agent-card clickable"
      role="button"
      tabIndex={0}
      aria-label={`Ver información de ${agent.name}`}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <header className="agent-card-header">
        <span className="avatar">{initials(agent.name)}</span>
        <div>
          <h2>{agent.name}</h2>
          <span className="code-pill">Código: {agent.code}</span>
        </div>
      </header>
      <dl className="agent-details">
        <div>
          <dt>Departamento</dt>
          <dd>{agent.department || '—'}</dd>
        </div>
        <div>
          <dt>Municipio</dt>
          <dd>{agent.municipality || '—'}</dd>
        </div>
        <div className="full">
          <dt>Dirección</dt>
          <dd className="address">
            <PinIcon />
            {agent.address || '—'}
          </dd>
        </div>
      </dl>
    </article>
  )
}

// Lista de agentes desde la información guardada en el dispositivo
// (funciona sin conexión; se actualiza con "Sincronizar" en Inicio).
function AgentsPage({ onOpenAgent }) {
  const { user } = useAuth()
  const catalog = useAgentsCatalog(user.id)
  const [scope, setScope] = useState('all')
  const [search, setSearch] = useState('')

  const mineIds = new Set(catalog?.mineIds ?? [])
  const agents = (catalog?.agents ?? []).filter((a) => scope === 'all' || mineIds.has(a.id))
  const changeScope = setScope

  const term = normalize(search.trim())
  const visible = term
    ? agents.filter((a) =>
        [a.name, a.code, a.department, a.municipality, a.address].some((v) =>
          normalize(v).includes(term),
        ),
      )
    : agents

  return (
    <section className="agents-page">
      <h1 className="page-heading">Agentes</h1>
      <p className="page-subtitle">Directorio de personal de visitas de campo</p>

      <div className="segmented" role="tablist" aria-label="Filtrar agentes">
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'all'}
          className={scope === 'all' ? 'active' : ''}
          onClick={() => changeScope('all')}
        >
          Todos los agentes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'mine'}
          className={scope === 'mine' ? 'active' : ''}
          onClick={() => changeScope('mine')}
        >
          Mis agentes
        </button>
      </div>

      <label className="search-box">
        <SearchIcon />
        <input
          type="search"
          placeholder="Buscar agente..."
          aria-label="Buscar agente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      {!catalog && (
        <p className="empty-state">
          Toque "Sincronizar" en Inicio para descargar los agentes a este dispositivo.
        </p>
      )}
      {catalog && visible.length === 0 && (
        <p className="empty-state">
          {term
            ? 'Ningún agente coincide con la búsqueda.'
            : scope === 'mine'
              ? 'No tienes agentes asignados.'
              : 'Todavía no hay agentes registrados.'}
        </p>
      )}

      {catalog && (
        <div className="agent-list">
          {visible.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onOpen={() => onOpenAgent(agent.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

export default AgentsPage
