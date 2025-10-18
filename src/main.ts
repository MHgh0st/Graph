import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import started from "electron-squirrel-startup";
import { spawn } from "child_process";
import { readdir, stat, readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // preload: join(__dirname, `../preload/${MAIN_WINDOW_VITE_NAME}/preload.js`),
      preload: join(__dirname, `../build/preload.js`),
      nodeIntegration: false, // Recommended for security
      contextIsolation: true, // Essential for security
      webSecurity: false, // Allow loading local files
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// این تابع باید توسط Electron IPC (Invoke) فراخوانی شود
async function runPythonScript(formatType: "csv" | "pkl", inputPath: string) {
  // 1. تعیین مسیر فایل .exe پایتون بر اساس محیط
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
    const args = ["--format", formatType, "--input-path", inputPath];

    // 3. اجرای پروسه فرزند
    // ⚠️ مهم: اکنون از PYTHON_EXE_PATH استفاده می کنیم
    const pythonProcess = spawn(PYTHON_EXE_PATH, args);
    // ... بقیه منطق (stdout, stderr, close)

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString().trim();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        const errMsg = errorOutput || `Python script exited with code ${code}.`;
        return reject(new Error(errMsg));
      }
      resolve(output);
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
ipcMain.handle("process-data", async (event, formatType, inputPath) => {
  const outputPath = await runPythonScript(formatType, inputPath);
  return outputPath;
});

// Handle file dialog requests from the renderer process
ipcMain.handle("open-file-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Data Files", extensions: ["csv", "pkl", "pickle"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return result;
});

// Handle reading processed files from processed_data directory
ipcMain.handle("read-processed-files", async () => {
  try {
    const processedDataPath = app.isPackaged
      ? join(process.resourcesPath, "processed_data")
      : join(app.getAppPath(), "processed_data");

    const files = await readdir(processedDataPath);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const processedFiles = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = join(processedDataPath, file);
        const stats = await stat(filePath);

        // Extract date from filename (format: graph_data_YYYYMMDD_HHMMSS.json)
        const dateMatch = file.match(/graph_data_(\d{8})_(\d{6})\.json/);
        const date = dateMatch
          ? new Date(
              dateMatch[1].substring(0, 4) +
                "-" +
                dateMatch[1].substring(4, 6) +
                "-" +
                dateMatch[1].substring(6, 8) +
                " " +
                dateMatch[2].substring(0, 2) +
                ":" +
                dateMatch[2].substring(2, 4) +
                ":" +
                dateMatch[2].substring(4, 6)
            ).toLocaleString("fa-IR")
          : "نامشخص";

        return {
          name: file,
          path: filePath,
          date: date,
          size: (stats.size / 1024).toFixed(2) + " KB",
        };
      })
    );

    // Sort by creation date (newest first)
    processedFiles.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return processedFiles;
  } catch (error) {
    console.error("Error reading processed files:", error);
    return [];
  }
});

// Handle reading JSON files
ipcMain.handle("read-json-file", async (event, filePath) => {
  try {
    const fileContent = await readFile(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    throw new Error(`Failed to read JSON file: ${error.message}`);
  }
});
