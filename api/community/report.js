import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['PATCH'], roles: ['family', 'staff', 'volunteer'] }, async (req) => {
  required(req.body, ['communityPostId'])

  const pool = await getPool()
  const result = await pool
    .request()
    .input('communityPostId', sql.Int, toInt(req.body.communityPostId, 'communityPostId'))
    .query(`
      UPDATE CommunityPosts
      SET ReportCount = ReportCount + 1,
          Status = CASE WHEN ReportCount + 1 >= 1 THEN 'reported' ELSE Status END
      WHERE CommunityPostId = @communityPostId
      RETURNING *
    `)

  const post = result.recordset[0]
  if (!post) throw new ApiError(404, 'Post no encontrado')

  await logAudit({
    actorUserId: req.auth.role === 'family' ? null : req.auth.sub,
    actorFamilyId: req.auth.role === 'family' ? req.auth.familyId : null,
    eventType: 'community.post_reported',
    entityType: 'community_post',
    entityId: post.CommunityPostId,
    metadata: { reportCount: post.ReportCount },
  })

  return post
})
