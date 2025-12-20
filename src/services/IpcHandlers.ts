/**
 * IPC Handlers Service
 * 
 * Centralized registration and handling of all IPC (Inter-Process Communication)
 * channels between the main process and renderer process.
 * 
 * Channel Naming Convention:
 * - All channels use namespaced format: "category:action"
 * - Categories: dialog, data
 * - Actions: descriptive verb (openFile, process, searchCase, etc.)
 * 
 * @module services/IpcHandlers
 */

import { ipcMain, dialog, IpcMainInvokeEvent } from "electron";
import { pythonExecutor } from "./PythonExecutor";
import type { FilterTypes, ProcessMiningData, SearchCaseIdsData, HistogramData, EdgeStatisticsGlobalData } from "../types/types";

/**
 * IPC Channel Names
 * 
 * Centralized constants for all IPC channel names.
 * Using namespaced format for clarity and organization.
 */
export const IPC_CHANNELS = {
  /** Opens native file dialog for data file selection */
  DIALOG_OPEN_FILE: "dialog:openFile",
  /** Processes data file and returns graph data */
  DATA_PROCESS: "data:process",
  /** Searches for a specific case ID */
  DATA_SEARCH_CASE: "data:searchCase",
  /** Retrieves edge statistics (histogram data) */
  DATA_GET_EDGE_STATISTICS: "data:getEdgeStatistics",
} as const;

/**
 * Type for IPC channel names
 */
export type IpcChannelName = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

/**
 * Registers all IPC handlers with the main process.
 * 
 * Should be called once during application initialization,
 * after the app 'ready' event has fired.
 * 
 * All handlers include try/catch error handling to prevent
 * the main process from crashing on handler errors.
 */
export function registerIpcHandlers(): void {
  /**
   * Handles 'dialog:openFile' channel.
   * Opens a native file dialog for selecting data files.
   * 
   * @returns Object containing filePaths array and canceled boolean
   */
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          { name: "Data Files", extensions: ["csv", "pkl", "pickle", "parquet"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error in dialog:openFile handler:", message);
      throw new Error(`Failed to open file dialog: ${message}`);
    }
  });

  /**
   * Handles 'data:process' channel.
   * Receives filter criteria from the renderer and processes the data file.
   * 
   * @param _event - The IPC event (unused but required by signature)
   * @param formatType - File format: 'csv', 'pkl', or 'parquet'
   * @param inputPath - Absolute path to the data file
   * @param filters - Filter configuration object
   * @returns ProcessMiningData containing graphData, variants, outliers, and activity lists
   */
  ipcMain.handle(
    IPC_CHANNELS.DATA_PROCESS,
    async (
      _event: IpcMainInvokeEvent,
      formatType: "csv" | "pkl" | "parquet",
      inputPath: string,
      filters: FilterTypes
    ): Promise<ProcessMiningData> => {
      try {
        return await pythonExecutor.processData(formatType, inputPath, filters);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error in data:process handler:", message);
        throw new Error(`Failed to process data: ${message}`);
      }
    }
  );

  /**
   * Handles 'data:searchCase' channel.
   * Searches for a specific case ID in the data file.
   * 
   * @param _event - The IPC event
   * @param caseId - The case identifier to search for
   * @param filePath - Absolute path to the data file
   * @param format - File format
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns SearchCaseIdsData with case path and statistics
   */
  ipcMain.handle(
    IPC_CHANNELS.DATA_SEARCH_CASE,
    async (
      _event: IpcMainInvokeEvent,
      caseId: string,
      filePath: string,
      format: "csv" | "pkl" | "parquet",
      startDate?: string,
      endDate?: string
    ): Promise<SearchCaseIdsData> => {
      try {
        return await pythonExecutor.searchCase(caseId, filePath, format, startDate, endDate);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error in data:searchCase handler:", message);
        throw new Error(`Failed to search case: ${message}`);
      }
    }
  );

  /**
   * Handles 'data:getEdgeStatistics' channel.
   * Retrieves statistical data for edges (transitions) in the process.
   * 
   * @param _event - The IPC event
   * @param filePath - Absolute path to the data file
   * @param format - File format
   * @param startDate - Start date filter
   * @param endDate - End date filter
   * @param type - 'global' for all edges, 'specific' for single edge
   * @param sourceActivity - Source node name (for specific type)
   * @param targetActivity - Target node name (for specific type)
   * @returns Histogram data for the requested statistics
   */
  ipcMain.handle(
    IPC_CHANNELS.DATA_GET_EDGE_STATISTICS,
    async (
      _event: IpcMainInvokeEvent,
      filePath: string,
      format: "csv" | "pkl" | "parquet",
      startDate: string,
      endDate: string,
      type: "global" | "specific",
      sourceActivity?: string,
      targetActivity?: string
    ): Promise<HistogramData | EdgeStatisticsGlobalData> => {
      try {
        return await pythonExecutor.getEdgeStatistics(
          filePath,
          format,
          startDate,
          endDate,
          type,
          sourceActivity,
          targetActivity
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error in data:getEdgeStatistics handler:", message);
        throw new Error(`Failed to get edge statistics: ${message}`);
      }
    }
  );
}
