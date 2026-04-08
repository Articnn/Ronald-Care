import { withApi } from '../../src/lib/http.js'
import { extractClinicalReference } from '../../src/lib/admission-workflow.js'

export default withApi({ methods: ['POST'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  const extracted = extractClinicalReference({
    fileName: req.body.fileName,
    hintText: req.body.hintText,
  })

  return {
    ...extracted,
    message: 'Información del documento extraída automáticamente.',
  }
})
