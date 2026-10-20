import InstallCard from './InstallCard.jsx'

function initials(name) {
  return (name ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function ProfilePage({
  user,
  isOnline,
  pendingCount,
  canInstall,
  onInstall,
  isInstalled,
  isIOS,
  isSecure,
  onOpenUsers,
  onOpenInventory,
  onOpenReport,
  onOpenWorkday,
  onLogout,
}) {
  return (
    <div className="profile-page">
      <h1 className="page-heading">Perfil</h1>

      <section className="profile-card">
        <span className="avatar large">{initials(user.name)}</span>
        <div>
          <strong>{user.name}</strong>
          <small>
            {user.provider === 'microsoft' ? 'Cuenta Microsoft' : `@${user.username}`}
            {user.role === 'admin' && ' · Administrador'}
          </small>
          {user.email && <small>{user.email}</small>}
        </div>
      </section>

      <section className="profile-list">
        <div className="profile-row">
          <span>Conexión</span>
          <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
        <div className="profile-row">
          <span>Visitas pendientes de sincronizar</span>
          <strong>{pendingCount}</strong>
        </div>
      </section>

      <div className="profile-actions">
        <button type="button" onClick={onOpenWorkday}>
          Inicio de labores
        </button>
        <button type="button" className="secondary" onClick={onOpenReport}>
          Reporte mensual
        </button>
        <button type="button" className="secondary" onClick={onOpenInventory}>
          Mi inventario
        </button>
        {user.role === 'admin' && (
          <button type="button" className="secondary" onClick={onOpenUsers}>
            Administrar usuarios
          </button>
        )}
        <button type="button" className="secondary danger" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
      <InstallCard {...{ canInstall, onInstall, isInstalled, isIOS, isSecure }} />
    </div>
  )
}

export default ProfilePage
