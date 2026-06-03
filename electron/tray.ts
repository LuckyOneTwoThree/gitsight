import { app, Tray, Menu, nativeImage, BrowserWindow } from "electron"
import { join } from "path"

let tray: Tray | null = null

function createTrayIcon(): Electron.NativeImage {
  const size = 16
  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="2" fill="#6366f1"/>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="11" font-weight="bold">R</text>
    </svg>
  `
  return nativeImage.createFromBuffer(Buffer.from(canvas))
}

export function createTray(mainWindow: BrowserWindow | null, quitApp: () => void) {
  const icon = createTrayIcon()
  tray = new Tray(icon)

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
