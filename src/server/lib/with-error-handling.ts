import { errorResponse } from "@/src/server/lib/http"

export function withErrorHandling(
  handler: (request: Request, context?: unknown) => Promise<Response> | Response
) {
  return async (request: Request, context?: unknown): Promise<Response> => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error("[API] Unhandled error:", error)

      if (error instanceof Error) {
        if (error.name === "SyntaxError" && error.message.includes("JSON")) {
          return errorResponse("BAD_REQUEST", "Invalid JSON in request body", 400)
        }

        const message = process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message

        return errorResponse("INTERNAL_ERROR", message, 500)
      }

      return errorResponse("INTERNAL_ERROR", "Internal server error", 500)
    }
  }
}
