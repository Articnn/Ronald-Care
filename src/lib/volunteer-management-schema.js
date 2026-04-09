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
        ALTER TABLE volunteershifts
        DROP CONSTRAINT IF EXISTS volunteershifts_rolename_check
      `)

      await pool.query(`
        ALTER TABLE volunteershifts
        ADD CONSTRAINT volunteershifts_rolename_check
        CHECK (rolename IN ('traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia', 'limpieza'))
      `).catch(() => {})

      await pool.query(`
        ALTER TABLE volunteerchangerequests
        ADD COLUMN IF NOT EXISTS requestedrolename VARCHAR(40),
        ADD COLUMN IF NOT EXISTS requestedworkdays VARCHAR(120),
        ADD COLUMN IF NOT EXISTS requestedstarttime VARCHAR(5),
        ADD COLUMN IF NOT EXISTS requestedendtime VARCHAR(5),
        ADD COLUMN IF NOT EXISTS requestedshiftlabel VARCHAR(20)
      `)

      await pool.query(`
        ALTER TABLE volunteerchangerequests
        DROP CONSTRAINT IF EXISTS volunteerchangerequests_requestedrolename_check
      `)

      await pool.query(`
        ALTER TABLE volunteerchangerequests
        ADD CONSTRAINT volunteerchangerequests_requestedrolename_check
        CHECK (requestedrolename IS NULL OR requestedrolename IN ('traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia', 'limpieza'))
      `).catch(() => {})

      await pool.query(`
        CREATE TABLE IF NOT EXISTS staffprofiles (
          staffprofileid SERIAL PRIMARY KEY,
          siteid INTEGER NOT NULL REFERENCES sites(siteid),
          userid INTEGER NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
          workarea VARCHAR(40) NOT NULL,
          workdays TEXT NOT NULL DEFAULT '',
          starttime VARCHAR(5) NOT NULL DEFAULT '08:00',
          endtime VARCHAR(5) NOT NULL DEFAULT '16:00',
          shiftperiod VARCHAR(20) NOT NULL DEFAULT 'AM',
          shiftlabel VARCHAR(20) NOT NULL DEFAULT 'manana',
          availabilitystatus VARCHAR(30) NOT NULL DEFAULT 'disponible',
          hourslogged NUMERIC(5,2) NOT NULL DEFAULT 0,
          createdat TIMESTAMP NOT NULL DEFAULT NOW(),
          updatedat TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await pool.query(`
        ALTER TABLE rooms
        ADD COLUMN IF NOT EXISTS roomtype VARCHAR(20) NOT NULL DEFAULT 'normal',
        ADD COLUMN IF NOT EXISTS availableat TIMESTAMP,
        ADD COLUMN IF NOT EXISTS roomnote VARCHAR(255),
        ADD COLUMN IF NOT EXISTS roomstatus VARCHAR(20) NOT NULL DEFAULT 'disponible'
      `)

      await pool.query(`
        ALTER TABLE families
        ADD COLUMN IF NOT EXISTS plannedroomid INTEGER REFERENCES rooms(roomid),
        ADD COLUMN IF NOT EXISTS staydays INTEGER NOT NULL DEFAULT 3,
        ADD COLUMN IF NOT EXISTS plannedcheckoutdate DATE,
        ADD COLUMN IF NOT EXISTS automationstatus VARCHAR(30) NOT NULL DEFAULT 'pendiente'
      `)

      await pool.query(`
        ALTER TABLE referrals
        ADD COLUMN IF NOT EXISTS admissionstage VARCHAR(30) NOT NULL DEFAULT 'referencia',
        ADD COLUMN IF NOT EXISTS childname VARCHAR(120),
        ADD COLUMN IF NOT EXISTS diagnosis VARCHAR(255),
        ADD COLUMN IF NOT EXISTS originhospital VARCHAR(160),
        ADD COLUMN IF NOT EXISTS origincity VARCHAR(100),
        ADD COLUMN IF NOT EXISTS requesttemplatejson TEXT,
        ADD COLUMN IF NOT EXISTS socialworkername VARCHAR(120),
        ADD COLUMN IF NOT EXISTS familycontactphone VARCHAR(40),
        ADD COLUMN IF NOT EXISTS dossiersummary TEXT,
        ADD COLUMN IF NOT EXISTS assignedsiteid INTEGER REFERENCES sites(siteid),
        ADD COLUMN IF NOT EXISTS reservedroomid INTEGER REFERENCES rooms(roomid),
        ADD COLUMN IF NOT EXISTS approvedat TIMESTAMP,
        ADD COLUMN IF NOT EXISTS waitlistenteredat TIMESTAMP,
        ADD COLUMN IF NOT EXISTS transporteventready BOOLEAN NOT NULL DEFAULT FALSE
      `)

      await pool.query(`
        ALTER TABLE referrals
        DROP CONSTRAINT IF EXISTS referrals_admissionstage_check
      `)

      await pool.query(`
        ALTER TABLE referrals
        ADD CONSTRAINT referrals_admissionstage_check
        CHECK (admissionstage IN ('referencia', 'borrador_extraido', 'expediente_armado', 'aprobada', 'lista_espera'))
      `).catch(() => {})

      await pool.query(`
        CREATE TABLE IF NOT EXISTS seguimiento_clinico (
          followupid SERIAL PRIMARY KEY,
          familyid INTEGER NOT NULL REFERENCES families(familyid) ON DELETE CASCADE,
          referralid INTEGER REFERENCES referrals(referralid) ON DELETE SET NULL,
          requestid INTEGER REFERENCES requests(requestid) ON DELETE SET NULL,
          siteid INTEGER NOT NULL REFERENCES sites(siteid),
          recordedbyuserid INTEGER REFERENCES users(userid),
          clinicname VARCHAR(160),
          feedbackmessage TEXT NOT NULL,
          previouscheckoutdate DATE,
          estimatedcheckoutdate DATE,
          recordedat TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS stafftasks (
          stafftaskid SERIAL PRIMARY KEY,
          siteid INTEGER NOT NULL REFERENCES sites(siteid),
          referralid INTEGER REFERENCES referrals(referralid) ON DELETE SET NULL,
          familyid INTEGER REFERENCES families(familyid) ON DELETE SET NULL,
          assigneduserid INTEGER REFERENCES users(userid),
          createdbyuserid INTEGER REFERENCES users(userid),
          title VARCHAR(160) NOT NULL,
          instructions TEXT NOT NULL,
          duedate DATE,
          priority VARCHAR(20) NOT NULL DEFAULT 'media',
          suggestedroomcode VARCHAR(20),
          status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
          createdat TIMESTAMP NOT NULL DEFAULT NOW(),
          updatedat TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await pool.query(`
        ALTER TABLE stafftasks
        ADD COLUMN IF NOT EXISTS duedate DATE,
        ADD COLUMN IF NOT EXISTS suggestedroomcode VARCHAR(20)
      `)

      await pool.query(`
        ALTER TABLE families
        ADD COLUMN IF NOT EXISTS departureremindersentat TIMESTAMP
      `)

      await pool.query(`
        ALTER TABLE rooms
        DROP CONSTRAINT IF EXISTS rooms_roomstatus_check
      `)

      await pool.query(`
        ALTER TABLE rooms
        ADD CONSTRAINT rooms_roomstatus_check
        CHECK (roomstatus IN ('disponible', 'ocupada', 'reservada', 'mantenimiento'))
      `).catch(() => {})

      await pool.query(`
        ALTER TABLE inventoryitems
        ADD COLUMN IF NOT EXISTS itemcategory VARCHAR(20) NOT NULL DEFAULT 'kit',
        ADD COLUMN IF NOT EXISTS expirydate DATE
      `)

      await pool.query(`
        ALTER TABLE inventoryitems
        DROP CONSTRAINT IF EXISTS inventoryitems_itemcategory_check
      `)

      await pool.query(`
        ALTER TABLE inventoryitems
        ADD CONSTRAINT inventoryitems_itemcategory_check
        CHECK (itemcategory IN ('kit', 'cocina', 'limpieza', 'otro'))
      `).catch(() => {})

      await pool.query(`
        ALTER TABLE volunteertasks
        ADD COLUMN IF NOT EXISTS relatedroomid INTEGER REFERENCES rooms(roomid)
      `)

      await pool.query(`
        ALTER TABLE requests
        ADD COLUMN IF NOT EXISTS referralid INTEGER REFERENCES referrals(referralid) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS documentoreferenciaurl VARCHAR(255)
      `)

      await pool.query(`
        ALTER TABLE requests
        ALTER COLUMN familyid DROP NOT NULL
      `).catch(() => {})

      await pool.query(`
        ALTER TABLE requests
        DROP CONSTRAINT IF EXISTS requests_status_check
      `)

      await pool.query(`
        ALTER TABLE requests
        ADD CONSTRAINT requests_status_check
        CHECK (status IN ('referencia', 'borrador_extraido', 'nueva', 'asignada', 'en_proceso', 'resuelta'))
      `).catch(() => {})

      await pool.query(`
        CREATE TABLE IF NOT EXISTS inventoryreports (
          inventoryreportid SERIAL PRIMARY KEY,
          siteid INTEGER NOT NULL REFERENCES sites(siteid),
          volunteeruserid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
          itemcategory VARCHAR(20) NOT NULL,
          title VARCHAR(160) NOT NULL,
          detail VARCHAR(500) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
          createdat TIMESTAMP NOT NULL DEFAULT NOW(),
          updatedat TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      await pool.query(`
        ALTER TABLE inventoryreports
        DROP CONSTRAINT IF EXISTS inventoryreports_itemcategory_check
      `)

      await pool.query(`
        ALTER TABLE inventoryreports
        ADD CONSTRAINT inventoryreports_itemcategory_check
        CHECK (itemcategory IN ('kit', 'cocina', 'limpieza', 'lavanderia', 'recepcion'))
      `).catch(() => {})

      await pool.query(`
        ALTER TABLE inventoryreports
        DROP CONSTRAINT IF EXISTS inventoryreports_status_check
      `)

      await pool.query(`
        ALTER TABLE inventoryreports
        ADD CONSTRAINT inventoryreports_status_check
        CHECK (status IN ('pendiente', 'atendido'))
      `).catch(() => {})

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_appnotifications_userid_isread_createdat
        ON appnotifications(userid, isread, createdat DESC)
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_staffprofiles_siteid_workarea
        ON staffprofiles(siteid, workarea)
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_stafftasks_site_status_createdat
        ON stafftasks(siteid, status, createdat DESC)
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_rooms_site_roomtype
        ON rooms(siteid, roomtype)
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_families_site_checkoutstatus
        ON families(siteid, plannedcheckoutdate, automationstatus)
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_referrals_stage_site
        ON referrals(admissionstage, COALESCE(assignedsiteid, siteid))
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_referrals_waitlistenteredat
        ON referrals(waitlistenteredat, COALESCE(assignedsiteid, siteid))
      `)

      await pool.query(`
        INSERT INTO rooms (siteid, roomcode, capacity, roomtype, occupiedcount, roomstatus, isactive, createdat)
        SELECT 3, roomcode, 2, 'normal', 0, 'disponible', TRUE, NOW()
        FROM (
          VALUES
            ('TLA-N6'),
            ('TLA-N7'),
            ('TLA-N8'),
            ('TLA-N9'),
            ('TLA-N10'),
            ('TLA-N11'),
            ('TLA-N12')
        ) AS seed(roomcode)
        WHERE EXISTS (SELECT 1 FROM sites WHERE siteid = 3)
          AND NOT EXISTS (
            SELECT 1 FROM rooms r WHERE r.siteid = 3 AND r.roomcode = seed.roomcode
          )
      `)

      await pool.query(`
        INSERT INTO users (siteid, roleid, fullname, email, passwordhash, isactive, createdat, updatedat)
        SELECT 3, 4, 'Staff Operativo', 'staff.tla@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW(), NOW()
        WHERE EXISTS (SELECT 1 FROM sites WHERE siteid = 3)
          AND EXISTS (SELECT 1 FROM roles WHERE roleid = 4 AND rolecode = 'staff')
          AND NOT EXISTS (
            SELECT 1
            FROM users
            WHERE siteid = 3
              AND LOWER(email) = 'staff.tla@ronaldcare.demo'
          )
      `)

      await pool.query(`
        INSERT INTO staffprofiles (siteid, userid, workarea, workdays, starttime, endtime, shiftperiod, shiftlabel, availabilitystatus, hourslogged, createdat, updatedat)
        SELECT 3, u.userid, 'coordinacion', 'Lunes,Martes,Miercoles,Jueves,Viernes', '08:00', '16:00', 'AM', 'manana', 'disponible', 8.00, NOW(), NOW()
        FROM users u
        WHERE u.siteid = 3
          AND LOWER(u.email) = 'staff.tla@ronaldcare.demo'
          AND NOT EXISTS (
            SELECT 1
            FROM staffprofiles sp
            WHERE sp.userid = u.userid
          )
      `)

      await pool.query(`
        INSERT INTO stafftasks (siteid, referralid, familyid, assigneduserid, createdbyuserid, title, instructions, duedate, priority, status, createdat, updatedat)
        SELECT
          3,
          NULL,
          NULL,
          assigned_user.userid,
          creator.userid,
          seed.title,
          seed.instructions,
          DATE '2026-04-12',
          seed.priority,
          seed.status,
          NOW(),
          NOW()
        FROM (
          VALUES
            ('Revisión de kit de bienvenida', 'Verificar que los insumos de higiene estén completos para el ingreso de la tarde.', 'media', 'pendiente'),
            ('Limpieza profunda Habitación 204', 'Coordinar limpieza profunda y revisión final de la habitación 204 para dejarla lista.', 'alta', 'en_proceso'),
            ('Seguimiento médico externo - Mateo Alejandro', 'Confirmar acompañamiento operativo y seguimiento de salida externa para Mateo Alejandro.', 'alta', 'en_proceso'),
            ('Actualización de inventario de despensa', 'Actualizar existencias, validar faltantes y dejar corte operativo de despensa.', 'media', 'en_proceso'),
            ('Confirmación de ingreso logística RM-2026-992', 'Ingreso confirmado, kit entregado y flujo logístico cerrado correctamente.', 'media', 'completada'),
            ('Registro de donación de ropa - Sede Tlalnepantla', 'Donación capturada en sistema y resguardada en la sede Tlalnepantla.', 'baja', 'completada')
        ) AS seed(title, instructions, priority, status)
        CROSS JOIN LATERAL (
          SELECT userid
          FROM users
          WHERE siteid = 3
            AND LOWER(email) = 'staff.tla@ronaldcare.demo'
          ORDER BY userid
          LIMIT 1
        ) AS assigned_user
        CROSS JOIN LATERAL (
          SELECT userid
          FROM users
          WHERE roleid = 1
          ORDER BY userid
          LIMIT 1
        ) AS creator
        WHERE EXISTS (SELECT 1 FROM sites WHERE siteid = 3)
          AND NOT EXISTS (
            SELECT 1
            FROM stafftasks st
            WHERE st.siteid = 3
              AND LOWER(st.title) = LOWER(seed.title)
          )
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_seguimiento_clinico_family_recordedat
        ON seguimiento_clinico(familyid, recordedat DESC)
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_inventoryitems_site_category_expiry
        ON inventoryitems(siteid, itemcategory, expirydate)
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS ix_inventoryreports_site_status_createdat
        ON inventoryreports(siteid, status, createdat DESC)
      `)
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }

  return ensurePromise
}

