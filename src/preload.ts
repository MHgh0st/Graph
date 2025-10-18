const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  processData: (formatType, inputPath) =>
    ipcRenderer.invoke("process-data", formatType, inputPath),
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  readProcessedFiles: () => ipcRenderer.invoke("read-processed-files"),
  readJsonFile: (filePath) => ipcRenderer.invoke("read-json-file", filePath),
});
