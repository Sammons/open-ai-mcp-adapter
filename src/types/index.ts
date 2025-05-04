// MCP Server configuration
export interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  workingDir?: string;
  enabled: boolean;
  autoStart: boolean;
}

// MCP Server status
export enum McpServerStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  Running = 'running',
  Error = 'error'
}

// MCP Server state
export interface McpServerState {
  id: string;
  status: McpServerStatus;
  pid?: number;
  error?: string;
  port?: number;
  tools?: McpTool[];
  startTime?: number;
}

// MCP Tool definition
export interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, McpToolParameter>;
}

// MCP Tool parameter
export interface McpToolParameter {
  type: string;
  description: string;
  required: boolean;
}

// Ngrok configuration
export interface NgrokConfig {
  authToken: string;
  enabled: boolean;
  autoStart: boolean;
  domain?: string;
}

// Ngrok connection status
export enum NgrokStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error'
}

// Ngrok state
export interface NgrokState {
  status: NgrokStatus;
  url?: string;
  error?: string;
  connectedSince?: number;
}

// Application configuration
export interface AppConfig {
  mcpServers: McpServerConfig[];
  ngrok: NgrokConfig;
}

// Electron Window API
export interface ElectronAPI {
  // Configuration management
  getConfig: () => Promise<AppConfig>;
  saveConfig: (config: AppConfig) => Promise<boolean>;
  
  // MCP server management
  startMcpServer: (serverConfig: McpServerConfig) => Promise<boolean>;
  stopMcpServer: (serverId: string) => Promise<boolean>;
  getMcpServerStatus: (serverId: string) => Promise<McpServerState>;
  getAllMcpServers: () => Promise<McpServerState[]>;
  
  // Ngrok management
  startNgrok: (options: any) => Promise<boolean>;
  stopNgrok: () => Promise<boolean>;
  getNgrokStatus: () => Promise<NgrokState>;
  
  // Event listeners
  onMcpServerStatusChange: (callback: (event: any, data: McpServerState) => void) => () => void;
  onNgrokStatusChange: (callback: (event: any, data: NgrokState) => void) => () => void;
}

// Add the ElectronAPI type to the Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 