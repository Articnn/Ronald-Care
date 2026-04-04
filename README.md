# RonaldCare Ops Suite

Plataforma no clinica para Casa Ronald enfocada en referencias, check-in, solicitudes, transporte AM/PM, voluntariado, inventario, kiosko familiar y portal de transparencia para donantes.

## Stack

- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Node.js serverless-style API + `pg`
- Base de datos: PostgreSQL en Neon

## Estructura del repo

```text
.
|-- api/                     # funciones serverless por dominio
|-- scripts/                 # utilidades de soporte
|-- sql/                     # schema + seed de PostgreSQL
|-- src/                     # frontend React y librerias compartidas del backend
|   |-- components/
|   |-- context/
|   |-- data/
|   |-- lib/                 # utilidades backend (db, auth, http, audit, etc.)
|   |-- pages/
|   `-- ...
|-- server.dev.js            # servidor local para probar API
|-- .env.example
|-- package.json
`-- README.md
```

## Setup rapido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crear `.env` tomando como base `.env.example` y definir:

```env
VITE_API_URL=http://localhost:8787/api
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=...
```

### 3. Crear schema y seed en Neon

```bash
npm run db:schema
npm run db:seed
```

O en un solo paso:

```bash
npm run db:setup
```

## Correr el proyecto

### Frontend

```bash
npm run dev:client
```

Frontend: [http://localhost:5173](http://localhost:5173)

### Backend local

```bash
npm run dev:server
```

API local: `http://localhost:8787`

### Build frontend

```bash
npm run build
```

## Usuarios demo

- `hospital@ronaldcare.demo` / `Demo123!`
- `staff@ronaldcare.demo` / `Demo123!`
- `volunteer@ronaldcare.demo` / `Demo123!`

Familias:

- `QR-FAM-3481` o `TKT-3481` con PIN `Family3481!`
- `QR-FAM-5520` o `TKT-5520` con PIN `Family5520!`
- `QR-FAM-7781` o `TKT-7781` con PIN `Family5520!`

## Verificaciones utiles

```bash
curl http://localhost:8787/api/health
```

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@ronaldcare.demo","password":"Demo123!"}'
```

## Git recomendado

- `main`: estable / entregable
- `dev`: integracion
- `feature/<modulo>`: trabajo por funcionalidad

## Seguridad para repo publico

- Nunca subir `.env`
- Nunca subir `DATABASE_URL` real
- Nunca subir contrasenas reales
- Usar solo datos demo / mock
- Mantener donor con datos agregados sin PII
