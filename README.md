# RonaldCare

Plataforma operativa multi-sede para Casa Ronald McDonald enfocada en admisiones, recepción, hospedaje, lista de espera, seguimiento de estancia y coordinación interna del staff.

Hoy el proyecto funciona como un centro de control operativo con acceso unificado, separación por sede y una base de datos centralizada en Neon/PostgreSQL.

## Estado actual del producto

La app ya no usa una landing pública con selección de perfiles.

El flujo actual de entrada es:

1. `/login`
2. autenticación por correo y contraseña
3. redirección automática según rol

Roles operativos vigentes en la interfaz:

- `superadmin` -> visualizado como `Dirección Ejecutiva`
- `admin` -> visualizado como `Gerente de Sede`
- `staff` -> visualizado como `Staff / Operación`

La plataforma trabaja actualmente sobre estas sedes:

- Casa Ronald McDonald Ciudad de Mexico
- Casa Ronald McDonald Puebla
- Casa Ronald McDonald Tlalnepantla

## Qué hace hoy RonaldCare

### Dirección Ejecutiva / Gerente de Sede

- dashboard ejecutivo por sede o global
- panel administrativo
- gestión de usuarios internos
- activación de familias desde referencias
- automatización de estancia
- seguimiento de estancia
- recordatorios de salida
- gestión de tareas
- visibilidad de habitaciones y ocupación por sede

### Staff / Operación

- dashboard operativo
- admisiones con carga documental
- extracción automática de texto desde PDF o imagen
- recepción y activación de familias
- habitaciones y flujo automático de llegadas
- lista de espera
- solicitudes

## Stack tecnológico

### Frontend

- `React 19`
- `TypeScript`
- `Vite`
- `react-router-dom`
- `lucide-react`
- `recharts`
- `qrcode.react`
- `TailwindCSS`

### Backend

- `Node.js`
- API modular montada localmente desde `server.dev.js`
- endpoints organizados por dominio dentro de `api/`
- autenticación con `JWT`
- hash de contraseñas con `bcryptjs`

### OCR / extracción documental

- `tesseract.js`
- lectura de texto desde archivos cargados en `Admisiones`
- regex para extraer datos logísticos como:
  - nombre del menor
  - edad
  - hospital
  - médico referente
  - tutor
  - teléfonos
  - fecha programada

### Base de datos

- `PostgreSQL`
- `Neon` como proveedor cloud
- conexión desde backend con `pg`

## Cómo se maneja la base de datos

La app no conecta el frontend directo a la base.

El flujo real es:

1. el frontend llama endpoints `/api/...`
2. el backend valida token, rol y sede
3. el backend consulta o actualiza PostgreSQL en Neon
4. la respuesta vuelve al frontend ya filtrada por permisos

### Tipo de base de datos

La base de datos de RonaldCare es:

- `SQL`
- `relacional`
- `PostgreSQL`

No es una base NoSQL.

### Por qué se eligió Neon

Se eligió Neon porque:

- permite usar PostgreSQL administrado en la nube
- encaja bien con datos altamente relacionados
- simplifica conexión con una sola `DATABASE_URL`
- facilita trabajar con varias sedes en una sola plataforma
- es práctico para un proyecto multi-módulo con consultas relacionales

En este proyecto conviene una base relacional porque existen relaciones fuertes entre:

- usuarios
- roles
- sedes
- referencias
- familias
- habitaciones
- tareas
- solicitudes
- notificaciones

## Multi-sede: cómo funciona

La app usa un esquema centralizado con separación por sede mediante un identificador único para cada casa.

Eso significa que:

- la información se separa por sede
- los permisos se validan por rol y sede
- Dirección Ejecutiva puede ver más de una sede
- Gerente de Sede queda restringido a su sede
- Staff trabaja con la sede operativa correspondiente

### Importante

Hoy las sedes son:

- independientes a nivel de datos lógicos
- no independientes a nivel de infraestructura

Ejemplo:

- si una sede pierde internet local, las otras pueden seguir
- si falla el backend central o Neon, sí puede afectar a todas

## Arquitectura actual

```text
Frontend React/TS (Vite)
        |
        v
Cliente API en src/lib/api.ts
        |
        v
Backend Node con endpoints /api/... en server.dev.js
        |
        v
PostgreSQL relacional en Neon
```

## Rutas principales vigentes

### Acceso

- `/login`

### Dirección Ejecutiva

- `/admin/dashboard`
- `/admin/panel`
- `/tasks`

### Gerente de Sede

- `/gerente/dashboard`
- `/admin/panel`
- `/tasks`

### Staff / Operación

- `/staff/home`
- `/staff/admissions`
- `/staff/waitlist`
- `/staff/reception`
- `/staff/rooms`
- `/staff/requests`

## Módulos actuales

### 1. Admisiones

Ubicación:

- [C:\Users\pachi\Documents\New project\src\pages\staff\StaffEntriesPage.tsx](C:\Users\pachi\Documents\New project\src\pages\staff\StaffEntriesPage.tsx)

Funciones:

- carga de PDF o imagen
- extracción automática de texto
- formulario en 3 pasos
- captura de datos logísticos
- creación de referencia en estado `referencia`
- integración con lista de espera si no hay cupo

### 2. Recepción

Ubicación:

- [C:\Users\pachi\Documents\New project\src\pages\staff\StaffReceptionPage.tsx](C:\Users\pachi\Documents\New project\src\pages\staff\StaffReceptionPage.tsx)

Funciones:

- activación de familia
- validación de acceso operativo

### 3. Habitaciones

Ubicación:

- [C:\Users\pachi\Documents\New project\src\pages\staff\StaffRoomsPage.tsx](C:\Users\pachi\Documents\New project\src\pages\staff\StaffRoomsPage.tsx)

Funciones:

- visualización de cuartos por sede
- estados de habitación
- ocupación
- flujo automático de llegadas
- check-out operativo
- apoyo de staff por sede

### 4. Lista de Espera

Ubicación:

- [C:\Users\pachi\Documents\New project\src\pages\staff\StaffWaitlistPage.tsx](C:\Users\pachi\Documents\New project\src\pages\staff\StaffWaitlistPage.tsx)

Funciones:

- familias aprobadas sin habitación
- prioridad por antigüedad
- asignación manual de cuarto cuando se libera cupo

### 5. Gestión de Tareas

Ubicación:

- [C:\Users\pachi\Documents\New project\src\pages\tasks\TaskManagementPage.tsx](C:\Users\pachi\Documents\New project\src\pages\tasks\TaskManagementPage.tsx)

Funciones:

- creación de tareas por sede
- tablero por estado:
  - pendientes
  - en curso
  - finalizadas
- asignación a staff o gerente de la sede permitida
- muro lógico por sede

### 6. Dashboard Ejecutivo

Ubicación:

- [C:\Users\pachi\Documents\New project\src\pages\admin\ExecutiveDashboardPage.tsx](C:\Users\pachi\Documents\New project\src\pages\admin\ExecutiveDashboardPage.tsx)

Funciones:

- resumen ejecutivo
- prioridades del día
- habitaciones por sede
- salidas próximas
- accesos rápidos
- notificaciones recientes

### 7. Panel admin

Ubicación:

- [C:\Users\pachi\Documents\New project\src\pages\admin\AdminPanelPage.tsx](C:\Users\pachi\Documents\New project\src\pages\admin\AdminPanelPage.tsx)

Funciones:

- gestión de usuarios internos
- activación de familias
- automatización de estancias
- seguimiento de estancia
- recordatorios
- búsqueda interna y panel operativo detallado

## Autenticación y roles

### Cómo funciona el login

1. el usuario entra a `/login`
2. envía correo y contraseña
3. el frontend llama `POST /api/auth/login`
4. el backend valida usuario, rol, sede y contraseña
5. genera JWT
6. el frontend guarda sesión y redirige según rol

### Mapeo visible de roles

- `superadmin` -> `Dirección Ejecutiva`
- `admin` -> `Gerente de Sede`
- `staff` -> `Staff / Operación`

### Archivos clave de autenticación

- [C:\Users\pachi\Documents\New project\api\auth\login.js](C:\Users\pachi\Documents\New project\api\auth\login.js)
- [C:\Users\pachi\Documents\New project\api\auth\me.js](C:\Users\pachi\Documents\New project\api\auth\me.js)
- [C:\Users\pachi\Documents\New project\src\components\auth\RequireRole.tsx](C:\Users\pachi\Documents\New project\src\components\auth\RequireRole.tsx)
- [C:\Users\pachi\Documents\New project\src\lib\roleRouting.ts](C:\Users\pachi\Documents\New project\src\lib\roleRouting.ts)

## Endpoints clave

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/change-password`
- `PATCH /api/auth/change-pin`

### Admisiones

- `GET /api/admissions`
- `POST /api/admissions`
- `PATCH /api/admissions`
- `POST /api/admissions/extract`
- `GET /api/admissions/clinical-history`
- `GET /api/admissions/departure-reminders`

### Admin

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users`
- `DELETE /api/admin/users`
- `GET /api/admin/pending-referrals`
- `POST /api/admin/activate-family`
- `GET /api/admin/family-stays`
- `PATCH /api/admin/family-stays`

### Staff / Operación

- `GET /api/staff/dashboard`
- `GET /api/staff/roster`
- `GET /api/staff/tasks`
- `POST /api/staff/tasks`
- `PATCH /api/staff/tasks`
- `GET /api/staff/rooms`
- `PATCH /api/staff/rooms`
- `GET /api/staff/arrival-flow`
- `POST /api/staff/arrival-flow`
- `PATCH /api/staff/rooms/release`

### Solicitudes

- `GET /api/requests`
- `POST /api/requests`
- `PATCH /api/requests/assign`
- `PATCH /api/requests/resolve`
- `PATCH /api/requests/status`

### Notificaciones

- `GET /api/notifications`
- `PATCH /api/notifications`

### Health

- `GET /api/health`

## Variables de entorno

Ejemplo:

```env
NODE_ENV=development
PORT=8787
JWT_SECRET=change_me_before_production
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
VITE_API_URL=http://localhost:8787/api
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar `.env`

Copia `.env.example` a `.env` y completa:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`

### 3. Crear schema y seed

```bash
npm run db:setup
```

O por separado:

```bash
npm run db:schema
npm run db:seed
```

## Ejecución local

### Frontend

```bash
npm run dev:client
```

Disponible en:

- [http://localhost:5173](http://localhost:5173)

### Backend

```bash
npm run dev:server
```

Disponible en:

- [http://localhost:8787](http://localhost:8787)

### Build

```bash
npm run build
```

## Scripts disponibles

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run lint
npm run preview
npm run seed:hash
npm run db:schema
npm run db:seed
npm run db:setup
```

## Recomendaciones técnicas de evolución

### 1. Mantener arquitectura central multi-sede

Es la evolución más realista desde el estado actual:

- un frontend
- un backend
- una base central en Neon
- separación por sede mediante identificador único

### 2. Convertir permisos a sistema configurable

La siguiente mejora importante es dejar de depender tanto de cambios en código para roles y permisos.

Idealmente habría que evolucionar a:

- `roles`
- `permissions`
- `role_permissions`
- administración de permisos desde panel interno

Así el encargado de sistemas podría ajustar permisos sin depender siempre de desarrollo externo.

## Seguridad

- nunca subir `.env`
- nunca subir `DATABASE_URL` real
- nunca subir secretos JWT de producción
