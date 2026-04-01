# RonaldCare Ops Suite

Plataforma no clinica para Casa Ronald enfocada en referencias, check-in, solicitudes, transporte AM/PM, voluntariado, inventario, kiosko familiar y portal de transparencia para donantes.

## Stack

- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Node.js serverless-style API + `mssql`
- Base de datos: SQL Server

## Estructura del repo

```text
.
├─ api/                     # funciones serverless por dominio
├─ scripts/                 # utilidades de soporte
├─ sql/                     # schema + seed de SQL Server
├─ src/                     # frontend React y librerias compartidas del backend
│  ├─ components/
│  ├─ context/
│  ├─ data/
│  ├─ lib/                  # utilidades backend (db, auth, http, audit, etc.)
│  ├─ pages/
│  └─ ...
├─ server.dev.js            # servidor local para probar API
├─ .env.example
├─ package.json
└─ README.md
```

## Setup rapido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crear `.env` tomando como base `.env.example`.

### 3. Crear base de datos

Ejecutar:

1. `sql/001_schema.sql`
2. `sql/002_seed.sql`

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

## Git recomendado

- `main`: estable / entregable
- `dev`: integracion
- `feature/<modulo>`: trabajo por funcionalidad

## Primer commit limpio

1. Confirmar que `.env` no este versionado.
2. Confirmar que `node_modules/` y `dist/` no aparezcan en `git status`.
3. Hacer commit de schema, seed, backend y frontend juntos.

## Seguridad para repo publico

- Nunca subir `.env`
- Nunca subir cadenas de conexion reales
- Nunca subir contrasenas reales
- Usar solo datos demo / mock
- Mantener donor con datos agregados sin PII
