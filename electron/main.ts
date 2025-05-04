import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { startMcpServer, stopMcpServer, getMcpServerStatus, getAllMcpServers, startAutoStartServers, stopAllMcpServers } from './services/mcpService';
import { AppConfig, McpServerConfig, NgrokConfig, NgrokStatus, ApiServerStatus, ApiServerState, McpServerState, McpTool, McpProtocolType } from '../src/types/index';
import { LocalServer } from './local-server/local-server';
import { NgrokState } from './local-server/ngrok';
import { normalizeServerName } from './utils/name-utils';
import { getOrCreateAggregatedClient } from './services/mcpService';

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let localServer: LocalServer | null = null;

// Configuration management
const configPath = path.join(app.getPath('userData'), 'config.json');
const defaultConfig: AppConfig = {
  mcpServers: [],
  ngrok: {
    authToken: '',
    enabled: false,
    autoStart: false
  },
  apiServer: {
    enabled: true,
    port: 3100,
    autoStart: true
  }
};

// API Server state management
let apiServerState: ApiServerState = {
  status: ApiServerStatus.Stopped,
  port: 3100,
  url: 'http://localhost:3100'
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

// Save configuration to disk
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
  const indexPath = path.join(__dirname, '..', 'index.html');
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Loading index HTML file:', indexPath);
  console.log('Preload script path:', preloadPath);
  
  mainWindow.loadFile(indexPath);
  
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

  if (!mainWindow) {
    console.error('Failed to create main window');
    return;
  }

  // Initialize IPC handlers
  setupIpcHandlers();
  
  // Start auto-start services
  const config = loadConfig();
  
  // Initialize local server
  localServer = new LocalServer({
    port: config.apiServer?.port ?? 3100,
    ngrokEnabled: config.ngrok?.enabled ?? false,
    ngrokAuthToken: config.ngrok?.authToken,
    ngrokDomain: config.ngrok?.domain,
    mcpClient: getOrCreateAggregatedClient()
  }, mainWindow);

  // Start local server if configured
  try {
    if (config.apiServer?.enabled && config.apiServer?.autoStart) {
      await localServer.start();
    }
  } catch (error) {
    console.error('Error starting local server:', error);
  }
  
  // Start all auto-start MCP servers
  try {
    await startAutoStartServers(config.mcpServers ?? [], mainWindow);
  } catch (error) {
    console.error('Error starting MCP servers:', error);
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
  
  if (localServer) {
    await localServer.stop();
  }
});

interface StartLocalServerConfig {
  port: number;
}

interface NgrokOptions {
  port: number;
  authToken?: string;
  domain?: string;
}

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
  
  // Local server management
  ipcMain.handle('get-local-server-status', () => {
    return localServer?.getStatus() ?? null;
  });

  ipcMain.handle('start-local-server', async (_event, config: StartLocalServerConfig) => {
    if (!localServer) {
      throw new Error('Local server not initialized');
    }
    localServer.setPort(config.port);
    await localServer.start();
    return localServer.getStatus();
  });

  ipcMain.handle('stop-local-server', async () => {
    if (!localServer) {
      throw new Error('Local server not initialized');
    }
    await localServer.stop();
    return localServer.getStatus();
  });

  // MCP server management
  ipcMain.handle('start-mcp-server', async (_event, serverConfig: McpServerConfig) => {
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }

    // Ensure required fields are present
    if (!serverConfig.enabled || !serverConfig.protocolType) {
      throw new Error('Invalid server configuration: missing required fields');
    }

    const result = await startMcpServer(serverConfig, mainWindow);
    
    // Update local server capabilities when MCP servers change
    if (localServer) {
      const allServers = getAllMcpServers();
      const allTools = allServers.flatMap(serverState => 
        (serverState.tools ?? []).map(tool => ({
          ...tool,
          name: `${normalizeServerName(serverState.name)}_${tool.name}`, // Use normalized server name
          description: `[${serverState.name}] ${tool.description}` // Add server context to description
        }))
      );
      
      await localServer.setMcpCapabilities({
        tools: allTools,
        resources: [],
        prompts: [],
        sourceServerId: 'aggregated' // This is an aggregated view of all servers
      });
    }
    
    return result;
  });
  
  ipcMain.handle('stop-mcp-server', async (_event, serverId: string) => {
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    return stopMcpServer(serverId, mainWindow);
  });
  
  ipcMain.handle('get-mcp-server-status', (_event, serverId: string) => {
    return getMcpServerStatus(serverId);
  });
  
  ipcMain.handle('get-all-mcp-servers', () => {
    return getAllMcpServers();
  });
  
  // API server management
  ipcMain.handle('start-api-server', async () => {
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    return startApiServer(mainWindow);
  });
  
  ipcMain.handle('stop-api-server', async () => {
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    return stopApiServer(mainWindow);
  });
  
  ipcMain.handle('get-api-server-status', () => {
    return getApiServerStatus();
  });
  
  // Ngrok management
  ipcMain.handle('start-ngrok', async (_event, options: NgrokOptions) => {
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    return startNgrok(options, mainWindow);
  });
  
  ipcMain.handle('stop-ngrok', async () => {
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    return stopNgrok(mainWindow);
  });
  
  ipcMain.handle('get-ngrok-status', () => {
    return getNgrokStatus();
  });
}

// Set up Ngrok status change handlers for API server sync
function setupNgrokStatusHandlers(window: BrowserWindow) {
  // Watch for Ngrok status changes
  ipcMain.on('ngrok-status-change', async (_event, status: NgrokState) => {
    console.log(`Ngrok status changed to: ${status.status}`);
    
    // Update API server URL when Ngrok connects or disconnects
    if (status.status === NgrokStatus.Connected && status.url) {
      // First update the URL in API server state
      updateApiServerUrl(status.url);
      
      // If API server is already running, restart it to apply new URL
      const apiStatus = getApiServerStatus();
      if (apiStatus.status === ApiServerStatus.Running) {
        console.log('Restarting API server to apply Ngrok URL');
        await stopApiServer(window);
        await startApiServer(window);
      }
    } else if (status.status === NgrokStatus.Disconnected) {
      // First update the URL in API server state
      updateApiServerUrl(undefined);
      
      // If API server is running, restart it to apply local URL
      const apiStatus = getApiServerStatus();
      if (apiStatus.status === ApiServerStatus.Running) {
        console.log('Restarting API server to apply local URL');
        await stopApiServer(window);
        await startApiServer(window);
      }
    }
  });
}

// API Server management
async function startApiServer(window: BrowserWindow): Promise<boolean> {
  if (!localServer) {
    console.error('Local server not initialized');
    return false;
  }

  try {
    await localServer.start();
    const status = localServer.getStatus();
    apiServerState = {
      status: ApiServerStatus.Running,
      port: status.port,
      url: `http://localhost:${status.port}`,
      startTime: Date.now()
    };
    window.webContents.send('api-server-status-change', apiServerState);
    return true;
  } catch (error) {
    console.error('Error starting API server:', error);
    const status = localServer.getStatus();
    apiServerState = {
      status: ApiServerStatus.Error,
      port: status.port,
      url: `http://localhost:${status.port}`,
      error: error instanceof Error ? error.message : String(error)
    };
    window.webContents.send('api-server-status-change', apiServerState);
    return false;
  }
}

async function stopApiServer(window: BrowserWindow): Promise<boolean> {
  if (!localServer) {
    console.error('Local server not initialized');
    return false;
  }

  try {
    await localServer.stop();
    const status = localServer.getStatus();
    apiServerState = {
      status: ApiServerStatus.Stopped,
      port: status.port,
      url: `http://localhost:${status.port}`
    };
    window.webContents.send('api-server-status-change', apiServerState);
    return true;
  } catch (error) {
    console.error('Error stopping API server:', error);
    const status = localServer.getStatus();
    apiServerState = {
      status: ApiServerStatus.Error,
      port: status.port,
      url: `http://localhost:${status.port}`,
      error: error instanceof Error ? error.message : String(error)
    };
    window.webContents.send('api-server-status-change', apiServerState);
    return false;
  }
}

function getApiServerStatus(): ApiServerState {
  return apiServerState;
}

function updateApiServerUrl(url: string | undefined): void {
  apiServerState = {
    ...apiServerState,
    url: url || `http://localhost:${apiServerState.port}`
  };
}

// Ngrok management
async function startNgrok(options: NgrokOptions, window: BrowserWindow): Promise<boolean> {
  if (!localServer) {
    console.error('Local server not initialized');
    return false;
  }

  try {
    // Start Ngrok through the local server
    await localServer.start();
    return true;
  } catch (error) {
    console.error('Error starting Ngrok:', error);
    return false;
  }
}

async function stopNgrok(window: BrowserWindow): Promise<boolean> {
  if (!localServer) {
    console.error('Local server not initialized');
    return false;
  }

  try {
    // Stop Ngrok through the local server
    await localServer.stop();
    return true;
  } catch (error) {
    console.error('Error stopping Ngrok:', error);
    return false;
  }
}

function getNgrokStatus(): NgrokState {
  if (!localServer) {
    return { status: NgrokStatus.Disconnected };
  }
  return localServer.getStatus().ngrokStatus;
} 