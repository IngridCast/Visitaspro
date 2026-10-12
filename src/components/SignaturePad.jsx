import { useEffect, useRef, useState } from 'react'

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Recuadro de firma con el dedo o el mouse.
// value: imagen de la firma confirmada (data URL) o null.
// onChange(dataUrl | null) se llama al confirmar o limpiar.
function SignaturePad({ value, onChange, onDirtyChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const confirmed = Boolean(value)

  // Ajusta el canvas a su tamaño en pantalla (nítido en pantallas de alta densidad).
  useEffect(() => {
    if (confirmed) return
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = width * ratio
    canvas.height = height * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [confirmed])

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const start = (event) => {
    event.preventDefault()
    canvasRef.current.setPointerCapture(event.pointerId)
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = point(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.1, y + 0.1)
    ctx.stroke()
    if (!hasStrokes) {
      setHasStrokes(true)
      onDirtyChange?.(true)
    }
  }

  const move = (event) => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = point(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const end = () => {
    drawing.current = false
  }

  const clear = () => {
    if (!confirmed) {
      const canvas = canvasRef.current
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }
    setHasStrokes(false)
    onDirtyChange?.(false)
    onChange(null)
  }

  const confirm = () => {
    onChange(canvasRef.current.toDataURL('image/png'))
    setHasStrokes(false)
    onDirtyChange?.(false)
  }

  return (
    <div className="signature">
      <h3>Firma Electrónica</h3>
      <div className={`signature-box ${confirmed ? 'confirmed' : ''}`}>
        {confirmed ? (
          <img src={value} alt="Firma confirmada" />
        ) : (
          <>
            <canvas
              ref={canvasRef}
              aria-label="Área para firmar"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            />
            {!hasStrokes && (
              <span className="signature-placeholder">
                <PenIcon />
                Firmar aquí
              </span>
            )}
          </>
        )}
      </div>
      {confirmed && <p className="signature-ok">✓ Firma confirmada</p>}
      <div className="signature-actions">
        <button type="button" className="secondary" onClick={clear} disabled={!confirmed && !hasStrokes}>
          Limpiar
        </button>
        <button type="button" onClick={confirm} disabled={confirmed || !hasStrokes}>
          Confirmar
        </button>
      </div>
    </div>
  )
}

export default SignaturePad
