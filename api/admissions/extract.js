import { withApi } from '../../src/lib/http.js'
import { extractClinicalReference, runOcrWithTesseract } from '../../src/lib/admission-workflow.js'

export default withApi({ methods: ['POST'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  const ocrText = await runOcrWithTesseract({
    dataUrl: req.body.dataUrl,
  })

  const extracted = await extractClinicalReference({
    fileName: req.body.fileName,
    hintText: req.body.hintText,
    ocrText,
  })

  return extracted
})
