import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { McpServerConfig, McpServerStatus, McpTool, StdioMcpServerConfig } from '../types';
import { TransportHandler } from '../transport-handler';
import { McpResource, McpPrompt, McpCapabilities, McpResourceParameter } from '../../../src/types/capabilities';

export class StdioTransportHandler extends EventEmitter implements TransportHandler {
    private mcpClient: Client | null = null;
    private transport: StdioClientTransport | null = null;
    private config: StdioMcpServerConfig;

    constructor(config: McpServerConfig) {
        super();
        if (config.transportConfig.type !== 'stdio') {
            throw new Error('Invalid transport type for STDIO handler');
        }
        this.config = config.transportConfig.config;
    }

    public async connect(): Promise<void> {
        try {
            // Create transport
            this.transport = new StdioClientTransport({
                command: this.config.command,
                args: this.config.args || [],
                env: this.config.environmentVariables
            });

            // Create client
            this.mcpClient = new Client({
                transport: this.transport,
                name: 'mcp-adapter',
                version: '1.0.0'
            });

            await this.mcpClient.connect(this.transport);
            this.emit('status-change', McpServerStatus.Running);

        } catch (error) {
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
                .filter(tool => !tool.disabled)
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
        if (!this.mcpClient) {
            return {
                error: true,
                message: 'Client not connected'
            };
        }

        try {
            const response = await this.mcpClient.callTool({
                name: toolName,
                arguments: args
            });
            return response.result;
        } catch (error) {
            return {
                error: true,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
} 