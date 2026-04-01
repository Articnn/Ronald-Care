import { getPool, sql } from './db.js'

export async function logAudit({
  siteId = null,
  actorUserId = null,
  actorFamilyId = null,
  eventType,
  entityType,
  entityId,
  metadata = {},
}) {
  const pool = await getPool()
  await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('actorUserId', sql.Int, actorUserId)
    .input('actorFamilyId', sql.Int, actorFamilyId)
    .input('eventType', sql.NVarChar(80), eventType)
    .input('entityType', sql.NVarChar(50), entityType)
    .input('entityId', sql.Int, entityId)
    .input('metadataJson', sql.NVarChar(sql.MAX), JSON.stringify(metadata))
    .query(`
      INSERT INTO dbo.AuditEvents (SiteId, ActorUserId, ActorFamilyId, EventType, EntityType, EntityId, MetadataJson)
      VALUES (@siteId, @actorUserId, @actorFamilyId, @eventType, @entityType, @entityId, @metadataJson)
    `)
}
