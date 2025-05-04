import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { startMcpServer, stopMcpServer, getMcpServerStatus, getAllMcpServers, startAutoStartServers, stopAllMcpServers } from './services/mcpService';
import { initializeNgrok, startNgrok, stopNgrok, getNgrokStatus } from './services/ngrokService';
import { AppConfig, McpServerConfig, NgrokConfig } from '../src/types';

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Configuration management
const configPath = path.join(app.getPath('userData'), 'config.json');
const defaultConfig: AppConfig = {
  mcpServers: [],
  ngrok: {
    authToken: '',
    enabled: false,
    autoStart: false
  }
};

// Load or create configuration file
function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
    // If config doesn't exist, create it with defaults
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  } catch (error) {
    console.error('Error loading config:', error);
    return defaultConfig;
  }
}

// Save configuration
function saveConfig(config: AppConfig): boolean {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the main application
  console.log('Loading index HTML file:', path.join(__dirname, '../index.html'));
  console.log('Preload script path:', path.join(__dirname, 'preload.js'));
  mainWindow.loadFile(path.join(__dirname, '../index.html'));
  
  // Always open DevTools to debug issues
  mainWindow.webContents.openDevTools();

  // When window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// When Electron has finished initialization
app.whenReady().then(async () => {
  createWindow();

  // Initialize IPC handlers
  setupIpcHandlers();
  
  // Start auto-start services
  if (mainWindow) {
    const config = loadConfig();
    
    // Start all auto-start MCP servers
    await startAutoStartServers(config.mcpServers, mainWindow);
    
    // If ngrok is configured for auto-start
    if (config.ngrok.enabled && config.ngrok.autoStart && config.ngrok.authToken) {
      // Get the first running MCP server port
      const runningServers = getAllMcpServers();
      if (runningServers.length > 0 && runningServers[0].port) {
        await startNgrok({
          port: runningServers[0].port,
          authToken: config.ngrok.authToken,
          domain: config.ngrok.domain
        }, mainWindow);
      }
    }
  }

  // macOS-specific behavior
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When app is about to quit
app.on('before-quit', async () => {
  // Stop all services
  await stopAllMcpServers();
  
  if (mainWindow) {
    await stopNgrok(mainWindow);
  }
});

// Set up all IPC handlers
function setupIpcHandlers() {
  if (!mainWindow) return;
  
  // Configuration management
  ipcMain.handle('get-config', () => {
    return loadConfig();
  });

  ipcMain.handle('save-config', (_event, config: AppConfig) => {
    return saveConfig(config);
  });
  
  // MCP server management
  ipcMain.handle('start-mcp-server', (_event, serverConfig: McpServerConfig) => {
    return startMcpServer(serverConfig, mainWindow!);
  });
  
  ipcMain.handle('stop-mcp-server', (_event, serverId: string) => {
    return stopMcpServer(serverId);
  });
  
  ipcMain.handle('get-mcp-server-status', (_event, serverId: string) => {
    return getMcpServerStatus(serverId);
  });
  
  ipcMain.handle('get-all-mcp-servers', () => {
    return getAllMcpServers();
  });
  
  // Ngrok management
  ipcMain.handle('start-ngrok', (_event, options: any) => {
    return startNgrok(options, mainWindow!);
  });
  
  ipcMain.handle('stop-ngrok', () => {
    return stopNgrok(mainWindow!);
  });
  
  ipcMain.handle('get-ngrok-status', () => {
    return getNgrokStatus();
  });
} 