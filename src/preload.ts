const { contextBridge, ipcRenderer } = require("electron");
import { type FilterTypes } from "./types/types";
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  processData: (
    formatType: "csv" | "pkl" | "parquet",
    inputPath: string,
    filters: FilterTypes
  ) => ipcRenderer.invoke("process-data", formatType, inputPath, filters),
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  searchCase: (caseId: string, filePath: string, format: "csv" | "pkl" | "parquet", startDate?: string, endDate?: string) => 
    ipcRenderer.invoke('search-case', caseId, filePath, format, startDate, endDate),
});
