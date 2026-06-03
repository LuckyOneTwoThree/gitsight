import { app, BrowserWindow, Menu, dialog } from "electron"
import { join } from "path"
import { createTray } from "./tray"

const PORT = 3456
let mainWindow: BrowserWindow | null = null
let serverProcess: ReturnType<typeof import("child_process").spawn> | null = null

function startNextJsServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process")
    const isDev = !app.isPackaged

    if (isDev) {
      const serverPath = join(__dirname, "..", "node_modules", ".bin", "next")
      serverProcess = spawn(/^win/.test(process.platform) ? serverPath + ".cmd" : serverPath, ["start", "-p", String(PORT)], {
        env: { ...process.env, PORT: String(PORT) },
        stdio: "pipe",
      })
    } else {
      const serverPath = join(process.resourcesPath, "app", "server.js")
      serverProcess = spawn(process.execPath, [serverPath], {
        env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
        stdio: "pipe",
      })
    }

    let resolved = false

    serverProcess!.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString()
      console.log("[Next.js]", msg.trim())
      if (!resolved && (msg.includes("Ready") || msg.includes("started"))) {
        resolved = true
        resolve()
      }
    })

    serverProcess!.stderr?.on("data", (data: Buffer) => {
      console.error("[Next.js]", data.toString().trim())
    })

    serverProcess!.on("error", (err: Error) => {
      console.error("[Next.js] Failed to start:", err)
      if (!resolved) reject(err)
    })

    serverProcess!.on("exit", (code: number) => {
      console.log(`[Next.js] Process exited with code ${code}`)
      serverProcess = null
    })

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }, 15000)
  })
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "GitSight",
    backgroundColor: "#0a0a0a",
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

  await mainWindow.loadURL(`http://localhost:${PORT}`)

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
    console.log("[GitSight] Starting Next.js server...")
    await startNextJsServer()
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
