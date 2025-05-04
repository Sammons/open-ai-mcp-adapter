import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { McpServerConfig, McpServerStatus, McpTool, SseMcpServerConfig } from '../types';
import { TransportHandler } from '../transport-handler';
import { McpResource, McpPrompt, McpCapabilities, McpResourceParameter } from '../../../src/types/capabilities';

export class SSETransportHandler extends EventEmitter implements TransportHandler {
    private mcpClient: Client | null = null;
    private transport: SSEClientTransport | null = null;
    private config: SseMcpServerConfig;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number = 3;

    constructor(config: McpServerConfig) {
        super();
        if (config.transportConfig.type !== 'sse') {
            throw new Error('Invalid transport type for SSE handler');
        }
        this.config = config.transportConfig.config;
    }

    private async ensureConnected(): Promise<void> {
        if (!this.isConnected || !this.mcpClient || !this.transport) {
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                throw new Error('Max reconnection attempts reached');
            }
            this.reconnectAttempts++;
            
            // Ensure we clean up any existing connection first
            if (this.mcpClient) {
                try {
                    await this.mcpClient.close();
                } catch (e) {
                    // Ignore close errors
                }
                this.mcpClient = null;
                this.transport = null;
            }
            
            await this.connect();
        }
    }

    private async callWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number = 30000): Promise<T> {
        const timeout = new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
        });

        return Promise.race([operation(), timeout]);
    }

    public async connect(): Promise<void> {
        try {
            // Ensure any existing connection is cleaned up
            if (this.mcpClient) {
                try {
                    await this.mcpClient.close();
                } catch (e) {
                    console.error('Error closing existing connection:', e);
                }
                this.mcpClient = null;
                this.transport = null;
            }

            // Create transport with error handling
            try {
                this.transport = new SSEClientTransport(new URL(this.config.endpoint));
            } catch (error) {
                console.error('Error creating SSE transport:', error);
                throw new Error(`Failed to create SSE transport: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Create client
            this.mcpClient = new Client({
                transport: this.transport,
                name: 'mcp-adapter',
                version: '1.0.0'
            });

            // Connect with timeout
            try {
                await this.callWithTimeout(() => this.mcpClient!.connect(this.transport!));
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('status-change', McpServerStatus.Running);
            } catch (error) {
                console.error('Error connecting to server:', error);
                this.isConnected = false;
                this.mcpClient = null;
                this.transport = null;
                this.emit('error', error);
                this.emit('status-change', McpServerStatus.Error);
                throw error;
            }

        } catch (error) {
            this.isConnected = false;
            console.error('Connection failed:', error);
            this.emit('error', error);
            this.emit('status-change', McpServerStatus.Error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.mcpClient) {
                await this.mcpClient.close();
                this.mcpClient = null;
            }

            this.transport = null;
            this.isConnected = false;
            this.emit('status-change', McpServerStatus.Stopped);

        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    public async discoverTools(): Promise<McpTool[]> {
        if (!this.mcpClient) {
            throw new Error('Client not connected');
        }

        try {
            const response = await this.mcpClient.listTools();
            console.log('Tools:', response.tools);
            return (response.tools || [])
                .filter(tool => !tool.disabled) // Filter out disabled tools
                .map(tool => ({
                    name: tool.name,
                    description: tool.description || `Tool for ${tool.name}`,
                    parameters: tool.inputSchema
                }));
        } catch (error) {
            console.error('Error discovering tools:', error);
            this.emit('error', error);
            throw error;
        }
    }

    public async discoverResources(): Promise<McpResource[]> {
        if (!this.mcpClient) {
            throw new Error('Client not connected');
        }

        try {
            const response = await this.mcpClient.listResources();
            return (response.resources || []).map(resource => ({
                name: resource.name,
                description: resource.description || `Resource ${resource.name}`,
                type: (resource.type as string) || 'unknown',
                parameters: Object.entries(resource.parameters || {}).reduce((acc, [key, param]: [string, any]) => {
                    acc[key] = {
                        type: param.type || 'string',
                        description: param.description || key,
                        required: Array.isArray(resource.required) ? resource.required.includes(key) : false
                    };
                    return acc;
                }, {} as Record<string, McpResourceParameter>),
                sourceServerId: this.config.id
            }));
        } catch (error) {
            this.emit('error', error);
            return [];
        }
    }

    public async discoverPrompts(): Promise<McpPrompt[]> {
        if (!this.mcpClient) {
            throw new Error('Client not connected');
        }

        try {
            const response = await this.mcpClient.listPrompts();
            return (response.prompts || []).map(prompt => ({
                name: prompt.name,
                description: prompt.description || `Prompt ${prompt.name}`,
                template: (prompt.template as string) || '',
                parameters: Object.entries(prompt.parameters || {}).reduce((acc, [key, param]: [string, any]) => {
                    acc[key] = {
                        type: param.type || 'string',
                        description: param.description || key,
                        required: Array.isArray(prompt.required) ? prompt.required.includes(key) : false
                    };
                    return acc;
                }, {} as Record<string, McpResourceParameter>),
                sourceServerId: this.config.id
            }));
        } catch (error) {
            this.emit('error', error);
            return [];
        }
    }

    public async discoverCapabilities(): Promise<McpCapabilities> {
        const [tools, resources, prompts] = await Promise.all([
            this.discoverTools(),
            this.discoverResources(),
            this.discoverPrompts()
        ]);

        return {
            tools,
            resources,
            prompts,
            sourceServerId: this.config.id
        };
    }

    public async callTool(toolName: string, args: Record<string, any>): Promise<any> {
        try {
            console.log('Calling tool:', toolName, args);
            await this.ensureConnected();

            if (!this.mcpClient) {
                return {
                    error: true,
                    message: 'Client not connected'
                };
            }

            try {
                const response = await this.callWithTimeout(() => 
                    this.mcpClient!.callTool({
                        name: toolName,
                        arguments: args
                    })
                );
                console.log('Tool response:', response);
                return response.result;
            } catch (error) {
                console.error('Tool error:', error);
                // If we get a connection error or timeout, try to reconnect once
                if (error instanceof Error && 
                    (error.message.includes('connection') || error.message.includes('timed out'))) {
                    this.isConnected = false;
                    this.mcpClient = null;
                    this.transport = null;
                    
                    await this.ensureConnected();
                    
                    try {
                        // Retry the call once with timeout
                        const response = await this.callWithTimeout(() => 
                            this.mcpClient!.callTool({
                                name: toolName,
                                arguments: args
                            })
                        );
                        return response.result;
                    } catch (retryError) {
                        // If retry also fails, return error object
                        return {
                            error: true,
                            message: retryError instanceof Error ? retryError.message : 'Unknown error during retry'
                        };
                    }
                }
                // For non-connection errors, return error object without emitting
                return {
                    error: true,
                    message: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        } catch (error) {
            // Handle any errors from ensureConnected
            return {
                error: true,
                message: error instanceof Error ? error.message : 'Unknown error during connection'
            };
        }
    }
} 