import { McpServerStatus, NgrokState, ApiServerStatus } from '../../types';

export interface StatusBarProps {
  activeServers: number;
  totalTools: number;
  apiServerStatus: ApiServerStatus;
  ngrokStatus: NgrokState | null;
  hasErrors: boolean;
  onRefresh: () => void;
}

export interface StatusMetrics {
  activeServers: number;
  totalTools: number;
  enabledTools: number;
  serversWithErrors: number;
}

export interface ServiceStatus {
  apiServer: {
    status: ApiServerStatus;
    port?: number;
    uptime?: number;
  };
  ngrok: {
    status: NgrokState | null;
    url?: string;
    connectedSince?: number;
  };
} 