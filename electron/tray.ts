import { app, Tray, Menu, nativeImage, BrowserWindow } from "electron"
import { join } from "path"

let tray: Tray | null = null

function getTrayIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "icons", process.platform === "win32" ? "icon.ico" : "icon.png")
  }
  return join(__dirname, "..", "electron", "resources", process.platform === "win32" ? "icon.ico" : "icon.png")
}

export function createTray(mainWindow: BrowserWindow | null, quitApp: () => void) {
  const iconPath = getTrayIconPath()
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示 GitSight",
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: "separator" },
    {
      label: "检查更新...",
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send("navigate", "/settings")
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => quitApp(),
    },
  ])

  tray.setToolTip("GitSight - 开源项目智能分析工具")
  tray.setContextMenu(contextMenu)

  tray.on("double-click", () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}
