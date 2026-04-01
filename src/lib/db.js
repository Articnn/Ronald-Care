import dotenv from 'dotenv'
import sql from 'mssql/msnodesqlv8.js'

dotenv.config()

let poolPromise = null

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  return String(value).toLowerCase() === 'true'
}

function getLocalDbPipe() {
  return process.env.SQL_LOCALDB_PIPE?.trim()
}

function resolveServer() {
  const localDbInstance = process.env.SQL_LOCALDB_INSTANCE?.trim()
  if (localDbInstance) {
    return '(localdb)'
  }

  const configuredServer = process.env.SQL_SERVER?.trim()
  if (configuredServer?.toLowerCase().startsWith('np:')) {
    throw new Error(
      'No uses el pipe dinamico de LocalDB en SQL_SERVER. Configura SQL_LOCALDB_INSTANCE=MentorLink para usar Windows Authentication.'
    )
  }

  return configuredServer || 'localhost'
}

function buildConnectionString({ server, database, trustedConnection }) {
  const driverName = process.env.SQL_ODBC_DRIVER || 'ODBC Driver 17 for SQL Server'
  const parts = [
    `Driver={${driverName}}`,
    `Server=${server}`,
    `Database=${database}`,
    `Trusted_Connection=${trustedConnection ? 'Yes' : 'No'}`
  ]

  if (!trustedConnection) {
    if (process.env.SQL_USER) parts.push(`Uid=${process.env.SQL_USER}`)
    if (process.env.SQL_PASSWORD) parts.push(`Pwd=${process.env.SQL_PASSWORD}`)
  }

  return `${parts.join(';')};`
}

function getConfig() {
  const localDbPipe = getLocalDbPipe()
  const server = resolveServer()
  const localDbInstance = process.env.SQL_LOCALDB_INSTANCE?.trim()
  const trustedConnection = readBoolean(process.env.SQL_TRUSTED_CONNECTION, true)
  const database = process.env.SQL_DATABASE || 'RonaldCareOps'

  if (localDbPipe) {
    return {
      connectionString: buildConnectionString({
        server: localDbPipe,
        database,
        trustedConnection
      }),
      driver: 'msnodesqlv8',
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000
      }
    }
  }

  return {
    server,
    database,
    driver: 'msnodesqlv8',
    user: trustedConnection ? undefined : process.env.SQL_USER,
    password: trustedConnection ? undefined : process.env.SQL_PASSWORD,
    port: localDbInstance ? undefined : Number(process.env.SQL_PORT || 1433),
    options: {
      encrypt: readBoolean(process.env.SQL_ENCRYPT, false),
      trustServerCertificate: readBoolean(process.env.SQL_TRUST_CERT, true),
      trustedConnection,
      instanceName: localDbInstance || undefined,
      enableArithAbort: true
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

export async function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(getConfig())
    poolPromise = pool.connect().catch((error) => {
      poolPromise = null
      throw error
    })
  }
  return poolPromise
}

export async function withTransaction(work) {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  await transaction.begin()

  try {
    const result = await work(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export { sql }
