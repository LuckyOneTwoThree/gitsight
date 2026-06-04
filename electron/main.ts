import { app, BrowserWindow, Menu, dialog } from "electron"
import { join, dirname } from "path"
import { createWriteStream, mkdirSync, existsSync } from "fs"
import { createTray } from "./tray"

// ─── Redirect console to log file (fixes EPIPE in packaged apps) ───
// When Electron runs without a terminal (e.g. from desktop shortcut),
// stdout/stderr pipes are closed. Any console.log/write will throw EPIPE.
// We redirect all output to a log file in the user data directory.
if (app.isPackaged) {
  const logDir = join(app.getPath("userData"), "logs")
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
  const logFile = join(logDir, "main.log")
  const logStream = createWriteStream(logFile, { flags: "a" })

  // Override console methods — write ONLY to log file, never to stdout/stderr
  // (stdout/stderr pipes are closed in packaged apps, writing causes EPIPE crash)
  const writeToFile = (...args: any[]) => {
    try {
      const ts = new Date().toISOString().slice(11, 19)
      logStream.write(`[${ts}] ${args.map(String).join(" ")}\n`)
    } catch { /* ignore */ }
  }

  console.log = writeToFile
  console.error = writeToFile
  console.warn = writeToFile

  // Also redirect raw stdout/stderr writes to prevent EPIPE
  try { process.stdout.write = ((write: any) => function(this: any, ...args: any[]) { try { return write.apply(this, args) } catch { return true } })(process.stdout.write) } catch { /* ignore */ }
  try { process.stderr.write = ((write: any) => function(this: any, ...args: any[]) { try { return write.apply(this, args) } catch { return true } })(process.stderr.write) } catch { /* ignore */ }
}

const DEFAULT_PORT = 3456
let mainWindow: BrowserWindow | null = null
let serverProcess: ReturnType<typeof import("child_process").spawn> | null = null
let activePort = DEFAULT_PORT

/**
 * Check if a port is available by attempting to create a server on it.
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require("net") as typeof import("net")
    const server = net.createServer()
    server.once("error", () => resolve(false))
    server.once("listening", () => {
      server.close(() => resolve(true))
    })
    server.listen(port, "127.0.0.1")
  })
}

/**
 * Find an available port starting from DEFAULT_PORT.
 */
async function findAvailablePort(): Promise<number> {
  for (let port = DEFAULT_PORT; port < DEFAULT_PORT + 10; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
    console.log(`[GitSight] Port ${port} is in use, trying next...`)
  }
  return DEFAULT_PORT
}

/**
 * Start the Next.js standalone server.
 *
 * Dev mode:  `next start -p PORT` via node_modules/.bin/next
 * Prod mode: `node server.js` from the standalone output bundled as extraResource
 *
 * IMPORTANT: In production we must use the system Node.js (or the one bundled
 * via electron-builder's "node" extraResource), NOT Electron's process.execPath.
 * Electron's binary is not a standard Node.js runtime and cannot run server.js.
 */
function startNextJsServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process") as typeof import("child_process")
    const isDev = !app.isPackaged

    if (isDev) {
      // Dev: use next CLI
      const serverPath = join(__dirname, "..", "node_modules", ".bin", "next")
      serverProcess = spawn(
        /^win/.test(process.platform) ? serverPath + ".cmd" : serverPath,
        ["start", "-p", String(port)],
        { env: { ...process.env, PORT: String(port) }, stdio: ["pipe", "pipe", "pipe"] }
      )
    } else {
      // Prod: run the standalone server.js with Node.js
      const serverPath = join(process.resourcesPath, "app", "server.js")
      const nodePath = findNodePath()
      console.log(`[GitSight] Starting server: ${nodePath} ${serverPath}`)

      // Verify Node.js is available
      const { execSync } = require("child_process") as typeof import("child_process")
      try {
        execSync(`"${nodePath}" --version`, { stdio: "pipe" })
      } catch {
        dialog.showErrorBox(
          "Node.js 未安装",
          "GitSight 需要 Node.js 运行时来启动分析服务。\n\n请从 https://nodejs.org 下载并安装 Node.js (LTS 版本)，然后重新启动 GitSight。"
        )
        app.quit()
        return
      }

      // Filter out Electron-specific env vars that may interfere with Next.js
      const cleanEnv = { ...process.env } as Record<string, string>
      delete cleanEnv.ELECTRON_RUN_AS_NODE
      delete cleanEnv.ELECTRON_NO_ASAR

      // Write a module alias script to fix Turbopack hashed module names
      // Turbopack renames "better-sqlite3" to "better-sqlite3-<hash>" which
      // can't be resolved at runtime. This script patches Module._resolveFilename.
      const aliasScriptPath = join(app.getPath("userData"), "module-alias.js")
      const aliasScriptContent = `
const Module = require("module")
const path = require("path")
const fs = require("fs")

// Fix 1: Remap Turbopack hashed module names (e.g. "better-sqlite3-<hash>" -> "better-sqlite3")
const origResolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, isMain, options) {
  const m = request.match(/^(@[^/]+\\/[^/]+|[^/@]+)-[a-f0-9]{8,}$/)
  if (m) {
    try { return origResolveFilename.call(this, m[1], parent, isMain, options) } catch {}
  }
  return origResolveFilename.call(this, request, parent, isMain, options)
}

// Fix 2: Pre-find the better-sqlite3 native binding path
function findNativeBinding(npmName, bindingName) {
  let dir = process.cwd()
  for (let i = 0; i < 15; i++) {
    const moduleDir = path.join(dir, "node_modules", npmName)
    const buildPaths = [
      path.join(moduleDir, "build", "Release", bindingName),
      path.join(moduleDir, "build", "Debug", bindingName),
      path.join(moduleDir, "prebuilds", "win32-x64", bindingName),
      path.join(moduleDir, "build", bindingName),
    ]
    for (const p of buildPaths) { if (fs.existsSync(p)) return p }
    const parentDir = path.dirname(dir)
    if (parentDir === dir) break
    dir = parentDir
  }
  return null
}

const betterSqlite3Binding = findNativeBinding("better-sqlite3", "better_sqlite3.node")

// Fix 3: Patch require("bindings") to fallback to pre-found binding path
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  const result = origLoad.apply(this, arguments)
  if (request === "bindings" && typeof result === "function") {
    const origBindings = result
    const patchedBindings = function (modulePath) {
      try { return origBindings(modulePath) }
      catch (origErr) {
        if (modulePath === "better_sqlite3.node" && betterSqlite3Binding) {
          return require(betterSqlite3Binding)
        }
        throw origErr
      }
    }
    Object.assign(patchedBindings, origBindings)
    return patchedBindings
  }
  return result
}
`
      const { writeFileSync } = require("fs") as typeof import("fs")
      writeFileSync(aliasScriptPath, aliasScriptContent, "utf8")

      serverProcess = spawn(nodePath, ["--require", aliasScriptPath, serverPath], {
        env: {
          ...cleanEnv,
          PORT: String(port),
          NODE_ENV: "production",
          HOSTNAME: "127.0.0.1",
        },
        stdio: ["pipe", "pipe", "pipe"],
        cwd: join(process.resourcesPath, "app"),
      })
    }

    let resolved = false
    let stderrBuffer = ""

    const onStdout = (data: Buffer) => {
      const msg = data.toString()
      console.log("[Next.js]", msg.trim())
      if (!resolved && (msg.includes("Ready") || msg.includes("started") || msg.includes("listening"))) {
        resolved = true
        resolve()
      }
    }

    const onStderr = (data: Buffer) => {
      const msg = data.toString()
      stderrBuffer += msg
      console.error("[Next.js]", msg.trim())
    }

    if (serverProcess!.stdout) serverProcess!.stdout.on("data", onStdout)
    if (serverProcess!.stderr) serverProcess!.stderr.on("data", onStderr)

    serverProcess!.on("error", (err: Error) => {
      console.error("[Next.js] Failed to start:", err)
      if (!resolved) {
        resolved = true
        reject(err)
      }
    })

    serverProcess!.on("exit", (code: number | null) => {
      console.log(`[Next.js] Process exited with code ${code}`)
      serverProcess = null
      if (!resolved) {
        resolved = true
        const detail = stderrBuffer.trim() || `exit code ${code}`
        reject(new Error(`Server exited with code ${code}: ${detail}`))
      }
    })

    // Timeout fallback — server may already be listening on this port
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }, 15000)
  })
}

/**
 * Find the Node.js executable to run the standalone server.
 *
 * Priority:
 * 1. Bundled Node.js via electron-builder extraResource (node/)
 * 2. System Node.js from PATH
 */
function findNodePath(): string {
  const isWin = process.platform === "win32"

  // 1. Bundled Node.js (added via extraResource in electron-builder config)
  const bundledNode = join(
    process.resourcesPath,
    "node",
    isWin ? "node.exe" : "bin/node"
  )
  if (existsSync(bundledNode)) {
    console.log(`[GitSight] Using bundled Node.js: ${bundledNode}`)
    return bundledNode
  }

  // 2. System Node.js
  console.log("[GitSight] Bundled Node.js not found, using system Node.js")
  return isWin ? "node.exe" : "node"
}

/**
 * Get the icon path for the current platform.
 * - Packaged: icons are bundled as extraResource → process.resourcesPath/icons/
 * - Dev: reference from dist-electron back to electron/resources/
 */
function getIconPath(): string {
  const iconName = process.platform === "win32" ? "icon.ico" : "icon.png"
  if (app.isPackaged) {
    return join(process.resourcesPath, "icons", iconName)
  }
  return join(__dirname, "..", "electron", "resources", iconName)
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "GitSight",
    backgroundColor: "#0a0a0a",
    icon: getIconPath(),
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
  })

  // Hide the menu bar on Windows/Linux for a cleaner UI
  // (macOS uses the global menu bar, so we keep it)
  if (process.platform === "win32" || process.platform === "linux") {
    mainWindow.setMenuBarVisibility(false)
  }

  await mainWindow.loadURL(`http://localhost:${activePort}`)

  mainWindow.on("close", (e) => {
    if (serverProcess) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function createApplicationMenu() {
  // Hide the menu bar for a cleaner UI, but keep keyboard shortcuts working
  // via globalShortcut / accelerator in the hidden menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "文件",
      submenu: [
        { label: "重新加载", accelerator: "CmdOrCtrl+R", click: () => mainWindow?.reload() },
        { type: "separator" },
        { label: "退出", accelerator: "CmdOrCtrl+Q", click: () => quitApp() },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "重置缩放" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于 GitSight",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "关于 GitSight",
              message: "GitSight - 开源项目智能分析工具",
              detail: `版本: ${app.getVersion()}\n基于 AI 的开源项目深度分析平台`,
            })
          },
        },
      ],
    },
  ]

  // Build the menu for accelerators to work, but hide the menu bar
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function quitApp() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  app.quit()
}

app.whenReady().then(async () => {
  try {
    // Find an available port before starting the server
    activePort = await findAvailablePort()
    console.log(`[GitSight] Using port ${activePort}`)

    console.log("[GitSight] Starting Next.js server...")
    await startNextJsServer(activePort)
    console.log("[GitSight] Server ready, creating window...")

    createApplicationMenu()
    await createWindow()
    createTray(mainWindow, quitApp)
  } catch (error) {
    console.error("[GitSight] Failed to start:", error)
    dialog.showErrorBox("启动失败", `GitSight 启动失败: ${error}`)
    app.quit()
  }
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    quitApp()
  }
})

app.on("activate", async () => {
  if (mainWindow) {
    mainWindow.show()
  } else {
    await createWindow()
  }
})

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})
