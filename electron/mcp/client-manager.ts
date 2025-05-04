import { EventEmitter } from 'events';
import { IMcpClient, McpEvent, McpEventType, McpServerConfig, McpServerState, McpServerStatus, McpTool } from './types';
import { TransportHandler } from './transport-handler';
import { StdioTransportHandler } from './transports/stdio-handler';
import { SSETransportHandler } from './transports/sse-handler';
import { StreamingHTTPTransportHandler } from './transports/streaming-http-handler';
import { McpResource, McpPrompt, McpCapabilities } from '../../src/types/capabilities';

export class MCPClientManager implements IMcpClient {
    private config: McpServerConfig;
    private state: McpServerState;
    private events: EventEmitter;
    private isConnected: boolean = false;
    private transportHandler: TransportHandler;

    constructor(config: McpServerConfig) {
        this.config = config;
        this.events = new EventEmitter();
        this.state = {
            id: config.transportConfig.config.id,
            name: config.transportConfig.config.name,
            status: McpServerStatus.Stopped,
            lastUpdated: Date.now()
        };

        // Create appropriate transport handler based on config
        this.transportHandler = this.createTransportHandler(config);
        
        // Subscribe to transport handler events
        this.transportHandler.on('status-change', this.handleStatusChange.bind(this));
        this.transportHandler.on('error', this.handleError.bind(this));
    }

    private createTransportHandler(config: McpServerConfig): TransportHandler {
        switch (config.transportConfig.type) {
            case 'stdio':
                return new StdioTransportHandler(config);
            case 'sse':
                return new SSETransportHandler(config);
            case 'streaming-http':
                return new StreamingHTTPTransportHandler(config);
            default:
                throw new Error(`Unsupported transport type: ${(config.transportConfig as any).type}`);
        }
    }

    async connect(): Promise<void> {
        try {
            await this.transportHandler.connect();
            this.isConnected = true;
            this.updateState({ status: McpServerStatus.Running });
        } catch (error) {
            this.handleError(error as Error, 'Connection error');
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.transportHandler.disconnect();
            this.isConnected = false;
            this.updateState({ status: McpServerStatus.Stopped });
        } catch (error) {
            this.handleError(error as Error, 'Disconnection error');
            throw error;
        }
    }

    async discoverTools(): Promise<McpTool[]> {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            const tools = await this.transportHandler.discoverTools();
            this.updateState({ tools });
            return tools;
        } catch (error) {
            this.handleError(error as Error, 'Tool discovery error');
            const errorTools = this.createPlaceholderTool('error discovering tools');
            this.updateState({ tools: errorTools });
            return errorTools;
        }
    }

    async discoverResources(): Promise<McpResource[]> {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            const resources = await this.transportHandler.discoverResources();
            this.updateState({ resources });
            return resources;
        } catch (error) {
            this.handleError(error as Error, 'Resource discovery error');
            return [];
        }
    }

    async discoverPrompts(): Promise<McpPrompt[]> {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            const prompts = await this.transportHandler.discoverPrompts();
            this.updateState({ prompts });
            return prompts;
        } catch (error) {
            this.handleError(error as Error, 'Prompt discovery error');
            return [];
        }
    }

    async discoverCapabilities(): Promise<McpCapabilities> {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            const capabilities = await this.transportHandler.discoverCapabilities();
            console.log('Capabilities:', capabilities);
            this.updateState({
                tools: capabilities.tools,
                resources: capabilities.resources,
                prompts: capabilities.prompts
            });
            return capabilities;
        } catch (error) {
            this.handleError(error as Error, 'Capabilities discovery error');
            return {
                tools: this.createPlaceholderTool('error discovering capabilities'),
                resources: [],
                prompts: [],
                sourceServerId: this.config.transportConfig.config.id
            };
        }
    }

    async callTool(toolName: string, args: Record<string, any>): Promise<any> {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            return await this.transportHandler.callTool(toolName, args);
        } catch (error) {
            this.handleError(error as Error, `Tool call error: ${toolName}`);
            throw error;
        }
    }

    public on<T>(event: McpEventType, handler: (event: McpEvent<T>) => void): void {
        this.events.on(event, handler);
    }

    public off<T>(event: McpEventType, handler: (event: McpEvent<T>) => void): void {
        this.events.off(event, handler);
    }

    private handleStatusChange(status: McpServerStatus): void {
        this.updateState({ status });
        this.emit(McpEventType.StatusChange, status);
    }

    private handleError(error: Error, context?: string): void {
        const errorMessage = context ? `${context}: ${error.message}` : error.message;
        this.emit(McpEventType.Error, new Error(errorMessage));
    }

    private updateState(updates: Partial<McpServerState>): void {
        this.state = {
            ...this.state,
            ...updates,
            lastUpdated: Date.now()
        };
        this.emit(McpEventType.StateChange, this.state);
    }

    private emit(type: McpEventType, data: any): void {
        const event: McpEvent = {
            type,
            serverId: this.config.transportConfig.config.id,
            data,
            timestamp: Date.now()
        };
        this.events.emit(type, event);
    }

    private createPlaceholderTool(errorContext: string = ''): McpTool[] {
        const errorSuffix = errorContext ? ` (${errorContext})` : '';
        const serverName = this.config.transportConfig.config.name;

        return [{
            name: `${serverName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tool`,
            description: `Generic tool for ${serverName}${errorSuffix}`,
            parameters: {
                prompt: {
                    type: "string",
                    description: "The prompt to send to the server",
                    required: true
                },
                options: {
                    type: "object",
                    description: "Additional options to control behavior",
                    required: false
                }
            }
        }];
    }
} 