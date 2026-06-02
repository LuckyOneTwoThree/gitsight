import { jsonResponse } from "@/src/server/lib/http"
import { getWorkspace } from "@/src/server/modules/user/workspace-service"

export async function GET() {
  return jsonResponse(getWorkspace())
}
