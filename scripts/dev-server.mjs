import next from "next"
import { createServer } from "node:http"

const hostname = process.env.HOST || "127.0.0.1"
const port = Number(process.env.PORT || 3000)

const app = next({
  dev: true,
  hostname,
  port,
})

const handle = app.getRequestHandler()

await app.prepare()

createServer((request, response) => {
  handle(request, response)
}).listen(port, hostname, () => {
  console.log(`GitSight dev server ready at http://${hostname}:${port}`)
})

