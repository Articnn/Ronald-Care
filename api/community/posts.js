import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'POST'], roles: ['family', 'staff', 'volunteer'] }, async (req) => {
  const pool = await getPool()

  if (req.method === 'GET') {
    const result = await pool.request().query(`
      SELECT TOP 50 CommunityPostId, FamilyId, AuthorAlias, Message, Status, ReportCount, CreatedAt
      FROM dbo.CommunityPosts
      WHERE Status <> 'hidden'
      ORDER BY CreatedAt DESC
    `)
    return result.recordset
  }

  required(req.body, ['message'])
  const alias = req.body.authorAlias || 'Familia anonima'
  const familyId = req.auth.role === 'family' ? req.auth.familyId : null

  const result = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .input('authorAlias', sql.NVarChar(120), alias)
    .input('message', sql.NVarChar(500), req.body.message)
    .input('status', sql.NVarChar(20), 'active')
    .query(`
      INSERT INTO dbo.CommunityPosts (FamilyId, AuthorAlias, Message, Status)
      OUTPUT INSERTED.*
      VALUES (@familyId, @authorAlias, @message, @status)
    `)

  const post = result.recordset[0]
  await logAudit({
    actorUserId: req.auth.role === 'family' ? null : req.auth.sub,
    actorFamilyId: req.auth.role === 'family' ? req.auth.familyId : null,
    eventType: 'community.post_created',
    entityType: 'community_post',
    entityId: post.CommunityPostId,
    metadata: { status: post.Status },
  })

  return post
})
