import BrandLogo from './BrandLogo.jsx'

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M19 12H5m6-6-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Encabezado de las pantallas internas: botón "atrás" y la marca centrada.
function BackHeader({ onBack }) {
  return (
    <header className="app-header detail-header">
      <button type="button" className="menu-button" onClick={onBack} aria-label="Volver">
        <BackIcon />
      </button>
      <div className="brand">
        <BrandLogo />
      </div>
      <span className="header-spacer" aria-hidden="true" />
    </header>
  )
}

export default BackHeader
