import { jsonResponse } from "@/src/server/lib/http"
import { getProjectStats } from "@/src/server/modules/project/project-service"

export function GET() {
  return jsonResponse(getProjectStats())
}

