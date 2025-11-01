import { type FilterTypes } from "../types/types";

export default async function ProcessData(
  filePath: string,
  filters: FilterTypes
) {
  const fileExtension = filePath.split(".").pop().toLowerCase();
  const formatType =
    fileExtension === "csv" ? "csv" : fileExtension === "pkl" ? "pkl" : "";
  try {
    if (formatType === "csv" || formatType === "pkl") {
      const jsonData = window.electronAPI.processData(
        formatType,
        filePath,
        filters
      );
      return jsonData;
    }
    throw Error("فرمت فایل نا معتبر است");
  } catch (error) {
    throw new Error(`Failed to process data via IPC: ${error.message}`);
  }
}
