// Obtiene la ubicación actual del dispositivo: { latitude, longitude }.
// El GPS funciona aunque no haya internet.
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Este dispositivo no tiene GPS disponible.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'Permite el acceso a la ubicación para iniciar la visita.'
              : 'No se pudo obtener la ubicación. Verifica que el GPS esté activado e intenta de nuevo.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
    )
  })
}
