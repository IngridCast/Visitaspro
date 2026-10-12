// Carga agentes de ejemplo para probar la app.
// Uso: npm run seed-agents -- [usuario]
// Los agentes marcados como "mine" se asignan al usuario indicado
// (por defecto, el primer administrador).
import { db, findUserByUsername, upsertAgent } from '../src/db.js'

const sampleAgents = [
  {
    code: 'AG-107', name: 'Tienda Asia', department: 'Francisco Morazán', municipality: 'Tegucigalpa',
    address: 'Colonia Suyapa, Calle Principal', zone: 'Tegucigalpa', subzone: 'Suyapa', locality: 'LOCAL',
    category: 'Level 4', salesManager: 'Gary Javier Torres Mackay', advisor: 'Andrés Albry Cortés Orellana',
    pmBy: 'Olman Martínez', lastPmAt: '2026-08-13T00:00', lastVisitAt: '2026-08-10T15:30',
    latitude: 14.088236, longitude: -87.1915777, mine: true,
  },
  {
    code: 'AG-109', name: 'Pollos Del Rancho', department: 'Francisco Morazán', municipality: 'Tegucigalpa',
    address: 'Colonia Alameda, 2da Avenida, Casa 12', zone: 'Tegucigalpa', subzone: 'Alameda', locality: 'LOCAL',
    category: 'Level 3', salesManager: 'Gary Javier Torres Mackay', advisor: 'Andrés Albry Cortés Orellana',
    pmBy: 'Olman Martínez', lastPmAt: '2026-08-20T09:15', lastVisitAt: '2026-09-02T10:45',
    latitude: 14.0912345, longitude: -87.1987654, mine: true,
  },
  {
    code: 'AG-112', name: 'Pulpería La Esperanza', department: 'Francisco Morazán', municipality: 'Comayagüela',
    address: 'Barrio Belén, 5ta Calle', zone: 'Comayagüela', subzone: 'Belén', locality: 'LOCAL',
    category: 'Level 2', salesManager: 'Gary Javier Torres Mackay', advisor: 'María José Paz Ordóñez',
    pmBy: 'Olman Martínez', lastPmAt: '2026-07-28T14:00', lastVisitAt: '2026-09-15T08:20',
    latitude: 14.0821, longitude: -87.2105, mine: true,
  },
  {
    code: 'AG-118', name: 'Farmacia San Rafael', department: 'Cortés', municipality: 'San Pedro Sula',
    address: 'Barrio Guamilito, 6ta Avenida', zone: 'San Pedro Sula', subzone: 'Guamilito', locality: 'URBANO',
    category: 'Level 4', salesManager: 'Karla Melissa Rivera Soto', advisor: 'Luis Fernando Mejía Bonilla',
    pmBy: 'Héctor Banegas', lastPmAt: '2026-09-01T11:00', lastVisitAt: '2026-09-20T16:10',
    latitude: 15.5059, longitude: -88.0281,
  },
  {
    code: 'AG-121', name: 'Ferretería El Constructor', department: 'Cortés', municipality: 'Choloma',
    address: 'Colonia López Arellano, Bloque 3', zone: 'Choloma', subzone: 'López Arellano', locality: 'URBANO',
    category: 'Level 3', salesManager: 'Karla Melissa Rivera Soto', advisor: 'Luis Fernando Mejía Bonilla',
    pmBy: 'Héctor Banegas', lastPmAt: '2026-08-05T10:30', lastVisitAt: '2026-09-11T13:00',
    latitude: 15.6144, longitude: -87.9531,
  },
  {
    code: 'AG-125', name: 'Supermercado Don Juan', department: 'Atlántida', municipality: 'La Ceiba',
    address: 'Avenida San Isidro, frente al parque', zone: 'La Ceiba', subzone: 'Centro', locality: 'URBANO',
    category: 'Level 5', salesManager: 'Roberto Carlos Zelaya', advisor: 'Daniela Sofía Castro Núñez',
    pmBy: 'Iris Cálix', lastPmAt: '2026-09-09T08:00', lastVisitAt: '2026-09-25T09:40',
    latitude: 15.7835, longitude: -86.7876,
  },
  {
    code: 'AG-130', name: 'Librería Central', department: 'Comayagua', municipality: 'Comayagua',
    address: 'Barrio Arriba, Calle del Comercio', zone: 'Comayagua', subzone: 'Centro', locality: 'LOCAL',
    category: 'Level 2', salesManager: 'Roberto Carlos Zelaya', advisor: 'Daniela Sofía Castro Núñez',
    pmBy: 'Iris Cálix', lastPmAt: '2026-06-30T15:45', lastVisitAt: '2026-08-29T11:25',
    latitude: 14.4603, longitude: -87.6418,
  },
]

const username = process.argv[2]
const owner = username
  ? findUserByUsername(username)
  : db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get()

if (username && !owner) {
  console.error(`No existe el usuario "${username}".`)
  process.exit(1)
}

for (const { mine, ...agent } of sampleAgents) {
  upsertAgent({ ...agent, assignedUserId: mine && owner ? owner.id : null })
}

console.log(
  `${sampleAgents.length} agentes de ejemplo cargados` +
    (owner ? `; ${sampleAgents.filter((a) => a.mine).length} asignados a "${owner.username}".` : '.'),
)
