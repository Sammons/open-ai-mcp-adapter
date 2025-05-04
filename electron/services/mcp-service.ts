import { BrowserWindow } from 'electron';
import { McpServerConfig, McpServerState, McpServerStatus } from '../../src/types/index';
import { AggregatedMcpClient } from '../mcp/client-aggregator';
import { McpEventType } from '../mcp/types';
import { adaptMcpServerConfig } from '../mcp/config-adapter';

// Single instance of AggregatedMcpClient
let aggregatedClient: AggregatedMcpClient | null = null;

// Keep track of server states
const serverStates = new Map<string, McpServerState>();

export function getOrCreateAggregatedClient(): AggregatedMcpClient {
  if (!aggregatedClient) {
    aggregatedClient = new AggregatedMcpClient();
  }
  return aggregatedClient;
}

export async function startMcpServer(
  serverConfig: McpServerConfig,
  mainWindow: BrowserWindow
): Promise<boolean> {
  try {
    const client = getOrCreateAggregatedClient();
    
    // Convert config to internal format
    const internalConfig = adaptMcpServerConfig(serverConfig);
    
    // Add server to aggregated client
    await client.addServer(internalConfig);
    
    // Start if not already running
    await client.start();

    // Update server state
    const state: McpServerState = {
      id: serverConfig.id,
      name: serverConfig.name,
      status: McpServerStatus.Running,
      tools: [], // Will be updated by event handler
      error: undefined,
      startTime: Date.now(),
      lastResponseTime: Date.now()
    };
    serverStates.set(serverConfig.id, state);

    // Set up event handlers if not already set
    client.on(McpEventType.StatusChange, (event) => {
      const state = serverStates.get(event.serverId);
      if (state) {
        state.status = event.data;
        state.lastResponseTime = Date.now();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('mcp-server-status-change', state);
        }
      }
    });

    client.on(McpEventType.Error, (event) => {
      const state = serverStates.get(event.serverId);
      if (state) {
        state.error = event.data.message;
        state.status = McpServerStatus.Error;
        state.lastResponseTime = Date.now();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('mcp-server-status-change', state);
        }
      }
    });

    // Initial tools discovery
    const tools = await client.listTools();
    const serverTools = tools.filter(t => t.serverId === serverConfig.id);
    state.tools = serverTools;
    
    // Notify about status
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mcp-server-status-change', state);
    }

    return true;
  } catch (error) {
    console.error(`Error starting MCP server ${serverConfig.name}:`, error);
    
    // Update server state with error
    const errorState: McpServerState = {
      id: serverConfig.id,
      name: serverConfig.name,
      status: McpServerStatus.Error,
      tools: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      startTime: Date.now(),
      lastResponseTime: Date.now()
    };
    serverStates.set(serverConfig.id, errorState);

    // Notify about error state
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mcp-server-status-change', errorState);
    }

    return false;
  }
}

export async function stopMcpServer(serverId: string, mainWindow: BrowserWindow): Promise<boolean> {
  if (!aggregatedClient) return false;

  try {
    // Get the existing state to preserve the name
    const existingState = serverStates.get(serverId);
    const serverName = existingState?.name || 'Unknown Server';

    await aggregatedClient.removeServer(serverId);
    serverStates.delete(serverId);

    // Notify about server stop
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mcp-server-status-change', {
        id: serverId,
        name: serverName,
        status: McpServerStatus.Stopped,
        tools: [],
        error: null,
        startTime: Date.now(),
        lastResponseTime: Date.now()
      });
    }

    return true;
  } catch (error) {
    console.error(`Error stopping MCP server ${serverId}:`, error);
    return false;
  }
}

export function getMcpServerStatus(serverId: string): McpServerState | null {
  return serverStates.get(serverId) || null;
}

export function getAllMcpServers(): McpServerState[] {
  return Array.from(serverStates.values());
}

export async function startAutoStartServers(
  servers: McpServerConfig[],
  mainWindow: BrowserWindow
): Promise<void> {
  const autoStartServers = servers.filter(s => s.enabled && s.autoStart);
  
  for (const server of autoStartServers) {
    try {
      await startMcpServer(server, mainWindow);
    } catch (error) {
      console.error(`Error auto-starting server ${server.name}:`, error);
    }
  }
}

export async function stopAllMcpServers(): Promise<void> {
  if (!aggregatedClient) return;

  try {
    await aggregatedClient.stop();
    serverStates.clear();
  } catch (error) {
    console.error('Error stopping all servers:', error);
  }
}

// Function to call a tool using its namespaced name
export async function callTool(
  namespacedToolName: string,
  args: Record<string, any>
): Promise<any> {
  if (!aggregatedClient) {
    throw new Error('No MCP client available');
  }

  return aggregatedClient.callTool(namespacedToolName, args);
}

// Function to call a tool using its namespaced name
export async function callToolByNamespace(
  namespacedTool: string,
  args: Record<string, any>
): Promise<any> {
  if (!aggregatedClient) {
    throw new Error('No MCP client available');
  }

  return aggregatedClient.callTool(namespacedTool, args);
} 