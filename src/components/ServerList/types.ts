import { McpServerConfig, McpServerState, NgrokState, McpTool, McpServerStatus } from '../../types';

export interface ServerListProps {
  servers: McpServerConfig[];
  serverStates: McpServerState[];
  ngrokStatus: NgrokState | null;
  onSaveServers: (servers: McpServerConfig[]) => void;
  onStartServer: (serverId: string) => void;
  onStopServer: (serverId: string) => void;
  onStartNgrok: (port: number) => void;
  onStopNgrok: () => void;
}

export interface ToolCardProps {
  tool: McpTool;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export interface ServerWithState extends McpServerConfig {
  status: McpServerStatus;
  error?: string;
  tools?: McpTool[];
  port?: number;
  startTime?: number;
  lastResponseTime?: number;
}

export interface ServerMetrics {
  totalTools: number;
  enabledTools: number;
  hasErrors: boolean;
  uptimeMin: number;
}

export interface ServerHealth {
  status: 'healthy' | 'warning' | 'error' | 'stopped' | 'unknown';
  message: string;
} 