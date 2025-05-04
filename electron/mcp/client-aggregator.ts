import { EventEmitter } from 'events';
import { IMcpClient, McpEvent, McpEventType, McpServerConfig, McpServerStatus } from './types';
import { McpCapabilities, McpPrompt, McpResource } from '../../src/types/capabilities';
import { MCPClientFactory } from './client-factory';
import { normalizeServerName } from '../utils/name-utils';

interface NamespacedTool {
    name: string;            // Original tool name
    namespacedName: string;  // server_name.tool_name format
    description: string;
    parameters: Record<string, any>;
    serverId: string;
    serverName: string;
}

interface NamespacedResource {
    name: string;
    namespacedName: string;  // server_name.resource_name format
    description: string;
    type: string;
    parameters: Record<string, any>;
    serverId: string;
    serverName: string;
}

interface NamespacedPrompt {
    name: string;
    namespacedName: string;  // server_name.prompt_name format
    description: string;
    template: string;
    parameters: Record<string, any>;
    serverId: string;
    serverName: string;
}

/**
 * Client that aggregates multiple MCP clients and their capabilities
 */
export class AggregatedMcpClient extends EventEmitter {
    private clients: Map<string, IMcpClient> = new Map();
    private serverConfigs: Map<string, McpServerConfig> = new Map();
    private isRunning: boolean = false;

    /**
     * Add a new MCP server configuration
     */
    public async addServer(config: McpServerConfig): Promise<void> {
        const serverId = config.transportConfig.config.id;
        if (this.clients.has(serverId)) {
            throw new Error(`Server ${serverId} already exists`);
        }

        try {
            const client = await MCPClientFactory.getOrCreateClient(config);
            this.clients.set(serverId, client);
            this.serverConfigs.set(serverId, config);

            // Forward events from the client
            client.on(McpEventType.Error, this.handleClientError.bind(this));
            client.on(McpEventType.StatusChange, this.handleClientStatusChange.bind(this));
            client.on(McpEventType.StateChange, this.handleClientStateChange.bind(this));

            if (this.isRunning) {
                await client.connect();
            }
        } catch (error) {
            console.error(`Error adding server ${serverId}:`, error);
            throw error;
        }
    }

    /**
     * Remove an MCP server
     */
    public async removeServer(serverId: string): Promise<void> {
        const client = this.clients.get(serverId);
        if (!client) {
            return;
        }

        try {
            await client.disconnect();
            this.clients.delete(serverId);
            this.serverConfigs.delete(serverId);
        } catch (error) {
            console.error(`Error removing server ${serverId}:`, error);
            throw error;
        }
    }

    /**
     * Start all MCP clients
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }

        const connectPromises = Array.from(this.clients.values()).map(client =>
            client.connect().catch(error => {
                console.error('Error connecting client:', error);
                return error;
            })
        );

        await Promise.all(connectPromises);
        this.isRunning = true;
    }

    /**
     * Stop all MCP clients
     */
    public async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        await MCPClientFactory.disconnectAll();
        this.isRunning = false;
    }

    /**
     * List all tools from all clients with server namespacing
     */
    public async listTools(): Promise<NamespacedTool[]> {
        const tools: NamespacedTool[] = [];

        for (const [serverId, client] of this.clients.entries()) {
            const config = this.serverConfigs.get(serverId)!;
            const serverName = config.transportConfig.config.name;
            const normalizedServerName = normalizeServerName(serverName);

            try {
                const serverTools = await client.discoverTools();
                
                for (const tool of serverTools) {
                    tools.push({
                        name: tool.name,
                        namespacedName: `${normalizedServerName}_${tool.name}`,
                        description: tool.description,
                        parameters: tool.parameters,
                        serverId,
                        serverName
                    });
                }
            } catch (error) {
                console.error(`Error discovering tools for server ${serverName}:`, error);
            }
        }

        return tools;
    }

    /**
     * List all resources from all clients with server namespacing
     */
    public async listResources(): Promise<NamespacedResource[]> {
        const resources: NamespacedResource[] = [];

        for (const [serverId, client] of this.clients.entries()) {
            const config = this.serverConfigs.get(serverId)!;
            const serverName = config.transportConfig.config.name;

            try {
                const serverResources = await client.discoverResources();
                
                for (const resource of serverResources) {
                    resources.push({
                        name: resource.name,
                        namespacedName: `${serverName}.${resource.name}`,
                        description: resource.description,
                        type: resource.type,
                        parameters: resource.parameters,
                        serverId,
                        serverName
                    });
                }
            } catch (error) {
                console.error(`Error discovering resources for server ${serverName}:`, error);
            }
        }

        return resources;
    }

    /**
     * List all prompts from all clients with server namespacing
     */
    public async listPrompts(): Promise<NamespacedPrompt[]> {
        const prompts: NamespacedPrompt[] = [];

        for (const [serverId, client] of this.clients.entries()) {
            const config = this.serverConfigs.get(serverId)!;
            const serverName = config.transportConfig.config.name;

            try {
                const serverPrompts = await client.discoverPrompts();
                
                for (const prompt of serverPrompts) {
                    prompts.push({
                        name: prompt.name,
                        namespacedName: `${serverName}.${prompt.name}`,
                        description: prompt.description,
                        template: prompt.template,
                        parameters: prompt.parameters,
                        serverId,
                        serverName
                    });
                }
            } catch (error) {
                console.error(`Error discovering prompts for server ${serverName}:`, error);
            }
        }

        return prompts;
    }

    /**
     * Get aggregated capabilities from all clients with server namespacing
     */
    public async getCapabilities(): Promise<McpCapabilities[]> {
        const capabilities: McpCapabilities[] = [];

        for (const [serverId, client] of this.clients.entries()) {
            try {
                const serverCapabilities = await client.discoverCapabilities();
                if (serverCapabilities) {
                    capabilities.push(serverCapabilities);
                }
            } catch (error) {
                console.error(`Error discovering capabilities for server ${serverId}:`, error);
            }
        }

        return capabilities;
    }

    /**
     * Call a tool using its namespaced name (server_tool)
     * @param namespacedToolName Tool name in format "server_toolname"
     * @param args Tool arguments
     */
    public async callTool(namespacedToolName: string, args: Record<string, any>): Promise<any> {
        const parts = namespacedToolName.split('_');
        if (parts.length < 2) {
            throw new Error('Invalid namespaced tool name. Expected format: "server_tool"');
        }
        
        // First part is the server name, rest is the tool name
        const serverName = parts[0];
        const toolName = parts.slice(1).join('_');

        // Find server ID by normalized name
        const serverEntry = Array.from(this.serverConfigs.entries())
            .find(([_, config]) => {
                const configServerName = config.transportConfig.config.name;
                return normalizeServerName(configServerName) === serverName;
            });
        
        if (!serverEntry) {
            throw new Error(`Server "${serverName}" not found`);
        }
        const serverId = serverEntry[0];

        const client = this.clients.get(serverId);
        if (!client) {
            throw new Error(`Server ${serverId} not found`);
        }

        return await client.callTool(toolName, args);
    }

    private handleClientError(event: McpEvent<Error>): void {
        this.emit(McpEventType.Error, event);
    }

    private handleClientStatusChange(event: McpEvent<McpServerStatus>): void {
        this.emit(McpEventType.StatusChange, event);
    }

    private handleClientStateChange(event: McpEvent<any>): void {
        this.emit(McpEventType.StateChange, event);
    }
} 