import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke("get-version"),
  onAnalysisComplete: (callback: (data: unknown) => void) =>
    ipcRenderer.on("analysis-complete", (_event, data) => callback(data)),
  showItemInFolder: (path: string) => ipcRenderer.invoke("show-item-in-folder", path),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
})
