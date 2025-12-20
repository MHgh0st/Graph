/**
 * WindowManager Service
 * 
 * Manages the lifecycle of BrowserWindow instances in the main process.
 * Handles window creation, configuration, and lifecycle events.
 * 
 * @module services/WindowManager
 */

import { app, BrowserWindow, screen } from "electron";
import { join } from "path";

/**
 * WindowManager
 * 
 * Singleton service responsible for creating and managing the main application window.
 * Encapsulates all window-related logic including:
 * - Window creation with security-hardened webPreferences
 * - Loading the appropriate URL/file based on environment
 * - Window lifecycle management
 */
class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  /**
   * Creates the main application window.
   * 
   * Security Configuration:
   * - nodeIntegration: false (prevents Node.js in renderer)
   * - contextIsolation: true (isolates preload script context)
   * - webSecurity: false (allows loading local files - required for file processing)
   * 
   * @returns The created BrowserWindow instance
   */
  createMainWindow(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
      },
    });

    this.loadContent();

    return this.mainWindow;
  }

  /**
   * Loads the appropriate content based on the application environment.
   * - Development: Loads from Vite dev server URL
   * - Production: Loads from bundled HTML file
   */
  private loadContent(): void {
    if (!this.mainWindow) return;

    // MAIN_WINDOW_VITE_DEV_SERVER_URL is injected by Vite plugin
    if (!app.isPackaged && typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== "undefined") {
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }
  }

  /**
   * Returns the current main window instance.
   * 
   * @returns The main BrowserWindow or null if not created
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Checks if any windows are currently open.
   * 
   * @returns True if at least one window exists
   */
  hasWindows(): boolean {
    return BrowserWindow.getAllWindows().length > 0;
  }
}

// Export singleton instance
export const windowManager = new WindowManager();
