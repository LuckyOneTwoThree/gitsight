export function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, init)
}

export function errorResponse(code: string, message: string, status = 400, details?: unknown) {
  return jsonResponse(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  )
}

