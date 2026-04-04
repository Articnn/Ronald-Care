export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function ok(res, data = null, statusCode = 200) {
  return sendJson(res, statusCode, { success: true, data, error: null })
}

export function fail(res, statusCode, message, details = null) {
  return sendJson(res, statusCode, {
    success: false,
    data: null,
    error: { message, details },
  })
}
