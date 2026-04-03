import dotenv from 'dotenv'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

dotenv.config()

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const target = process.argv[2]

if (!target) {
  console.error('Uso: node scripts/run-pg-sql.js <ruta-del-sql>')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL no esta configurada')
  process.exit(1)
}

const filePath = path.resolve(__dirname, '..', target)
const sql = await fs.readFile(filePath, 'utf8')
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(sql)
  console.log(`SQL ejecutado correctamente: ${target}`)
} catch (error) {
  console.error(`Error ejecutando ${target}`)
  console.error(error)
  process.exitCode = 1
} finally {
  await client.end()
}
