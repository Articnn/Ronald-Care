import { getPool } from './db.js'

let ensurePromise = null

export async function ensureVolunteerManagementSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const pool = await getPool()

      await pool.query(`
        CREATE TABLE IF NOT EXISTS appnotifications (
          notificationid SERIAL PRIMARY KEY,
          siteid INTEGER REFERENCES sites(siteid),
          userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
          type VARCHAR(40) NOT NULL,
          title VARCHAR(160) NOT NULL,
          message VARCHAR(255) NOT NULL,
          relatedentitytype VARCHAR(50),
          relatedentityid INTEGER,
          isread BOOLEAN NOT NULL DEFAULT FALSE,
          createdat TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await pool.query(`
        ALTER TABLE volunteershifts
        ADD COLUMN IF NOT EXISTS workdays TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS starttime VARCHAR(5) NOT NULL DEFAULT '08:00',
        ADD COLUMN IF NOT EXISTS endtime VARCHAR(5) NOT NULL DEFAULT '14:00',
        ADD COLUMN IF NOT EXISTS shiftlabel VARCHAR(20) NOT NULL DEFAULT 'manana'
      `)

      await pool.query(`
        ALTER TABLE volunteerchangerequests
        ADD COLUMN IF NOT EXISTS requestedrolename VARCHAR(40),
        ADD COLUMN IF NOT EXISTS requestedworkdays VARCHAR(120),
        ADD COLUMN IF NOT EXISTS requestedstarttime VARCHAR(5),
        ADD COLUMN IF NOT EXISTS requestedendtime VARCHAR(5),
        ADD COLUMN IF NOT EXISTS requestedshiftlabel VARCHAR(20)
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_appnotifications_userid_isread_createdat
        ON appnotifications(userid, isread, createdat DESC)
      `)
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }

  return ensurePromise
}
