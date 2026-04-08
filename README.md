# RonaldCare Ops Suite

Plataforma operativa no clinica multi-sede para Casa Ronald McDonald.

RonaldCare centraliza referencias, activacion de familias, hospedaje, check-in, habitaciones, solicitudes, viajes, voluntariado, inventario, kiosko asistido y transparencia para donantes, con una sola base de datos compartida en la nube.

## Objetivo

El proyecto esta pensado para operar logistica no clinica en tres sedes:

- Casa Ronald McDonald Ciudad de Mexico
- Casa Ronald McDonald Puebla
- Casa Ronald McDonald Tlalnepantla

El sistema soporta estos perfiles:

- `superadmin`
- `admin`
- `hospital`
- `staff`
- `volunteer`
- `family`
- `donor` (publico, sin login)

## Stack Tecnologico

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
- API estilo serverless montada en `server.dev.js`
- Endpoints por dominio dentro de `api/`
- Autenticacion con `JWT`
- Hash de contrasenas y PIN con `bcryptjs`

### Base de Datos

- `PostgreSQL`
- `Neon` como proveedor cloud
- Conexion desde backend con `pg`

## Como se maneja la base de datos

La app no conecta el frontend directo a la base de datos.

El flujo es este:

1. El frontend llama endpoints como `/api/auth/login`, `/api/requests`, `/api/staff/rooms`, etc.
2. El backend valida permisos, rol y sede.
3. El backend consulta o actualiza PostgreSQL en Neon.
4. La informacion vuelve al frontend ya filtrada por sede y permisos.

### Archivos clave de DB

- [C:\Users\pachi\Documents\New project\src\lib\db.js](C:\Users\pachi\Documents\New project\src\lib\db.js): pool de conexion a PostgreSQL
- [C:\Users\pachi\Documents\New project\sql\001_schema.sql](C:\Users\pachi\Documents\New project\sql\001_schema.sql): schema completo
- [C:\Users\pachi\Documents\New project\sql\002_seed.sql](C:\Users\pachi\Documents\New project\sql\002_seed.sql): datos demo iniciales
- [C:\Users\pachi\Documents\New project\scripts\run-pg-sql.js](C:\Users\pachi\Documents\New project\scripts\run-pg-sql.js): runner para ejecutar SQL contra Neon

## Arquitectura del repo

```text
.
|-- api/                     # endpoints del backend por dominio
|-- scripts/                 # utilidades de soporte
|-- sql/                     # schema y seed PostgreSQL
|-- src/
|   |-- components/          # UI reutilizable
|   |-- context/             # AppContext y estado global
|   |-- data/                # datos visuales locales no operativos donde aun existan
|   |-- lib/                 # utilidades frontend y backend compartidas
|   |-- pages/               # vistas por rol/modulo
|   `-- types.ts             # tipos principales del frontend
|-- server.dev.js            # servidor local de la API
|-- .env.example
|-- package.json
`-- README.md
```

## Variables de entorno

Usa este archivo base:

- [C:\Users\pachi\Documents\New project\.env.example](C:\Users\pachi\Documents\New project\.env.example)

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

Importante:

- No subir `.env`
- No subir `DATABASE_URL` real
- No subir secretos JWT reales

## Instalacion

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar `.env`

Copia `.env.example` a `.env` y completa la conexion a Neon y el `JWT_SECRET`.

### 3. Crear schema y seed en Neon

```bash
npm run db:schema
npm run db:seed
```

O en un solo paso:

```bash
npm run db:setup
```

## Ejecutar el proyecto

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

## Modulos principales

### Publico / Donor

- landing publica por sede
- transparencia completa
- impacto por sede
- galeria de impacto
- proximos eventos

### Hospital

- creacion de referencias
- seguimiento de referencia

### Admin / Superadmin

- gestion de usuarios internos
- activacion de familia desde referencia
- generacion de QR y PIN
- pausa y reactivacion de acceso familiar
- automatizacion de estancia y asignacion de habitacion

### Staff

- dashboard operativo
- recepcion
- ayuda asistida / kiosko
- habitaciones
- flujo automatico de llegadas
- solicitudes
- viajes
- inventario
- analitica

### Volunteer

- tareas del dia
- historial de tareas
- horario y rol operativo
- alertas y notificaciones
- solicitudes de cambio
- reportes operativos por area

### Family

- login por QR o ticket + PIN
- estatus familiar
- solicitudes
- viajes
- comunidad
- cambio de PIN

## Endpoints locales utiles

### Health

```bash
curl http://localhost:8787/api/health
```

### Login staff

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@ronaldcare.demo","password":"Demo123!"}'
```

### Login admin

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ronaldcare.demo","password":"Admin123!"}'
```

### Login familia

```bash
curl -X POST http://localhost:8787/api/auth/family-access \
  -H "Content-Type: application/json" \
  -d '{"code":"QR-FAM-3481","pin":"Family3481!"}'
```

## Credenciales demo

### Internos

- `superadmin@ronaldcare.demo` / `Admin123!`
- `admin@ronaldcare.demo` / `Admin123!`
- `hospital@ronaldcare.demo` / `Demo123!`
- `staff@ronaldcare.demo` / `Demo123!`
- `volunteer@ronaldcare.demo` / `Demo123!`

### Familias

- `QR-FAM-3481` o `TKT-3481` / `Family3481!`
- `QR-FAM-5520` o `TKT-5520` / `Family5520!`
- `QR-FAM-7781` o `TKT-7781` / `Family5520!`

## Que ya funciona con backend real

- login interno con JWT
- login de familia con QR/PIN
- sesion persistente
- panel admin
- activacion de familias
- QR/PIN familiar
- voluntariado con tareas, reasignacion y notificaciones
- dashboard staff
- solicitudes
- viajes
- donor/transparencia por sede
- habitaciones con incidencias, limpieza y automatizacion base
- inventario base con datos reales
- comunidad con persistencia en DB

## Flujo multi-sede

La app esta construida con filtrado por `SiteId`.

Eso permite:

- ver informacion por sede seleccionada
- restringir usuarios a su sede
- operar CDMX, Puebla y Tlalnepantla con una sola app
- mantener una DB centralizada y compartida

## Recomendacion de ramas

- `main`: estable / entregable
- `dev`: integracion del equipo
- `feature/<modulo>`: trabajo por funcionalidad

## Seguridad para repo publico

- Nunca subir `.env`
- Nunca subir `DATABASE_URL` real
- Nunca subir credenciales reales
- Nunca subir secretos JWT de produccion
- Mantener los datos de familias anonimizados en demo
- Donor debe mostrar solo datos agregados, no PII

## Siguiente paso recomendado

Si se quiere llevar a demo multi-dispositivo o produccion, el siguiente paso es:

1. desplegar frontend
2. desplegar backend
3. mantener Neon como DB centralizada
4. ejecutar pruebas E2E por rol

---

Si este README se comparte con el equipo, lo ideal es que todos usen el mismo `schema`, el mismo `seed` y la misma base central en Neon para ver los mismos datos en tiempo real.
