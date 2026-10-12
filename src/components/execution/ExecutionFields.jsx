// Campos compartidos por las pantallas de visita en curso.
import { useRef } from 'react'
import { formatLongDate, formatLongDateTime, formatTime, isToday } from '../../visits/dates.js'
import { MAX_PHOTOS } from '../../visits/photos.js'

const ICONS = {
  calendar: 'M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4',
  camera: 'M4 8h3l1.5-2.5h7L17 8h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  pin: 'M12 21s-6.5-6.2-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21zM12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
}

export function Icon({ name, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d={ICONS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// "24/08/2026 - 09:41 AM"
function startLabel(visit, startedAt) {
  if (startedAt) return formatLongDateTime(startedAt)
  const date = formatLongDate(visit.visitDate)
  return visit.visitTime ? `${date} - ${formatTime(visit.visitTime)}` : date
}

function TodayBadge({ value }) {
  return isToday(value) ? <span className="today-badge">Hoy</span> : null
}

// Bloque que va siempre al inicio de toda visita en curso:
// fecha de inicio, fecha de fin y coordenadas (en ese orden).
export function VisitTimesFields({ visit, ex, coordsVariant = 'box' }) {
  return (
    <>
      <div className="field">
        <span className="field-label">Fecha programada</span>
        <span className="readonly-input end-time">
          <Icon name="calendar" />
          <span>{formatLongDate(visit.visitDate)}</span>
          <TodayBadge value={visit.visitDate} />
        </span>
      </div>
      <div className="field">
        <span className="field-label">Fecha de inicio</span>
        <span className="readonly-input end-time">
          <Icon name="clock" />
          <span>
            {startLabel(visit, ex.startedAt)} <TodayBadge value={ex.startedAt ?? visit.visitDate} />
          </span>
          <button
            type="button"
            className="link-button"
            onClick={ex.registerStart}
            disabled={ex.registeringStart}
          >
            {ex.registeringStart ? 'Registrando…' : 'Volver a registrar'}
          </button>
        </span>
      </div>
      <EndTimeField endedAt={ex.endedAt} registering={ex.registeringEnd} onRegister={ex.registerEnd} />
      <CoordinatesField
        variant={coordsVariant}
        label={coordsVariant === 'fields' ? 'Ubicación' : undefined}
        coords={ex.coords}
        locating={ex.locating}
        onRegister={ex.registerLocation}
      />
    </>
  )
}

// Hora de fin: botón para registrarla (obligatoria para guardar).
export function EndTimeField({ label = 'Fecha de fin', endedAt, registering, onRegister }) {
  return (
    <div className="field">
      <span className="field-label">
        {label} {!endedAt && <span className="required">(obligatorio)</span>}
      </span>
      {endedAt ? (
        <span className="readonly-input end-time">
          <Icon name="clock" />
          <span>
            {formatLongDateTime(endedAt)} <TodayBadge value={endedAt} />
          </span>
          <button type="button" className="link-button" onClick={onRegister} disabled={registering}>
            Volver a registrar
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="outline end-button"
          onClick={onRegister}
          disabled={registering}
        >
          <Icon name="clock" />
          {registering ? 'Registrando…' : 'Registrar hora de fin'}
        </button>
      )}
    </div>
  )
}

// Coordenadas tomadas al iniciar la visita; se pueden volver a registrar.
// variant 'box': una línea con "GPS OK"; 'fields': latitud y longitud por separado.
export function CoordinatesField({ coords, locating, onRegister, variant = 'box', label }) {
  const reRegister = coords && (
    <button type="button" className="link-button coords-again" onClick={onRegister} disabled={locating}>
      {locating ? 'Buscando…' : 'Volver a registrar'}
    </button>
  )
  const registerButton = (
    <button type="button" className="gps-retry" onClick={onRegister} disabled={locating}>
      {locating ? 'Buscando…' : 'Registrar'}
    </button>
  )

  if (variant === 'fields') {
    return (
      <div className="field">
        {label && <span className="field-label">{label}</span>}
        <div className="coords-grid">
          <div className="field">
            <span className="field-sublabel">Latitud</span>
            <span className="readonly-input">{coords ? coords.latitude.toFixed(6) : '—'}</span>
          </div>
          <div className="field">
            <span className="field-sublabel">Longitud</span>
            <span className="readonly-input">{coords ? coords.longitude.toFixed(6) : '—'}</span>
          </div>
        </div>
        {coords ? (
          reRegister
        ) : (
          <div className="coords-missing">
            <span className="required">Sin coordenadas (obligatorio)</span>
            {registerButton}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="field">
      <span className="field-label">{label ?? 'Coordenadas de ubicación (Automático)'}</span>
      <div className="gps-box">
        <Icon name="pin" />
        <span className="gps-coords">
          {coords
            ? `Lat: ${coords.latitude.toFixed(6)} • Lon: ${coords.longitude.toFixed(6)}`
            : 'Sin coordenadas (obligatorio)'}
        </span>
        {coords ? <span className="gps-badge ok">GPS OK</span> : registerButton}
      </div>
      {reRegister}
    </div>
  )
}

function PhotoThumb({ photo, onRemove }) {
  return (
    <div className="photo-thumb">
      <img src={photo.url} alt="Foto de la visita" />
      <button
        type="button"
        className="photo-remove"
        onClick={() => onRemove(photo)}
        aria-label="Quitar foto"
      >
        <Icon name="close" size={14} />
      </button>
      {(photo.isNew || photo.pending) && <span className="photo-pending" title="Sin enviar" />}
    </div>
  )
}

// Fotos de la visita.
// variant 'strip': tira horizontal + botón "Capturar Foto" (visita comercial).
// variant 'grid': cuadrícula con mosaico "Agregar" (mantenimiento).
export function PhotoField({ photos, error, onAdd, onRemove, variant = 'strip', label, note }) {
  const cameraInput = useRef(null)
  const galleryInput = useRef(null)
  const handleFiles = (event) => {
    onAdd(event.target.files)
    event.target.value = ''
  }
  const canAdd = photos.length < MAX_PHOTOS

  const inputs = (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFiles}
      />
      <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
    </>
  )

  if (variant === 'grid') {
    return (
      <div className="field">
        {label && <span className="section-title-sm">{label}</span>}
        {note && <span className="section-note">{note}</span>}
        <div className="photo-grid">
          {photos.map((photo) => (
            <PhotoThumb key={photo.key} photo={photo} onRemove={onRemove} />
          ))}
          {canAdd && (
            <button
              type="button"
              className="photo-add-tile"
              onClick={() => galleryInput.current.click()}
            >
              <Icon name="plus" size={22} />
              Agregar
            </button>
          )}
        </div>
        <div className="photo-meta">
          <span>
            {photos.length}/{MAX_PHOTOS} fotos
          </span>
          <span>Máx. 10MB por foto</span>
        </div>
        {error && <p className="field-error">{error}</p>}
        {inputs}
      </div>
    )
  }

  return (
    <div className="field">
      <span className="field-label">{label ?? 'Foto de la visita'}</span>
      <div className="photo-strip">
        {photos.map((photo) => (
          <PhotoThumb key={photo.key} photo={photo} onRemove={onRemove} />
        ))}
        {canAdd && (
          <button
            type="button"
            className="photo-add"
            onClick={() => galleryInput.current.click()}
            aria-label="Agregar foto desde la galería"
          >
            <Icon name="plus" size={22} />
          </button>
        )}
      </div>
      <div className="photo-meta">
        <span>
          {photos.length}/{MAX_PHOTOS} fotos
        </span>
        <span>Máx. 10MB por foto</span>
      </div>
      {error && <p className="field-error">{error}</p>}
      <button
        type="button"
        className="outline capture-button"
        onClick={() => cameraInput.current.click()}
        disabled={!canAdd}
      >
        <Icon name="camera" />
        Capturar Foto
      </button>
      {inputs}
    </div>
  )
}

// Botones inferiores: Guardar y finalizar.
export function ExecutionActions({ saving, onSave, onFinish, finishLabel, finishingLabel }) {
  return (
    <div className="visit-actions">
      <button type="button" className="outline" onClick={onSave} disabled={saving !== null}>
        {saving === 'save' ? 'Guardando…' : 'Guardar'}
      </button>
      <button type="button" onClick={onFinish} disabled={saving !== null}>
        {saving === 'finish' ? finishingLabel : finishLabel}
      </button>
    </div>
  )
}
