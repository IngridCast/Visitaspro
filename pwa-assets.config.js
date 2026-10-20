import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  // Genera los iconos instalados desde el logo azul, con fondo blanco.
  // El nombre nuevo evita reutilizar el icono anterior guardado por Safari.
  preset: {
    ...minimal2023Preset,
    assetName: (type, size) => `loto-azul-${type}-${size.width}x${size.height}.png`,
    transparent: {
      sizes: [64, 192, 512],
      padding: 0.1,
      resizeOptions: { fit: 'contain', background: '#ffffff' },
    },
    // El margen mantiene el logo dentro de la zona segura del icono recortable.
    maskable: {
      sizes: [512],
      padding: 0.3,
      resizeOptions: { fit: 'contain', background: '#ffffff' },
    },
    apple: {
      sizes: [180],
      padding: 0.1,
      resizeOptions: { fit: 'contain', background: '#ffffff' },
    },
  },
  images: ['public/Logo_slogan_azul_1.svg'],
})
