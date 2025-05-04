import { McpTool as ImportedMcpTool } from '../../src/types';
import { McpResource, McpPrompt, McpCapabilities } from '../../src/types/capabilities';

// Re-export McpTool
export type McpTool = ImportedMcpTool;

/**
 * Base configuration for all MCP servers
 */
export interface BaseMcpServerConfig {
    id: string;
    name: string;
    enabled: boolean;
}

/**
 * Configuration for STDIO transport
 */
export interface StdioMcpServerConfig extends BaseMcpServerConfig {
    command: string;
    workingDir?: string;
    args?: string[];
    environmentVariables: Record<string, string>;
}

/**
 * Configuration for SSE transport
 */
export interface SseMcpServerConfig extends BaseMcpServerConfig {
    endpoint: string;
}

/**
 * Configuration for Streaming HTTP transport
 */
export interface StreamingHttpMcpServerConfig extends BaseMcpServerConfig {
    endpoint: string;
}

/**
 * Combined server configuration type
 */
export type McpServerConfig = {
    transportConfig: 
        | { type: 'stdio'; config: StdioMcpServerConfig }
        | { type: 'sse'; config: SseMcpServerConfig }
        | { type: 'streaming-http'; config: StreamingHttpMcpServerConfig };
    authenticationConfig?: {
        type: string;
        credentials: Record<string, string>;
    };
};

/**
 * Interface for MCP client operations
 */
export interface IMcpClient {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    discoverTools(): Promise<McpTool[]>;
    discoverResources(): Promise<McpResource[]>;
    discoverPrompts(): Promise<McpPrompt[]>;
    discoverCapabilities(): Promise<McpCapabilities>;
    callTool(toolName: string, args: Record<string, any>): Promise<any>;
    
    // Event handling
    on<T>(event: McpEventType, handler: (event: McpEvent<T>) => void): void;
    off<T>(event: McpEventType, handler: (event: McpEvent<T>) => void): void;
}

/**
 * Result of a transport connection attempt
 */
export interface ConnectionResult {
    client: any;
    transport: any;
    transportType: string;
}

/**
 * Event types for MCP client
 */
export enum McpEventType {
    StatusChange = 'status-change',
    ToolsChange = 'tools-change',
    ResourcesChange = 'resources-change',
    PromptsChange = 'prompts-change',
    StateChange = 'state-change',
    Error = 'error',
    ConnectionChange = 'connection-change'
}

/**
 * Event payload interface
 */
export interface McpEvent<T = any> {
    type: McpEventType;
    serverId: string;
    data: T;
    timestamp: number;
}

/**
 * Status types for MCP servers
 */
export enum McpServerStatus {
    Starting = 'starting',
    Running = 'running',
    Stopped = 'stopped',
    Error = 'error'
}

/**
 * Server state interface
 */
export interface McpServerState {
    id: string;
    name: string;
    status: McpServerStatus;
    error?: string;
    tools?: McpTool[];
    resources?: McpResource[];
    prompts?: McpPrompt[];
    lastUpdated: number;
} 