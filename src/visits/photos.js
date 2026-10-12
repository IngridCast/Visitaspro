export const MAX_PHOTOS = 10
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const MAX_DIMENSION = 1600

// Reduce la foto (máx. 1600 px por lado, JPEG) para que ocupe poco en el
// celular y se suba rápido. Devuelve un Blob image/jpeg.
export async function compressPhoto(file) {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('La foto supera el máximo de 10 MB.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo no es una imagen.')
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('No se pudo leer la imagen.')
  })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))),
      'image/jpeg',
      0.8,
    )
  })
}
