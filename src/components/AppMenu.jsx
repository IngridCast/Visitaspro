import { useEffect, useRef } from 'react'

// Panel lateral que se abre con el botón ☰ del encabezado.
function AppMenu({ user, items, currentView, onNavigate, isOnline, canInstall, onInstall, onLogout, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current.showModal()
  }, [])

  // Cerrar al tocar fuera del panel (sobre el fondo oscuro).
  const handleClick = (event) => {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog ref={dialogRef} className="drawer" onClose={onClose} onClick={handleClick}>
      <div className="drawer-content">
        <div className="drawer-user">
          <strong>{user.name}</strong>
          <small>{user.provider === 'microsoft' ? 'Cuenta Microsoft' : `@${user.username}`}</small>
          <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>

        <nav className="drawer-nav" aria-label="Menú principal">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={currentView === item.id ? 'active' : ''}
              aria-current={currentView === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="drawer-footer">
          {canInstall && (
            <button type="button" onClick={onInstall}>
              Instalar aplicación
            </button>
          )}
          <button type="button" className="secondary" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default AppMenu
