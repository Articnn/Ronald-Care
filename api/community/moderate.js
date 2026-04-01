import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['staff'] }, async (req) => {
  required(req.body, ['communityPostId', 'status'])
  oneOf(req.body.status, ['active', 'reported', 'hidden'], 'status')

  const pool = await getPool()
  const result = await pool
    .request()
    .input('communityPostId', sql.Int, toInt(req.body.communityPostId, 'communityPostId'))
    .input('status', sql.NVarChar(20), req.body.status)
    .input('moderatedByUserId', sql.Int, req.auth.sub)
    .query(`
      UPDATE dbo.CommunityPosts
      SET Status = @status, ModeratedByUserId = @moderatedByUserId, ModeratedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE CommunityPostId = @communityPostId
    `)

  const post = result.recordset[0]
  if (!post) throw new ApiError(404, 'Post no encontrado')

  await logAudit({
    actorUserId: req.auth.sub,
    eventType: 'community.post_moderated',
    entityType: 'community_post',
    entityId: post.CommunityPostId,
    metadata: { status: post.Status },
  })

  return post
})
