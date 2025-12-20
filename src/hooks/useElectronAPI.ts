/**
 * Electron API Hook
 * 
 * Provides type-safe access to Electron IPC methods exposed via the preload script.
 * Wraps window.electronAPI with proper typing and error handling.
 * 
 * Channel Names (must match services/IpcHandlers.ts):
 * - dialog:openFile - Opens file selection dialog
 * - data:process - Processes data file with filters
 * - data:searchCase - Searches for specific case ID
 * - data:getEdgeStatistics - Gets edge histogram data
 * 
 * @module hooks/useElectronAPI
 */

import { useCallback } from "react";
import type {
  FilterTypes,
  ProcessMiningData,
  SearchCaseIdsData,
  HistogramData,
  EdgeStatisticsGlobalData,
} from "../types/types";

/**
 * File dialog result from Electron
 */
interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

/**
 * Format types supported by the data processor
 */
type DataFormat = "csv" | "pkl" | "parquet";

/**
 * Edge statistics request type
 */
type EdgeStatisticsType = "global" | "specific";

/**
 * useElectronAPI
 * 
 * Custom hook providing type-safe wrappers around the Electron IPC bridge.
 * All methods use the namespaced channel convention established in Phase 1.
 * 
 * @example
 * ```tsx
 * const { openFileDialog, processData } = useElectronAPI();
 * 
 * const handleSelectFile = async () => {
 *   const result = await openFileDialog();
 *   if (!result.canceled && result.filePaths.length > 0) {
 *     setFilePath(result.filePaths[0]);
 *   }
 * };
 * ```
 * 
 * @returns Object containing IPC wrapper functions
 */
export function useElectronAPI() {
  /**
   * Opens native file dialog for selecting data files.
   * Supports .csv, .pkl, .pickle, and .parquet files.
   * 
   * @returns Promise resolving to dialog result with file paths
   */
  const openFileDialog = useCallback(async (): Promise<OpenDialogResult> => {
    try {
      return await window.electronAPI.openFileDialog();
    } catch (error) {
      console.error("Failed to open file dialog:", error);
      throw error;
    }
  }, []);

  /**
   * Processes a data file and returns graph visualization data.
   * 
   * @param formatType - The file format
   * @param inputPath - Absolute path to the data file
   * @param filters - Filter configuration
   * @returns Promise resolving to processed graph data
   */
  const processData = useCallback(
    async (
      formatType: DataFormat,
      inputPath: string,
      filters: FilterTypes
    ): Promise<ProcessMiningData> => {
      try {
        return await window.electronAPI.processData(formatType, inputPath, filters);
      } catch (error) {
        console.error("Failed to process data:", error);
        throw error;
      }
    },
    []
  );

  /**
   * Searches for a specific case ID in the data file.
   * 
   * @param caseId - The case identifier to search for
   * @param filePath - Absolute path to the data file
   * @param format - The file format
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Promise resolving to case search results
   */
  const searchCase = useCallback(
    async (
      caseId: string,
      filePath: string,
      format: DataFormat,
      startDate?: string,
      endDate?: string
    ): Promise<SearchCaseIdsData> => {
      try {
        return await window.electronAPI.searchCase(
          caseId,
          filePath,
          format,
          startDate,
          endDate
        );
      } catch (error) {
        console.error("Failed to search case:", error);
        throw error;
      }
    },
    []
  );

  /**
   * Retrieves statistical data for edges (transitions) in the process.
   * 
   * @param filePath - Absolute path to the data file
   * @param format - The file format
   * @param startDate - Start date filter
   * @param endDate - End date filter
   * @param type - 'global' or 'specific'
   * @param sourceActivity - Source node name (for specific type)
   * @param targetActivity - Target node name (for specific type)
   * @returns Promise resolving to histogram data
   */
  const getEdgeStatistics = useCallback(
    async (
      filePath: string,
      format: DataFormat,
      startDate: string,
      endDate: string,
      type: EdgeStatisticsType,
      sourceActivity?: string,
      targetActivity?: string
    ): Promise<HistogramData | EdgeStatisticsGlobalData> => {
      try {
        return await window.electronAPI.getEdgeStatistics(
          filePath,
          format,
          startDate,
          endDate,
          type,
          sourceActivity,
          targetActivity
        );
      } catch (error) {
        console.error("Failed to get edge statistics:", error);
        throw error;
      }
    },
    []
  );

  /**
   * Helper function to extract file format from path.
   * 
   * @param filePath - Path to the data file
   * @returns The detected format or empty string if unknown
   */
  const getFileFormat = useCallback((filePath: string): DataFormat | "" => {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "pkl" || ext === "parquet") {
      return ext;
    }
    return "";
  }, []);

  return {
    openFileDialog,
    processData,
    searchCase,
    getEdgeStatistics,
    getFileFormat,
  };
}

export type { DataFormat, EdgeStatisticsType, OpenDialogResult };
