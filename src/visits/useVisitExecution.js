import { useEffect, useRef, useState } from 'react'
import { getCurrentLocation } from './location.js'
import { compressPhoto, MAX_PHOTOS } from './photos.js'
import { getVisitDetail, getVisitPhotos, removeVisitPhoto, saveVisit } from './visitsApi.js'

// Lógica común de las pantallas de visita en curso (comercial, PM, ...):
// carga de la visita, fotos, hora de fin, coordenadas y guardado.
//
// onLoaded(detail) permite a cada pantalla cargar sus propios campos.
// onSaved(visit, action) se llama al guardar ('save') o finalizar ('finish').
export function useVisitExecution(summary, { onLoaded, onSaved }) {
  const [visit, setVisit] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [startedAt, setStartedAt] = useState(null)
  const [registeringStart, setRegisteringStart] = useState(false)
  const [endedAt, setEndedAt] = useState(null)
  const [registeringEnd, setRegisteringEnd] = useState(false)
  const [photos, setPhotos] = useState([]) // { key, url, blob, serverId?, pending?, isNew? }
  const [photoError, setPhotoError] = useState('')
  // Coordenadas registradas al iniciar la visita (no se pueden modificar).
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)
  const urls = useRef([])
  const onLoadedRef = useRef(onLoaded)

  const makeUrl = (blob) => {
    const url = URL.createObjectURL(blob)
    urls.current.push(url)
    return url
  }

  // Libera las imágenes en memoria al salir de la pantalla.
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  // Carga la visita y sus fotos.
  useEffect(() => {
    window.scrollTo(0, 0)
    let cancelled = false
    ;(async () => {
      try {
        const detail = await getVisitDetail(summary)
        if (cancelled) return
        setVisit(detail)
        setStartedAt(detail.startedAt ?? null)
        setEndedAt(detail.endedAt ?? null)
        if (detail.latitude != null && detail.longitude != null) {
          setCoords({ latitude: detail.latitude, longitude: detail.longitude })
        }
        onLoadedRef.current?.(detail)
        const list = await getVisitPhotos(detail)
        if (!cancelled) setPhotos(list.map((p) => ({ ...p, url: makeUrl(p.blob) })))
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.id])

  // Registra (o vuelve a registrar) la ubicación actual; se guarda de inmediato.
  const registerLocation = async () => {
    if (coords && !window.confirm('¿Registrar de nuevo la ubicación con la posición actual?')) return
    setError('')
    setLocating(true)
    try {
      const location = await getCurrentLocation()
      const saved = await saveVisit(visit, location)
      setVisit((prev) => ({ ...prev, ...saved }))
      setCoords(location)
    } catch (err) {
      setError(err.message)
    } finally {
      setLocating(false)
    }
  }

  // Vuelve a registrar la hora de inicio con la hora actual (se guarda de inmediato).
  const registerStart = async () => {
    const warning = endedAt
      ? '¿Registrar de nuevo la hora de inicio con la hora actual? Después deberá registrar otra vez la hora de fin.'
      : '¿Registrar de nuevo la hora de inicio con la hora actual?'
    if (!window.confirm(warning)) return
    setError('')
    setRegisteringStart(true)
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    try {
      const saved = await saveVisit(visit, {
        startedAt: now.toISOString(),
        // La hora que se muestra en las tarjetas de visitas.
        visitTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      })
      setVisit((prev) => ({ ...prev, ...saved }))
      setStartedAt(now.toISOString())
    } catch (err) {
      setError(err.message)
    } finally {
      setRegisteringStart(false)
    }
  }

  // Guarda de inmediato la hora de fin (también sin conexión).
  const registerEnd = async () => {
    if (endedAt && !window.confirm('¿Registrar de nuevo la hora de fin con la hora actual?')) return
    setError('')
    setRegisteringEnd(true)
    const now = new Date().toISOString()
    try {
      const saved = await saveVisit(visit, { endedAt: now })
      setVisit((prev) => ({ ...prev, ...saved }))
      setEndedAt(now)
    } catch (err) {
      setError(err.message)
    } finally {
      setRegisteringEnd(false)
    }
  }

  const addPhotos = async (fileList) => {
    setPhotoError('')
    const files = [...fileList]
    const room = MAX_PHOTOS - photos.length
    if (files.length > room) {
      setPhotoError(`Máximo ${MAX_PHOTOS} fotos por visita.`)
    }
    const added = []
    for (const file of files.slice(0, Math.max(room, 0))) {
      try {
        const blob = await compressPhoto(file)
        added.push({ key: `new-${crypto.randomUUID()}`, blob, url: makeUrl(blob), isNew: true })
      } catch (err) {
        setPhotoError(err.message)
      }
    }
    setPhotos((prev) => [...prev, ...added])
  }

  const removePhoto = async (photo) => {
    setPhotoError('')
    if (!photo.isNew) {
      if (!window.confirm('¿Quitar esta foto de la visita?')) return
      try {
        await removeVisitPhoto(visit, photo)
      } catch (err) {
        setPhotoError(err.message)
        return
      }
    }
    setPhotos((prev) => prev.filter((p) => p.key !== photo.key))
  }

  // Guarda el avance sin exigir hora de fin ni coordenadas (botón "Siguiente").
  // Devuelve true si se guardó.
  const saveDraft = async (changes) => {
    setError('')
    setSaving('draft')
    try {
      const saved = await saveVisit(visit, changes)
      setVisit((prev) => ({ ...prev, ...saved }))
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setSaving(null)
    }
  }

  // Guarda la visita. Para guardar siempre se exigen hora de fin y coordenadas.
  // validate(action) devuelve un mensaje de error propio de la pantalla o null.
  const save = async (action, { changes = {}, validate } = {}) => {
    setError('')
    if (!endedAt) {
      setError('Registra la hora de fin antes de guardar la visita.')
      return
    }
    if (!coords) {
      setError('Registra las coordenadas de ubicación antes de guardar la visita.')
      return
    }
    if (startedAt && new Date(endedAt) < new Date(startedAt)) {
      setError('La hora de fin es anterior a la hora de inicio. Vuelve a registrar la hora de fin.')
      return
    }
    const message = validate?.(action)
    if (message) {
      setError(message)
      return
    }

    const newPhotos = photos.filter((p) => p.isNew)
    setSaving(action)
    try {
      const saved = await saveVisit(
        visit,
        { ...changes, endedAt, ...(action === 'finish' ? { status: 'cerrada' } : {}) },
        newPhotos.map((p) => p.blob),
      )
      onSaved(saved, action)
    } catch (err) {
      // Las fotos que sí se subieron ya no son "nuevas".
      const uploaded = new Set(newPhotos.slice(0, err.uploadedPhotos ?? 0).map((p) => p.key))
      setPhotos((prev) => prev.map((p) => (uploaded.has(p.key) ? { ...p, isNew: false } : p)))
      setError(err.message)
      setSaving(null)
    }
  }

  return {
    visit,
    loadError,
    startedAt,
    registeringStart,
    registerStart,
    endedAt,
    registeringEnd,
    registerEnd,
    coords,
    locating,
    registerLocation,
    photos,
    photoError,
    addPhotos,
    removePhoto,
    error,
    saving,
    save,
    saveDraft,
  }
}
