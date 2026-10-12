import { useEffect } from 'react'
import { findAgent, useAgentsCatalog } from '../agents/agentsCatalog.js'
import { useAuth } from '../auth/useAuth.js'
import AgentInfoCard from './AgentInfoCard.jsx'
import BackHeader from './BackHeader.jsx'

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M21 8 12 3 3 8m18 0v8l-9 5m9-13-9 5m0 8-9-5V8m9 13v-8M3 8l9 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function AgentDetail({ agentId, onBack, onNewVisit, onHistory, onInventory }) {
  const { user } = useAuth()
  const catalog = useAgentsCatalog(user.id)
  const agent = findAgent(catalog, agentId)
  const error = agent
    ? ''
    : 'Este agente no está en la información guardada. Toque "Sincronizar" en Inicio.'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [agentId])

  return (
    <>
      <BackHeader onBack={onBack} />

      <main className="app-main agent-detail">
        <h1 className="section-title">Información General del Comisionista</h1>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        {agent && (
          <>
            <AgentInfoCard agent={agent} />

            <button type="button" className="action-row" onClick={() => onInventory(agent)}>
              <BoxIcon />
              <span>Ver Inventario</span>
              <ChevronIcon />
            </button>
            <button
              type="button"
              className="action-row"
              onClick={() => onHistory(agent)}
            >
              <HistoryIcon />
              <span>Ver Historial de Visitas</span>
              <ChevronIcon />
            </button>

            <button
              type="button"
              className="fab"
              onClick={() => onNewVisit(agent)}
              aria-label="Nueva visita"
            >
              +
            </button>
          </>
        )}

      </main>
    </>
  )
}

export default AgentDetail
