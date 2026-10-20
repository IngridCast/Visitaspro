// Obtiene la ubicación actual del dispositivo: { latitude, longitude }.
// El GPS puede funcionar sin internet si la app ya está cargada en un contexto seguro.
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    // En teléfonos, una IP local por HTTP no permite geolocalización.
    // Se comprueba antes de buscar la API para no confundir el bloqueo con falta de GPS.
    // localhost en la computadora puede ser seguro sin HTTPS: lo decide el navegador.
    if (!window.isSecureContext) {
      reject(new Error('La ubicación requiere HTTPS. Abre VisitasPro con una dirección HTTPS válida; la dirección HTTP de la red local solo permite probar la interfaz.'))
      return
    }
    if (!('geolocation' in navigator)) {
      // La ausencia de la API no demuestra que el dispositivo carezca de GPS.
      reject(new Error('Este navegador no permite acceder a la ubicación. Intenta abrir VisitasPro en Safari o Chrome.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }),
      (error) => {
        // Mensajes separados para saber si hay que revisar permisos, señal o reintentar.
        // No se guardan coordenadas de ejemplo ni se omite la ubicación obligatoria.
        const messages = {
          1: 'El acceso a la ubicación está bloqueado. Permite la ubicación para este sitio y revisa que Localización esté activada en los ajustes del teléfono.',
          2: 'La ubicación no está disponible. Revisa que Localización esté activada, busca un lugar con mejor señal y vuelve a registrar.',
          3: 'Se agotó el tiempo de espera para obtener la ubicación. Busca un lugar con mejor señal y vuelve a registrar.',
        }
        reject(new Error(messages[error.code] ?? 'No se pudo obtener la ubicación. Intenta registrar de nuevo.'))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
    )
  })
}
