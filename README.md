# VisitasPro

Aplicación web progresiva (PWA) con React + Vite y [vite-plugin-pwa](https://vite-pwa-org.netlify.app/),
con un servidor Node + Express (`server/`) para el inicio de sesión.

## Puesta en marcha

```bash
npm install
npm install --prefix server

# Crear el primer usuario (pide la contraseña, mínimo 8 caracteres)
npm run create-user --prefix server -- admin "Administrador" admin@empresa.com

# En dos terminales:
npm run server   # API en http://localhost:3000
npm run dev      # PWA en http://localhost:5173
```

La primera vez, copia `.env.example` → `.env.local` y `server/.env.example` → `server/.env`
(con un `JWT_SECRET` largo y aleatorio).

## Scripts

| Comando                       | Descripción                                          |
| ----------------------------- | ---------------------------------------------------- |
| `npm run dev`                 | Servidor de desarrollo (con service worker activo)   |
| `npm run server`              | Inicia la API de `server/` (se reinicia al guardar)  |
| `npm run build`               | Compila a `dist/` y genera `sw.js` y el manifest     |
| `npm run preview`             | Sirve la build para probar la PWA                    |
| `npm run lint`                | Revisa el código con oxlint                          |
| `npm run generate-pwa-assets` | Regenera los íconos a partir de `public/logo.svg`    |

## Inicio de sesión

La app pide iniciar sesión antes de mostrar el contenido y el botón de instalación. Hay dos opciones:

1. **Usuario y contraseña del sistema**, validados por el servidor de `server/`.
2. **Microsoft (Entra ID / Azure AD)**, con MSAL:
   1. En [portal.azure.com](https://portal.azure.com) → *Microsoft Entra ID* → *Registros de aplicaciones* → *Nuevo registro*.
   2. En *URI de redirección* elige **Aplicación de página única (SPA)** y agrega `http://localhost:5173`
      (y después la URL de producción, p. ej. `https://visitaspro.tudominio.com`).
   3. Copia el *Id. de aplicación (cliente)* y el *Id. de directorio (inquilino)* en `.env.local`:

```
VITE_API_URL=http://localhost:3000
VITE_AZURE_CLIENT_ID=<id de aplicación>
VITE_AZURE_TENANT_ID=<id del inquilino>
```

## Servidor (`server/`)

- Base de datos SQLite integrada en Node (`node:sqlite`), en `server/data/visitaspro.db`.
- Contraseñas guardadas con hash `scrypt`; sesiones con tokens JWT.
- Máximo 10 intentos fallidos de login cada 15 minutos por IP.
- Roles: `admin` y `user`. El **primer usuario** que se crea es administrador.
- `npm run create-user --prefix server -- <usuario> "<nombre>" [email] [--admin]` crea un usuario o
  cambia la contraseña de uno existente (conserva su rol).
- Los administradores gestionan usuarios desde la app, en **☰ → Usuarios**:
  crear, editar, cambiar contraseña, cambiar rol y activar/desactivar. Un usuario desactivado pierde
  el acceso de inmediato.
- `npm run seed-agents --prefix server -- [usuario]` carga agentes de ejemplo y asigna algunos al
  usuario indicado (por defecto, el primer administrador).

| Endpoint            | Descripción                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `POST /auth/login`  | `{ username, password }` → `{ token, user }`; `401` si no es válido  |
| `GET /auth/me`      | Con `Authorization: Bearer <token>` → `{ user }`                     |
| `GET /users`        | Lista de usuarios (solo admin)                                       |
| `POST /users`       | Crea un usuario (solo admin)                                         |
| `PATCH /users/:id`  | Edita nombre, correo, rol, activo o contraseña (solo admin)          |
| `GET /agents`       | Lista de agentes; `?mine=1` solo los asignados al usuario            |
| `GET /agents/:id`   | Información general de un agente                                     |
| `GET /agents/:id/assets` | Inventario de activos asignados al agente                       |
| `GET /agents/:id/visit-summary` | Totales de visitas del agente (completadas, pendientes, canceladas) |
| `GET /inventory/me` | Activos que anda cargando el asesor                               |
| `GET /inventory/advisors` | Asesores con su cantidad de activos (solo admin)            |
| `GET /inventory/users/:id` | Inventario de un asesor (admin o el propio usuario)        |
| `POST /inventory`   | Asigna un activo nuevo a un asesor (solo admin)                      |
| `GET /inventory/movements` | Historial de movimientos (`assetCode`, `agentId`, `advisorId`, `visitId`) |
| `GET /reports/monthly?month=AAAA-MM` | Reporte mensual (admin: `&userId=` de otro asesor)  |
| `GET /workdays?date=AAAA-MM-DD` | Inicio de labores del día                                |
| `POST /workdays`    | Registra el inicio de labores (una vez por día)                      |
| `POST /integrations/visits` | Crea visitas de instalación o retiro desde otra aplicación   |

### Integración: visitas de instalación y retiro

Las visitas de **instalación** y **retiro** no se crean desde la app: llegan desde otra aplicación.
En la app solo se pueden reprogramar e iniciar (el tipo no se puede cambiar ni se pueden cancelar).

```http
POST /integrations/visits
X-Api-Key: <INTEGRATION_API_KEY de server/.env>
Content-Type: application/json

{ "type": "instalacion", "agentCode": "AG-107", "username": "admin",
  "visitDate": "2026-10-15", "visitTime": "09:00" }
```

`type` es `instalacion` o `retiro`; `visitTime` es opcional. La visita se crea *Programada* para ese
asesor. `npm run seed-assigned-visits --prefix server -- [usuario]` crea visitas de ejemplo.

**Inventario:** cada activo está en un agente o lo anda cargando un asesor. En Hotline y Otros
soportes, "Activo Entra" se elige del inventario del asesor y "Activo Sale" del inventario del
agente. Al **finalizar** la visita se mueven solos: lo instalado pasa al agente (*instalado*) y lo
retirado pasa al asesor (*retirado*). `npm run seed-assets --prefix server` carga activos de ejemplo.
| `GET /visits`       | Filtros: `mine, from, to, status, type, city, agentCode, agentId`    |
| `POST /visits`      | `{ agentId, type, visitDate, visitTime?, status? }` registra visita  |
| `GET /visits/:id`   | Visita completa (con razón, observaciones, coordenadas y firma)      |
| `PATCH /visits/:id` | Cambia datos o estado (programada → en_proceso → cerrada)            |
| `GET /visits/:id/photos` | Lista de fotos de la visita                                     |
| `POST /visits/:id/photos` | Sube una foto (cuerpo = imagen JPG/PNG/WebP, máx. 10 MB, 10 fotos) |
| `GET /visits/:id/photos/:photoId` | Descarga una foto                                      |
| `DELETE /visits/:id/photos/:photoId` | Quita una foto (solo si la visita no está cerrada)  |

Para **finalizar** cualquier visita se necesitan coordenadas (tomadas al iniciar) y hora de fin.
Además, la visita comercial pide razón, sub razón y firma; la de PM (mantenimiento preventivo),
al menos 1 foto; Hotline y Otros soportes, caso de soporte, problema, solución y firma.
Hotline y Otros soportes comparten la pantalla por pasos (`SupportVisit.jsx`): caso de soporte →
cambio de equipo → observaciones y firma. Los datos propios de la
Hotline (caso y movimientos de equipo) se guardan en `form_data` (JSON). Los prefijos y activos de
ejemplo están en `src/visits/hotlineOptions.js`. Al cerrarla se actualiza
"Última visita comercial" o "Último PM" del agente. Las fotos se guardan en `server/data/photos/`.
Las razones y sub razones de cada tipo de visita se editan en `src/visits/reasons.js`.

**Sincronización manual** (botón "Sincronizar" en Inicio, Agentes y Perfil): envía lo pendiente
(visitas registradas sin conexión e inicio de labores) y descarga al dispositivo los agentes, las
visitas de los **últimos 3 meses** (y las próximas), el inventario del asesor y el de los agentes.
Nada se sincroniza solo. Las pantallas leen esa copia con o sin conexión; las visitas más antiguas
se consultan en vivo, solo con conexión. Lo que se guarda con conexión se envía en el momento y
se refleja también en la copia del dispositivo. `npm run seed-visits --prefix server -- [usuario]`
carga visitas de ejemplo en la semana actual.
| `GET /health`       | Comprobación de estado                                               |

En producción, agrega la URL de la PWA a `CORS_ORIGIN` en `server/.env`.

## Estructura

- `vite.config.js`: configuración de la PWA (manifest, caché de Workbox).
- `src/auth/`: login con usuario/contraseña (`localAuth.js`), Microsoft (`msal.js`) y el contexto de sesión.
- `src/components/LoginPage.jsx`: pantalla de inicio de sesión.
- `src/components/AgentsPage.jsx`: directorio de agentes (pantalla principal).
- `src/components/AppMenu.jsx`: menú lateral (☰) con navegación, instalar app y cerrar sesión.
- `src/components/UsersPage.jsx`: gestión de usuarios (solo administradores).
- `src/components/ReloadPrompt.jsx`: aviso de "lista sin conexión" y "nueva versión disponible".
- `src/hooks/useInstallPrompt.js`: botón para instalar la app.
- `src/hooks/useOnlineStatus.js`: indicador de conexión.
- `server/src/app.js`: rutas de la API; `server/src/db.js`: base de datos.
