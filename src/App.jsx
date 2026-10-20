import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from './auth/useAuth.js'
import AgentDetail from './components/AgentDetail.jsx'
import AgentHistory from './components/AgentHistory.jsx'
import AgentsPage from './components/AgentsPage.jsx'
import AppMenu from './components/AppMenu.jsx'
import BottomNav from './components/BottomNav.jsx'
import BrandLogo from './components/BrandLogo.jsx'
import HomePage from './components/HomePage.jsx'
import InventoryPage from './components/InventoryPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import MovementsHistoryPage from './components/MovementsHistoryPage.jsx'
import MyInventoryPage from './components/MyInventoryPage.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import ReloadPrompt from './components/ReloadPrompt.jsx'
import ReportPage from './components/ReportPage.jsx'
import UsersPage from './components/UsersPage.jsx'
import VisitExecution from './components/VisitExecution.jsx'
import VisitForm from './components/VisitForm.jsx'
import VisitsPage from './components/VisitsPage.jsx'
import WorkdayPage from './components/WorkdayPage.jsx'
import { useInstallPrompt } from './hooks/useInstallPrompt.js'
import { useOnlineStatus } from './hooks/useOnlineStatus.js'
import { canStartVisit, visitTypeLabel } from './visits/constants.js'
import { onDataChanged } from './sync/snapshot.js'
import { pendingVisitsCount } from './visits/visitsApi.js'

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function App() {
  const { user, logout } = useAuth()
  const isOnline = useOnlineStatus()
  const { canInstall, install, isInstalled, isIOS, isSecure } = useInstallPrompt()
  const [view, setView] = useState('home')
  // Pantallas principales ya abiertas: se mantienen montadas (ocultas) para
  // conservar filtros y búsquedas al cambiar de pestaña.
  const [openedViews, setOpenedViews] = useState(() => new Set(['home']))
  const [menuOpen, setMenuOpen] = useState(false)
  // Pantalla interna actual, guardada en el historial del navegador para que
  // el botón o gesto "atrás" del celular regrese:
  //   { agentId }                       detalle del agente
  //   { agentId, agent, newVisit }      registro de visita
  //   { agentId, agent, history }       historial de visitas del agente
  //   { agentId, agent, inventory }     inventario de activos del agente
  //   { ..., editVisit }                editar una visita programada
  //   { ..., executeVisit }             visita en curso (fotos, firma, etc.)
  //   { report: true }                  reporte mensual (desde Perfil)
  //   { workday: true }                 inicio de labores (desde Perfil)
  //   { ..., movements: { filter, subtitle } }  historial de movimientos de activos
  const [route, setRoute] = useState(() => window.history.state ?? {})
  const [flash, setFlash] = useState('')
  // Se incrementa para que las listas de visitas se recarguen.
  const [visitsVersion, setVisitsVersion] = useState(0)
  const [pendingCount, setPendingCount] = useState(pendingVisitsCount)
  const flashTimer = useRef(null)
  const mainScroll = useRef(0)

  const inSubScreen =
    route.agentId != null ||
    route.editVisit != null ||
    route.executeVisit != null ||
    route.report === true ||
    route.workday === true ||
    route.movements != null

  useEffect(() => {
    const onPopState = (event) => setRoute(event.state ?? {})
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  // Al volver a una pantalla principal, recupera la posición donde estaba.
  useLayoutEffect(() => {
    if (!inSubScreen) window.scrollTo(0, mainScroll.current)
  }, [inSubScreen])

  const showFlash = (message) => {
    setFlash(message)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(''), 3000)
  }

  // La sincronización es manual (botón "Sincronizar"). Al terminar, las
  // pantallas vuelven a leer los datos del dispositivo.
  useEffect(
    () =>
      onDataChanged(() => {
        setPendingCount(pendingVisitsCount())
        setVisitsVersion((v) => v + 1)
      }),
    [],
  )

  const navigate = (next) => {
    if (!inSubScreen) mainScroll.current = window.scrollY
    window.history.pushState(next, '')
    setRoute(next)
  }

  const goBack = () => window.history.back()

  // Cambia la pantalla actual sin agregar un paso al historial.
  const replaceRoute = (next) => {
    window.history.replaceState(next, '')
    setRoute(next)
  }

  const changeView = (id) => {
    setView(id)
    setOpenedViews((prev) => (prev.has(id) ? prev : new Set([...prev, id])))
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }

  const openAgent = (id) => navigate({ agentId: id })
  const openVisitForm = (agent) => navigate({ agentId: agent.id, agent, newVisit: true })
  const openHistory = (agent) => navigate({ agentId: agent.id, agent, history: true })
  const openInventory = (agent) => navigate({ agentId: agent.id, agent, inventory: true })
  const openMovements = (filter, subtitle) => navigate({ ...route, movements: { filter, subtitle } })
  // Una visita en proceso se continúa en la pantalla de visita en curso.
  const openEditVisit = (visit) => {
    if (visit.status === 'en_proceso' && !canStartVisit(visit.type)) {
      showFlash(`La pantalla de visita ${visitTypeLabel(visit.type)} estará disponible próximamente.`)
      return
    }
    navigate(
      visit.status === 'en_proceso'
        ? { ...route, executeVisit: visit }
        : { ...route, editVisit: visit },
    )
  }

  const handleVisitSaved = (visit, action) => {
    setPendingCount(pendingVisitsCount())
    setVisitsVersion((v) => v + 1)

    // Al iniciar, el formulario se reemplaza por la pantalla de visita en curso
    // (así "atrás" no regresa al formulario).
    if (action === 'start') {
      // eslint-disable-next-line no-unused-vars
      const { newVisit, editVisit, ...rest } = route
      replaceRoute({ ...rest, executeVisit: visit })
      showFlash(visit.pendingSync ? 'Visita iniciada sin conexión.' : 'Visita iniciada.')
      return
    }

    const messages = {
      save: 'Visita guardada.',
      reschedule: 'Visita reprogramada.',
      finish: 'Visita enviada.',
      cancel: 'Visita cancelada.',
    }
    showFlash(
      visit.pendingSync
        ? 'Guardada sin conexión. Se sincronizará al volver la conexión.'
        : messages[action],
    )
    goBack()
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <ReloadPrompt />
      </>
    )
  }

  const isAdmin = user.role === 'admin'
  const menuItems = [
    { id: 'home', label: 'Inicio' },
    { id: 'agents', label: 'Agentes' },
    { id: 'visits', label: 'Mis Visitas' },
    { id: 'inventory', label: 'Mi Inventario' },
    ...(isAdmin ? [{ id: 'users', label: 'Usuarios' }] : []),
    { id: 'profile', label: 'Perfil' },
  ]
  const currentView = menuItems.some((item) => item.id === view) ? view : 'home'
  const editing = route.editVisit != null
  const executing = route.executeVisit != null
  const covered = editing || executing
  const agentSub = route.newVisit
    ? 'new'
    : route.history
      ? 'history'
      : route.inventory
        ? 'inventory'
        : null

  // Las pantallas principales se montan la primera vez que se abren.
  const mainPage = (id, element) =>
    openedViews.has(id) || currentView === id ? (
      <div key={id} hidden={currentView !== id}>
        {element}
      </div>
    ) : null

  return (
    <>
      {/* ---------- Pantallas internas ---------- */}
      {route.agentId != null && (
        <div hidden={covered || agentSub !== null}>
          <AgentDetail
            agentId={route.agentId}
            onBack={goBack}
            onNewVisit={openVisitForm}
            onHistory={openHistory}
            onInventory={openInventory}
          />
        </div>
      )}
      {agentSub === 'new' && !covered && (
        <VisitForm agent={route.agent} onBack={goBack} onSaved={handleVisitSaved} />
      )}
      {agentSub === 'history' && (
        <div hidden={covered}>
          <AgentHistory
            agent={route.agent}
            version={visitsVersion}
            onEdit={openEditVisit}
            onBack={goBack}
          />
        </div>
      )}
      {agentSub === 'inventory' && (
        <div hidden={route.movements != null}>
          <InventoryPage agent={route.agent} onBack={goBack} onOpenMovements={openMovements} />
        </div>
      )}
      {route.movements && (
        <MovementsHistoryPage
          key={JSON.stringify(route.movements.filter)}
          filter={route.movements.filter}
          subtitle={route.movements.subtitle}
          onBack={goBack}
        />
      )}
      {editing && !executing && (
        <VisitForm
          key={route.editVisit.id}
          visit={route.editVisit}
          // Desde Mis Visitas (o Inicio) se reprograma; desde Agentes se guarda.
          reschedule={route.agentId == null}
          onBack={goBack}
          onSaved={handleVisitSaved}
        />
      )}
      {executing && (
        <VisitExecution
          key={route.executeVisit.id}
          visit={route.executeVisit}
          onBack={goBack}
          onSaved={handleVisitSaved}
        />
      )}

      {route.report && <ReportPage user={user} onBack={goBack} />}
      {route.workday && (
        <WorkdayPage
          onBack={goBack}
          onRegistered={({ pending }) => {
            showFlash(
              pending
                ? 'Inicio de labores guardado sin conexión. Se enviará al volver la conexión.'
                : 'Inicio de labores registrado.',
            )
            goBack()
          }}
        />
      )}

      {/* ---------- Pantallas principales ---------- */}
      <div hidden={inSubScreen} className="with-bottom-nav">
        <header className="app-header">
          <div className="brand">
            <BrandLogo />
          </div>
          <div className="header-actions">
            {!isOnline && <span className="status offline">Sin conexión</span>}
            <button
              type="button"
              className="menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </button>
          </div>
        </header>

        <main className="app-main">
          {mainPage(
            'home',
            <HomePage
              user={user}
              version={visitsVersion}
              onEdit={openEditVisit}
              onSeeAll={() => changeView('visits')}
            />,
          )}
          {mainPage('agents', <AgentsPage onOpenAgent={openAgent} />)}
          {mainPage('visits', <VisitsPage version={visitsVersion} onEdit={openEditVisit} />)}
          {mainPage(
            'inventory',
            <MyInventoryPage user={user} version={visitsVersion} onOpenMovements={openMovements} />,
          )}
          {isAdmin && mainPage('users', <UsersPage />)}
          {mainPage(
            'profile',
            <ProfilePage
              user={user}
              isOnline={isOnline}
              pendingCount={pendingCount}
              canInstall={canInstall}
              onInstall={install}
              isInstalled={isInstalled}
              isIOS={isIOS}
              isSecure={isSecure}
              onOpenUsers={() => changeView('users')}
              onOpenInventory={() => changeView('inventory')}
              onOpenReport={() => navigate({ report: true })}
              onOpenWorkday={() => navigate({ workday: true })}
              onLogout={logout}
            />,
          )}
        </main>

        <BottomNav current={currentView} onNavigate={changeView} />
      </div>

      {menuOpen && (
        <AppMenu
          user={user}
          items={menuItems}
          currentView={currentView}
          isOnline={isOnline}
          canInstall={canInstall}
          onInstall={install}
          onNavigate={changeView}
          onLogout={logout}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {flash && (
        <p className={`snackbar ${inSubScreen ? '' : 'above-nav'}`} role="status">
          {flash}
        </p>
      )}

      <ReloadPrompt />
    </>
  )
}

export default App
