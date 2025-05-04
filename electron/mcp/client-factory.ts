import { McpServerConfig } from './types';
import { MCPClientManager } from './client-manager';
import { IMcpClient } from './types';
import { McpCapabilities } from '../../src/types/capabilities';

/**
 * Factory class for creating MCP clients based on transport type
 */
export class MCPClientFactory {
    private static activeClients = new Map<string, IMcpClient>();

    /**
     * Create an MCP client instance based on the transport configuration
     */
    static createClient(config: McpServerConfig): IMcpClient {
        return new MCPClientManager(config);
    }

    /**
     * Get or create a client instance for the given configuration
     */
    static async getOrCreateClient(config: McpServerConfig): Promise<IMcpClient> {
        if (this.activeClients.has(config.transportConfig.config.id)) {
            return this.activeClients.get(config.transportConfig.config.id)!;
        }

        const client = this.createClient(config);
        await client.connect();
        this.activeClients.set(config.transportConfig.config.id, client);
        return client;
    }

    /**
     * Disconnect and remove a client instance
     */
    static async disconnectClient(serverId: string): Promise<boolean> {
        const client = this.activeClients.get(serverId);
        if (!client) {
            return false;
        }

        try {
            await client.disconnect();
            this.activeClients.delete(serverId);
            return true;
        } catch (error) {
            console.error(`Error disconnecting client for server ${serverId}:`, error);
            return false;
        }
    }

    /**
     * Discover capabilities for a specific client
     */
    static async discoverCapabilities(serverId: string): Promise<McpCapabilities | null> {
        const client = this.activeClients.get(serverId);
        if (!client) {
            return null;
        }

        try {
            return await client.discoverCapabilities();
        } catch (error) {
            console.error(`Error discovering capabilities for server ${serverId}:`, error);
            return null;
        }
    }

    /**
     * Get all active clients
     */
    static getActiveClients(): Map<string, IMcpClient> {
        return new Map(this.activeClients);
    }

    /**
     * Disconnect all active clients
     */
    static async disconnectAll(): Promise<void> {
        const disconnectPromises = Array.from(this.activeClients.keys()).map(id => 
            this.disconnectClient(id).catch(error => {
                console.error(`Error disconnecting client ${id}:`, error);
            })
        );
        
        await Promise.all(disconnectPromises);
        this.activeClients.clear();
    }
} 