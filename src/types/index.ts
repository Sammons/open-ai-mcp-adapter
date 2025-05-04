import { Tool } from '@modelcontextprotocol/sdk/types';

// MCP Server protocol type
export enum McpProtocolType {
  HTTP = 'http',
  SSE = 'sse',
  StreamingHTTP = 'streaming-http',
  STDIO = 'stdio'
}

// MCP Server configuration
export interface McpServerConfig {
  id: string;
  name: string;
  enabled: boolean;
  autoStart: boolean;
  protocolType: McpProtocolType;
  transport?: McpTransport;
  command?: string;
  args?: string[];
  workingDir?: string;
  remoteUrl?: string;
  port?: number;
  startTime?: number;
  lastResponseTime?: number;
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
  name: string;
  status: McpServerStatus;
  error?: string;
  tools?: McpTool[];
  port?: number;
  startTime?: number;
  lastResponseTime?: number;
  remoteUrl?: string;
}

// MCP Tool definition
export interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  disabled?: boolean;
  inputSchema?: Record<string, any>;
  // Source server ID to track which server this tool belongs to
  sourceServerId?: string;
}

// API Server configuration
export interface ApiServerConfig {
  enabled: boolean;
  port: number;
  autoStart: boolean;
}

// API Server status
export enum ApiServerStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  Running = 'running',
  Error = 'error'
}

// API Server state
export interface ApiServerState {
  status: ApiServerStatus;
  port: number;
  url: string;
  startTime?: number;
  error?: string;
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
  apiServer: ApiServerConfig;
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
  
  // API server management
  startApiServer: () => Promise<boolean>;
  stopApiServer: () => Promise<boolean>;
  getApiServerStatus: () => Promise<ApiServerState>;
  
  // Ngrok management
  startNgrok: (options: any) => Promise<boolean>;
  stopNgrok: () => Promise<boolean>;
  getNgrokStatus: () => Promise<NgrokState>;
  
  // Event listeners
  onMcpServerStatusChange: (callback: (event: any, data: McpServerState) => void) => () => void;
  onApiServerStatusChange: (callback: (event: any, data: ApiServerState) => void) => () => void;
  onNgrokStatusChange: (callback: (event: any, data: NgrokState) => void) => () => void;
}

// Add the ElectronAPI type to the Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type McpTransport =
  | { type: 'stdio'; config: StdioTransportConfig }
  | { type: 'sse'; config: SseTransportConfig }
  | { type: 'streaming-http'; config: StreamingHttpTransportConfig };

export interface StdioTransportConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface SseTransportConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface StreamingHttpTransportConfig {
  url: string;
  headers?: Record<string, string>;
}

// Logging types
export enum LogLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Debug = 'debug'
}

export enum LogSource {
  Server = 'server',
  ApiServer = 'api-server',
  Ngrok = 'ngrok',
  System = 'system'
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: any;
  serverId?: string;
}

export interface LogFilter {
  levels: Set<LogLevel>;
  sources: Set<LogSource>;
  serverIds: Set<string>;
  searchTerm: string;
  startTime?: number;
  endTime?: number;
}

export interface McpServer {
  id: string;
  name: string;
  endpoint: string;
  status: McpServerStatus;
  tools?: McpTool[];
}

export interface McpEvent<T = any> {
  type: string;
  serverId: string;
  data: T;
  timestamp: number;
} 