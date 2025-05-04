import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { McpServerConfig, McpServerState, McpServerStatus } from '../../src/types';
import { BrowserWindow } from 'electron';
import { promisify } from 'util';
import * as fs from 'fs';
import * as net from 'net';

// Keep track of running MCP servers
const mcpServers = new Map<string, {
  process: ChildProcess;
  config: McpServerConfig;
  state: McpServerState;
}>();

// Find an available port
async function findAvailablePort(startPort: number = 8000): Promise<number> {
  let port = startPort;
  let maxAttempts = 100;
  
  while (maxAttempts > 0) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.once('listening', () => {
          server.close(() => resolve());
        });
        server.listen(port);
      });
      return port;
    } catch (error) {
      port++;
      maxAttempts--;
    }
  }
  
  throw new Error('Could not find an available port');
}

// Start an MCP server
export async function startMcpServer(
  serverConfig: McpServerConfig,
  mainWindow: BrowserWindow
): Promise<boolean> {
  if (mcpServers.has(serverConfig.id)) {
    return false; // Server already running
  }
  
  try {
    // Update server state
    const state: McpServerState = {
      id: serverConfig.id,
      status: McpServerStatus.Starting,
      startTime: Date.now()
    };
    
    // Find an available port
    const port = await findAvailablePort();
    
    // Prepare command line arguments
    const args = [...(serverConfig.args || [])];
    
    // Start the process
    const mcpProcess = spawn(serverConfig.command, args, {
      cwd: serverConfig.workingDir || process.cwd(),
      env: {
        ...process.env,
        PORT: port.toString(),
        MCP_PORT: port.toString()
      },
      shell: true
    });
    
    mcpProcess.stdout?.on('data', (data) => {
      console.log(`[MCP ${serverConfig.name}] stdout: ${data.toString()}`);
      // You could parse stdout for tools and other info here
    });
    
    mcpProcess.stderr?.on('data', (data) => {
      console.error(`[MCP ${serverConfig.name}] stderr: ${data.toString()}`);
    });
    
    mcpProcess.on('error', (error) => {
      state.status = McpServerStatus.Error;
      state.error = error.message;
      mainWindow.webContents.send('mcp-server-status-change', state);
    });
    
    mcpProcess.on('exit', (code) => {
      console.log(`[MCP ${serverConfig.name}] exited with code ${code}`);
      state.status = McpServerStatus.Stopped;
      mcpServers.delete(serverConfig.id);
      mainWindow.webContents.send('mcp-server-status-change', state);
    });
    
    // Store server info
    state.status = McpServerStatus.Running;
    state.pid = mcpProcess.pid;
    state.port = port;
    
    mcpServers.set(serverConfig.id, {
      process: mcpProcess,
      config: serverConfig,
      state
    });
    
    // Notify about status change
    mainWindow.webContents.send('mcp-server-status-change', state);
    
    return true;
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    
    const state: McpServerState = {
      id: serverConfig.id,
      status: McpServerStatus.Error,
      error: error instanceof Error ? error.message : String(error)
    };
    
    mainWindow.webContents.send('mcp-server-status-change', state);
    return false;
  }
}

// Stop an MCP server
export async function stopMcpServer(serverId: string): Promise<boolean> {
  const server = mcpServers.get(serverId);
  if (!server) {
    return false;
  }
  
  try {
    if (process.platform === 'win32') {
      // Windows requires different termination approach
      spawn('taskkill', ['/pid', server.process.pid?.toString() || '', '/f', '/t']);
    } else {
      server.process.kill('SIGINT');
    }
    
    // Give process some time to terminate gracefully
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!mcpServers.has(serverId)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Force cleanup after timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        if (mcpServers.has(serverId)) {
          try {
            server.process.kill('SIGKILL');
          } catch (error) {
            console.error('Error force killing process:', error);
          }
          mcpServers.delete(serverId);
        }
        resolve();
      }, 5000);
    });
    
    return true;
  } catch (error) {
    console.error('Error stopping MCP server:', error);
    return false;
  }
}

// Get status of specific MCP server
export function getMcpServerStatus(serverId: string): McpServerState {
  const server = mcpServers.get(serverId);
  if (!server) {
    return {
      id: serverId,
      status: McpServerStatus.Stopped
    };
  }
  
  return server.state;
}

// Get status of all MCP servers
export function getAllMcpServers(): McpServerState[] {
  return Array.from(mcpServers.values()).map(server => server.state);
}

// Start all enabled servers with autoStart
export async function startAutoStartServers(
  servers: McpServerConfig[],
  mainWindow: BrowserWindow
): Promise<void> {
  const autoStartServers = servers.filter(server => server.enabled && server.autoStart);
  
  for (const serverConfig of autoStartServers) {
    await startMcpServer(serverConfig, mainWindow);
  }
}

// Stop all running MCP servers
export async function stopAllMcpServers(): Promise<void> {
  for (const serverId of mcpServers.keys()) {
    await stopMcpServer(serverId);
  }
} 