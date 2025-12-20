/**
 * Main Process Entry Point
 * 
 * This is the entry point for the Electron main process.
 * It initializes the application, registers IPC handlers, and manages
 * the application lifecycle.
 * 
 * Architecture:
 * - Window management: ./services/WindowManager.ts
 * - Python execution: ./services/PythonExecutor.ts
 * - IPC handlers: ./services/IpcHandlers.ts
 * 
 * @module main
 */

import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import { windowManager, registerIpcHandlers } from "./services";
import type { FilterTypes, HistogramData, EdgeStatisticsGlobalData } from "./types/types";

// Declare the Vite dev server URL constant (injected by Vite plugin)
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

/**
 * Electron API type definition for the renderer process.
 * This interface describes the methods exposed via contextBridge.
 */
declare global {
  interface Window {
    electronAPI: {
      /** Processes data file and returns graph data */
      processData: (
        formatType: "csv" | "pkl" | "parquet",
        inputPath: string,
        filters: FilterTypes
      ) => Promise<any>;
      /** Opens native file dialog */
      openFileDialog: () => Promise<any>;
      /** Searches for a specific case ID */
      searchCase: (
        caseId: number,
        filePath: string,
        format: "csv" | "pkl" | "parquet",
        startDate?: string,
        endDate?: string
      ) => Promise<any>;
      /** Gets edge statistics data */
      getEdgeStatistics: (
        filePath: string,
        format: "csv" | "pkl" | "parquet",
        startDate?: string,
        endDate?: string,
        type?: "global" | "specific",
        sourceActivity?: string,
        targetActivity?: string
      ) => Promise<HistogramData | EdgeStatisticsGlobalData>;
    };
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

/**
 * Application Ready Handler
 * 
 * Called when Electron has finished initialization and is ready to create windows.
 * Registers IPC handlers and creates the main window.
 */
app.on("ready", () => {
  registerIpcHandlers();
  windowManager.createMainWindow();
});

/**
 * All Windows Closed Handler
 * 
 * Quits the application when all windows are closed (except on macOS).
 * On macOS, applications typically stay active until explicitly quit.
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * Activate Handler (macOS)
 * 
 * Re-creates the main window when the dock icon is clicked
 * and no other windows are open (macOS behavior).
 */
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow();
  }
});
