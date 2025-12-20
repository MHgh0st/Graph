/**
 * Services Module
 * 
 * Barrel export file for all main process services.
 * Provides a single import point for service dependencies.
 * 
 * @module services
 */

export { windowManager } from "./WindowManager";
export { pythonExecutor } from "./PythonExecutor";
export { registerIpcHandlers, IPC_CHANNELS, type IpcChannelName } from "./IpcHandlers";
