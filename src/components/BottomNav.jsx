const icons = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-5.5h3V20h5V9.5',
  agents:
    'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 3.6a3.5 3.5 0 0 1 0 6.8',
  visits: 'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4M9 15l2 2 4-4',
  inventory: 'M20.5 7.5 12 3 3.5 7.5m17 0v9L12 21m8.5-13.5L12 12m0 9-8.5-4.5v-9M12 21v-9M3.5 7.5 12 12',
  profile: 'M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
}

const items = [
  { id: 'home', label: 'Inicio' },
  { id: 'agents', label: 'Agentes' },
  { id: 'visits', label: 'Visitas' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'profile', label: 'Perfil' },
]

function BottomNav({ current, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={current === item.id ? 'active' : ''}
          aria-current={current === item.id ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d={icons[item.id]}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
