/**
 * Preload Script
 * 
 * This script runs in an isolated context with access to both
 * Node.js APIs and the DOM. It safely exposes a limited API to
 * the renderer process via the contextBridge.
 * 
 * Security:
 * - Only exposes specific methods, not the entire electron object
 * - Uses typed channel names for safety
 * - All IPC calls use invoke/handle pattern (not send/on)
 * 
 * Channel Naming Convention:
 * - dialog:* - Native dialog operations
 * - data:* - Data processing operations
 * 
 * @module preload
 */

const { contextBridge, ipcRenderer } = require("electron");
import type { FilterTypes, ProcessMiningData, SearchCaseIdsData, HistogramData, EdgeStatisticsGlobalData } from "./types/types";

/**
 * IPC Channel Constants
 * Must match the channels defined in services/IpcHandlers.ts
 */
const IPC_CHANNELS = {
  DIALOG_OPEN_FILE: "dialog:openFile",
  DATA_PROCESS: "data:process",
  DATA_SEARCH_CASE: "data:searchCase",
  DATA_GET_EDGE_STATISTICS: "data:getEdgeStatistics",
} as const;

/**
 * Electron API
 * 
 * This object is exposed to the renderer process as window.electronAPI.
 * Each method wraps an ipcRenderer.invoke call to the corresponding
 * handler in the main process.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Processes a data file and returns graph visualization data.
   * 
   * @param formatType - The file format: 'csv', 'pkl', or 'parquet'
   * @param inputPath - Absolute path to the data file
   * @param filters - Filter configuration (date range, counts, etc.)
   * @returns Promise resolving to ProcessMiningData
   */
  processData: (
    formatType: "csv" | "pkl" | "parquet",
    inputPath: string,
    filters: FilterTypes
  ): Promise<ProcessMiningData> =>
    ipcRenderer.invoke(IPC_CHANNELS.DATA_PROCESS, formatType, inputPath, filters),

  /**
   * Opens a native file dialog for selecting data files.
   * 
   * @returns Promise resolving to dialog result with filePaths
   */
  openFileDialog: (): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE),

  /**
   * Searches for a specific case ID in the data file.
   * 
   * @param caseId - The case identifier to search for
   * @param filePath - Absolute path to the data file
   * @param format - The file format
   * @param startDate - Optional start date filter (ISO string)
   * @param endDate - Optional end date filter (ISO string)
   * @returns Promise resolving to SearchCaseIdsData
   */
  searchCase: (
    caseId: string,
    filePath: string,
    format: "csv" | "pkl" | "parquet",
    startDate?: string,
    endDate?: string
  ): Promise<SearchCaseIdsData> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.DATA_SEARCH_CASE,
      caseId,
      filePath,
      format,
      startDate,
      endDate
    ),

  /**
   * Retrieves statistical data for process edges.
   * 
   * @param filePath - Absolute path to the data file
   * @param format - The file format
   * @param startDate - Start date filter (ISO string)
   * @param endDate - End date filter (ISO string)
   * @param type - 'global' for all edges, 'specific' for single edge
   * @param sourceActivity - Source node name (for specific type)
   * @param targetActivity - Target node name (for specific type)
   * @returns Promise resolving to histogram data
   */
  getEdgeStatistics: (
    filePath: string,
    format: "csv" | "pkl" | "parquet",
    startDate?: string,
    endDate?: string,
    type?: "global" | "specific",
    sourceActivity?: string,
    targetActivity?: string
  ): Promise<HistogramData | EdgeStatisticsGlobalData> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.DATA_GET_EDGE_STATISTICS,
      filePath,
      format,
      startDate,
      endDate,
      type,
      sourceActivity,
      targetActivity
    ),
});
