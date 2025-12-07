import { useState, useEffect } from "react";
import { Button } from "@heroui/button";

export default function FileUploader({
  setPythonPath,
  submit,
}: {
  setPythonPath: (path: string) => void;
  submit: () => void;
}) {
  const [error, setError] = useState("");
  const [filePath, setFilePath] = useState(null);
  const [outputMessage, setOutputMessage] = useState(null);

  const handleFileSelect = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error("window.electronAPI is not available");
      }

      const result = await window.electronAPI.openFileDialog();

      if (!result || result.canceled || result.filePaths.length === 0) {
        setError("هیچ فایلی انتخاب نشده است.");
        setFilePath(null);
        return;
      }

      setFilePath(result.filePaths[0]);
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
    setError("");
    setOutputMessage(null);
    const fileExtension = filePath.split(".").pop().toLowerCase();
    const formatType =
      fileExtension === "csv"
        ? "csv"
        : fileExtension === "pkl"
          ? "pkl"
          : fileExtension === "parquet"
            ? "parquet"
            : "";
    try {
      if (!formatType) {
        throw new Error("فرمت فایل نامعتبر است.");
      }
      setPythonPath(filePath);
      submit();
    } catch (e) {
      console.error("خطای پردازش (IPC/Python):", e);
      setError(e.message || "خطای ناشناخته در پردازش.");
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

          <Button
            className="font-semibold"
            onPress={handleFileSelect}
            fullWidth
            color="primary"
          >
            انتخاب فایل ورودی
          </Button>

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

          <Button
            className="font-semibold"
            onPress={handleProcess}
            isDisabled={!filePath}
            fullWidth
            color="success"
          >
            پردازش فایل
          </Button>
        </div>
      </div>
    </>
  );
}
