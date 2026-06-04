import { jsonResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { getWorkspace } from "@/src/server/modules/user/workspace-service"

export const GET = withErrorHandling(() => {
  return jsonResponse(getWorkspace())
})
