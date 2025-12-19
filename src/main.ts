import { app, BrowserWindow, ipcMain, dialog, screen } from "electron";
import { join } from "path";
import started from "electron-squirrel-startup";
import { spawn } from "child_process";
import { type FilterTypes, HistogramData, EdgeStatisticsGlobalData } from "./types/types";

// Define the electron API type
declare global {
  interface Window {
    electronAPI: {
      processData: (
        formatType: "csv" | "pkl" | "parquet",
        inputPath: string,
        filters: FilterTypes
      ) => Promise<any>;
      openFileDialog: () => Promise<any>;
      searchCase: (
        caseId: number, 
        filePath: string, 
        format: "csv" | "pkl" | "parquet", 
        startDate?: string, 
        endDate?: string
      ) => Promise<any>;
      getEdgeStatistics: (
        filePath: string,
        format: "csv" | "pkl" | "parquet",
        startDate?: string,
        endDate?: string,
        type?: 'global' | 'specific',
        sourceActivity?: string,
        targetActivity?: string ) => Promise<HistogramData | EdgeStatisticsGlobalData>;
    };
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}
const getPythonPath = () => {
  if (app.isPackaged) {
    return join(process.resourcesPath, "processor.exe");
  }
  return join(app.getAppPath(), "resources", "processor.exe");
};

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      nodeIntegration: false, // Recommended for security
      contextIsolation: true, // Essential for security
      webSecurity: false, // Allow loading local files
    },
  });

  // and load the index.html of the app.
  if (!app.isPackaged && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

async function runPythonScript(
  formatType: "csv" | "pkl" | "parquet",
  inputPath: string,
  filters: FilterTypes
) {
  let PYTHON_EXE_PATH;

  if (app.isPackaged) {
    // محیط Production (بیلد شده)
    // Electron فایل های resource را در یک پوشه خاص قرار می دهد.
    // Forge معمولا این فایل ها را در resourcePath قرار می دهد.
    PYTHON_EXE_PATH = join(process.resourcesPath, "processor.exe");
  } else {
    // محیط Development (در حال اجرا با 'electron-forge start')
    // Use app.getAppPath() to get the root directory of the app during development
    PYTHON_EXE_PATH = join(app.getAppPath(), "resources", "processor.exe");
  }

  // ... بقیه منطق تابع runPythonScript ...
  return new Promise((resolve, reject) => {
    // 2. تنظیم آرگومان ها برای پایتون
    const args = [
      "--format",
      formatType,
      "--input-path",
      inputPath,
      "--start-date",
      filters.dateRange.start,
      "--end-date",
      filters.dateRange.end,
      "--weight-metric",
      filters.weightFilter,
      "--time-unit",
      filters.timeUnitFilter,
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

    const pythonProcess = spawn(PYTHON_EXE_PATH, args, {
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8:replace",
      },
    });

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.setEncoding("utf8");
    pythonProcess.stderr.setEncoding("utf8");

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        const errMsg = errorOutput || `Python script exited with code ${code}.`;
        console.error("Python Stderr:", errorOutput);
        return reject(new Error(errMsg));
      }
      try {
        // رشته JSON دریافت شده را مستقیماً parse کن
        const jsonData = JSON.parse(output);
        resolve(jsonData);
      } catch (parseError) {
        reject(
          new Error(
            `Failed to parse Python script output as JSON: ${parseError.message}`
          )
        );
      }
    });

    pythonProcess.on("error", (err) => {
      reject(
        new Error(
          `Failed to execute Python script: ${err.message}. Path attempted: ${PYTHON_EXE_PATH}`
        )
      );
    });
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
ipcMain.handle(
  "process-data",
  async (event, formatType, inputPath, filters) => {
    console.log("filters: ", filters);
    const outputPath = await runPythonScript(formatType, inputPath, filters);
    return outputPath;
  }
);

ipcMain.handle('get-edge-statistics', async (event, filePath, format, startDate, endDate, type, sourceActivity, targetActivity) => {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();

    const args= [
      '--input-path', filePath,
      '--format', format,
      '--start-date', startDate,
      '--end-date', endDate,
      '--get-edge-statistics', type,
      '--source-edge-statistics', sourceActivity,
      '--target-edge-statistics', targetActivity
    ]

    const pythonProcess = spawn(pythonPath, args, {
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8:replace",
      },
    });

    let dataString = '';
    let errorString = '';
    
    pythonProcess.stdout.setEncoding("utf8");
    pythonProcess.stderr.setEncoding("utf8");

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error("Python Error:", errorString);
        return reject(new Error(`Python script failed: ${errorString}`));
      }
      try {
        const jsonData = JSON.parse(dataString);
        resolve(jsonData);
      } catch (parseError) {
        reject(
          new Error(
            `Failed to parse Python script output as JSON: ${parseError.message}`
          )
        );
      }
    });

    pythonProcess.on('error', (err) => {
      reject(
        new Error(
          `Failed to execute Python script: ${err.message}. Path attempted: ${pythonPath}`
        )
      );
    });
  })

});

ipcMain.handle('search-case', async (event, caseId, filePath, format, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    // 1. دریافت مسیر صحیح فایل اجرایی
    const pythonPath = getPythonPath();

    const args = [
      '--input-path', filePath,
      '--format', format,
      '--search-case-id', caseId
    ];

    if (startDate) {
      args.push('--start-date', startDate);
    }
    if (endDate) {
      args.push('--end-date', endDate);
    }

    console.log("args: ", args);

    // 2. اجرای پروسه با تنظیمات انکدینگ (حیاتی برای زبان فارسی)
    const pythonProcess = spawn(pythonPath, args, {
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8:replace",
      },
    });

    let dataString = '';
    let errorString = '';
    
    pythonProcess.stdout.setEncoding("utf8");
    pythonProcess.stderr.setEncoding("utf8");

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // 3. دریافت خطاهای احتمالی پایتون
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error("Search Python Error:", errorString);
        return reject(new Error(`Search script failed: ${errorString}`));
      }

      try {
        const json = JSON.parse(dataString);
        resolve(json);
      } catch (e) {
        reject(`Error parsing search result: ${e.message}`);
      }
    });

    pythonProcess.on("error", (err) => {
        reject(new Error(`Failed to spawn search process: ${err.message}`));
    });
  });
});

// Handle file dialog requests from the renderer process
ipcMain.handle("open-file-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Data Files", extensions: ["csv", "pkl", "pickle", "parquet"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return result;
});
