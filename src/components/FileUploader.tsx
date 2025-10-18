import { useState, useEffect } from "react";

function processData(formatType: "csv" | "pkl", filePath: string) {
  try {
    const jsonOutputPath = window.electronAPI.processData(formatType, filePath);
    return jsonOutputPath;
  } catch (error) {
    throw new Error(`Failed to process data via IPC: ${error.message}`);
  }
}

export default function FileUploader({
  setOutputPath,
}: {
  setOutputPath: (path: string) => void;
}) {
  const [error, setError] = useState("");
  const [filePath, setFilePath] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [outputMessage, setOutputMessage] = useState(null);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const loadProcessedFiles = async () => {
      try {
        if (window.electronAPI?.readProcessedFiles) {
          const files = await window.electronAPI.readProcessedFiles();
          setProcessedFiles(files);
        }
      } catch (err) {
        console.error("خطا در خواندن فایل‌های پردازش شده:", err);
      }
    };

    loadProcessedFiles();
  }, []);

  const handleHistoryFileSelect = (filePath: string) => {
    setOutputPath(filePath);
    setOutputMessage(`✅ فایل پردازش شده قبلی انتخاب شد:\n${filePath}`);
    setError("");
  };

  const handleFileSelect = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error("window.electronAPI is not available");
      }

      // استفاده از متد باز کردن فایل Electron (نیاز به دسترسی از طریق Preload/IPC دارد)
      // در Electron، بهترین روش استفاده از دیالوگ است.
      const result = await window.electronAPI.openFileDialog(); // 👈 استفاده از دیالوگ از طریق preload

      if (!result || result.canceled || result.filePaths.length === 0) {
        setError("هیچ فایلی انتخاب نشده است.");
        setFilePath(null);
        return;
      }

      setFilePath(result.filePaths[0]); // 👈 مسیر م絕對 فایل
      setError("");
      setOutputMessage(null);
    } catch (err) {
      console.error("File selection error:", err);
      setError(
        `خطا در انتخاب فایل: ${err.message || "مطمئن شوید Preload/IPC برای دیالوگ تنظیم شده است."}`
      );
    }
  };

  const handleProcess = async () => {
    if (!filePath) {
      setError("لطفاً ابتدا فایل را انتخاب کنید.");
      return;
    }

    setIsLoading(true);
    setError("");
    setOutputMessage(null);

    const fileExtension = filePath.split(".").pop().toLowerCase();
    const formatType =
      fileExtension === "csv" ? "csv" : fileExtension === "pkl" ? "pkl" : "";

    try {
      if (!formatType) {
        throw new Error("فرمت فایل نامعتبر است.");
      }

      const outputPath = await processData(formatType, filePath); // 👈 ارسال مسیر و فرمت

      // 2. نمایش مسیر خروجی دریافتی از Node.js
      setOutputMessage(
        `✅ پردازش با موفقیت انجام شد. فایل خروجی در مسیر زیر ذخیره شد:\n${outputPath}`
      );
      setOutputPath(outputPath);
    } catch (e) {
      console.error("خطای پردازش (IPC/Python):", e);
      setError(e.message || "خطای ناشناخته در پردازش.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="h-screen w-screen flex items-center justify-center bg-gray-100"
        dir="rtl"
      >
        <div className="w-11/12 max-w-lg p-6 bg-white rounded-lg shadow-xl text-center space-y-6">
          <p className="text-2xl font-bold text-gray-800">پردازشگر دیتافریم</p>

          <button
            className="w-full py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition duration-150 ease-in-out"
            onClick={handleFileSelect}
            disabled={isLoading}
          >
            انتخاب فایل ورودی
          </button>

          {processedFiles.length > 0 && (
            <button
              className="w-full py-2 bg-purple-500 text-white font-semibold rounded-md hover:bg-purple-600 transition duration-150 ease-in-out"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory
                ? "مخفی کردن تاریخچه"
                : `نمایش تاریخچه (${processedFiles.length} فایل)`}
            </button>
          )}

          {showHistory && processedFiles.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-2 text-right">
                فایل‌های پردازش شده قبلی:
              </p>
              {processedFiles.map((file, index) => (
                <button
                  key={index}
                  className="w-full text-right p-2 mb-2 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 transition duration-150 ease-in-out text-sm"
                  onClick={() => handleHistoryFileSelect(file.path)}
                >
                  📊 {file.name}
                  <br />
                  <span className="text-xs text-gray-500">{file.date}</span>
                </button>
              ))}
            </div>
          )}

          {filePath && (
            <div className="text-sm text-gray-700 break-all border p-2 rounded bg-gray-50">
              <p className="font-medium text-right">مسیر انتخاب شده:</p>
              <p className="font-mono text-left">📂 {filePath}</p>
            </div>
          )}

          {error && <p className="text-red-500 font-medium">{error}</p>}
          {outputMessage && (
            <p className="text-green-600 whitespace-pre-line border border-green-200 p-3 rounded-md">
              {outputMessage}
            </p>
          )}

          <button
            className="w-full py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition duration-150 ease-in-out"
            onClick={handleProcess}
            disabled={isLoading || !filePath}
          >
            {isLoading ? "در حال پردازش..." : "پردازش فایل"}
          </button>
        </div>
      </div>
    </>
  );
}
