/**
 * PythonExecutor Service
 * 
 * Handles spawning and communication with the Python processor executable.
 * Responsible for executing data processing operations via the bundled Python script.
 * 
 * @module services/PythonExecutor
 */

import { app } from "electron";
import { join } from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import type { FilterTypes, ProcessMiningData, SearchCaseIdsData, HistogramData, EdgeStatisticsGlobalData } from "../types/types";

/**
 * Environment configuration for Python process execution.
 * Ensures proper UTF-8 encoding for Persian/Unicode text support.
 */
const PYTHON_ENV = {
  ...process.env,
  PYTHONUTF8: "1",
  PYTHONIOENCODING: "utf-8:replace",
};

/**
 * Gets the correct path to the Python executable based on environment.
 * 
 * @returns Absolute path to processor.exe
 */
function getPythonPath(): string {
  if (app.isPackaged) {
    // Production: executable is in resources folder
    return join(process.resourcesPath, "processor.exe");
  }
  // Development: executable is in project resources folder
  return join(app.getAppPath(), "resources", "processor.exe");
}

/**
 * Spawns a Python process with the given arguments.
 * 
 * @param args - Command line arguments to pass to Python script
 * @returns ChildProcess instance with UTF-8 encoding configured
 */
function spawnPythonProcess(args: string[]): ChildProcessWithoutNullStreams {
  const pythonPath = getPythonPath();
  
  const pythonProcess = spawn(pythonPath, args, {
    env: PYTHON_ENV,
  });

  pythonProcess.stdout.setEncoding("utf8");
  pythonProcess.stderr.setEncoding("utf8");

  return pythonProcess;
}

/**
 * Executes a Python script and returns parsed JSON output.
 * Generic helper that handles process lifecycle and output parsing.
 * 
 * @param args - Command line arguments for the Python script
 * @returns Promise resolving to parsed JSON data
 * @throws Error if script exits with non-zero code or output cannot be parsed
 */
async function executePythonScript<T>(args: string[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawnPythonProcess(args);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data: string) => {
      output += data;
    });

    pythonProcess.stderr.on("data", (data: string) => {
      errorOutput += data;
    });

    pythonProcess.on("close", (code: number | null) => {
      if (code !== 0) {
        const errMsg = errorOutput || `Python script exited with code ${code}.`;
        console.error("Python Stderr:", errorOutput);
        return reject(new Error(errMsg));
      }

      try {
        const jsonData = JSON.parse(output) as T;
        resolve(jsonData);
      } catch (parseError: unknown) {
        const message = parseError instanceof Error ? parseError.message : String(parseError);
        reject(new Error(`Failed to parse Python script output as JSON: ${message}`));
      }
    });

    pythonProcess.on("error", (err: Error) => {
      reject(new Error(`Failed to execute Python script: ${err.message}. Path attempted: ${getPythonPath()}`));
    });
  });
}

/**
 * PythonExecutor
 * 
 * Provides high-level methods for executing Python data processing operations.
 * All methods are async and return strongly-typed results.
 */
export const pythonExecutor = {
  /**
   * Processes data file and generates graph data with variants.
   * 
   * Receives file path and filter criteria, executes Python processor,
   * and returns structured graph data for visualization.
   * 
   * @param formatType - File format: 'csv', 'pkl', or 'parquet'
   * @param inputPath - Absolute path to the data file
   * @param filters - Filter configuration (date range, case counts, etc.)
   * @returns Promise<ProcessMiningData> containing graphData, variants, outliers
   */
  async processData(
    formatType: "csv" | "pkl" | "parquet",
    inputPath: string,
    filters: FilterTypes
  ): Promise<ProcessMiningData> {
    const args = [
      "--format", formatType,
      "--input-path", inputPath,
      "--start-date", filters.dateRange.start,
      "--end-date", filters.dateRange.end,
      "--weight-metric", filters.weightFilter,
      "--time-unit", filters.timeUnitFilter,
    ];

    if (filters.minCaseCount != undefined) {
      args.push("--min-cases", filters.minCaseCount.toString());
    }

    if (filters.maxCaseCount != undefined) {
      args.push("--max-cases", filters.maxCaseCount.toString());
    }

    if (filters.meanTimeRange.min != null) {
      args.push("--min-mean-time", filters.meanTimeRange.min.toString());
    }

    if (filters.meanTimeRange.max != null) {
      args.push("--max-mean-time", filters.meanTimeRange.max.toString());
    }

    return executePythonScript<ProcessMiningData>(args);
  },

  /**
   * Searches for a specific case ID in the data file.
   * 
   * Returns the path taken by a specific case through the process,
   * including timing information and statistical comparisons.
   * 
   * @param caseId - The case identifier to search for
   * @param filePath - Absolute path to the data file
   * @param format - File format: 'csv', 'pkl', or 'parquet'
   * @param startDate - Optional start date filter (ISO string)
   * @param endDate - Optional end date filter (ISO string)
   * @returns Promise<SearchCaseIdsData> with case path and statistics
   */
  async searchCase(
    caseId: string,
    filePath: string,
    format: "csv" | "pkl" | "parquet",
    startDate?: string,
    endDate?: string
  ): Promise<SearchCaseIdsData> {
    const args = [
      "--input-path", filePath,
      "--format", format,
      "--search-case-id", caseId,
    ];

    if (startDate) {
      args.push("--start-date", startDate);
    }
    if (endDate) {
      args.push("--end-date", endDate);
    }

    return executePythonScript<SearchCaseIdsData>(args);
  },

  /**
   * Retrieves statistical data for edges (transitions) in the process.
   * 
   * Can return either global statistics for all edges or specific
   * statistics for a particular source→target transition.
   * 
   * @param filePath - Absolute path to the data file
   * @param format - File format: 'csv', 'pkl', or 'parquet'
   * @param startDate - Start date filter (ISO string)
   * @param endDate - End date filter (ISO string)
   * @param type - 'global' for all edges, 'specific' for single edge
   * @param sourceActivity - Source node name (required if type='specific')
   * @param targetActivity - Target node name (required if type='specific')
   * @returns Promise with histogram data for the requested statistics
   */
  async getEdgeStatistics(
    filePath: string,
    format: "csv" | "pkl" | "parquet",
    startDate: string,
    endDate: string,
    type: "global" | "specific",
    sourceActivity?: string,
    targetActivity?: string
  ): Promise<HistogramData | EdgeStatisticsGlobalData> {
    const args = [
      "--input-path", filePath,
      "--format", format,
      "--start-date", startDate,
      "--end-date", endDate,
      "--get-edge-statistics", type,
      "--source-edge-statistics", sourceActivity || "",
      "--target-edge-statistics", targetActivity || "",
    ];

    return executePythonScript<HistogramData | EdgeStatisticsGlobalData>(args);
  },
};
