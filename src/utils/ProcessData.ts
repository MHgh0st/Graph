import { type FilterTypes } from "../types/types";

export default async function ProcessData(
  filePath: string,
  filters: FilterTypes,
  caseID?: number
) {
  console.log("Electron API Object:", window.electronAPI);
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
    if (
      formatType === "csv" ||
      formatType === "pkl" ||
      formatType === "parquet"
    ) {
      let jsonData;
      if(caseID){
        jsonData = await window.electronAPI.searchCase(
        caseID, 
        filePath, 
        formatType,
        filters.dateRange.start,
        filters.dateRange.end
      );
      }
      else{
        jsonData = await window.electronAPI.processData(
        formatType,
        filePath,
        filters
      );
      
      }
      return jsonData;
    }
    throw Error("فرمت فایل نا معتبر است");
  } catch (error) {
    throw new Error(`Failed to process data via IPC: ${error.message}`);
  }
}
