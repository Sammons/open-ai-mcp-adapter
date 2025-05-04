import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { NgrokService } from './ngrok';
import { McpTool } from '../../src/types/index';
import { AggregatedMcpClient } from '../mcp/client-aggregator';

export interface McpCapabilities {
  tools: McpTool[];
  resources: any[];
  prompts: any[];
  sourceServerId: string;
}

export interface LocalServerConfig {
  port: number;
  ngrokEnabled?: boolean;
  ngrokAuthToken?: string;
  ngrokDomain?: string;
  mcpClient?: AggregatedMcpClient;
}

export class LocalServer extends EventEmitter {
  private server: FastifyInstance;
  private port: number;
  private isRunning: boolean = false;
  private ngrokService: NgrokService;
  private capabilities: McpCapabilities | null = null;
  private mainWindow: BrowserWindow;
  private mcpClient: AggregatedMcpClient;

  constructor(config: LocalServerConfig, mainWindow: BrowserWindow) {
    super();
    this.port = config.port;
    this.mainWindow = mainWindow;
    this.mcpClient = config.mcpClient || new AggregatedMcpClient();
    this.server = fastify({
      logger: true,
      trustProxy: true
    });
    
    this.ngrokService = new NgrokService({
      enabled: config.ngrokEnabled || false,
      authToken: config.ngrokAuthToken,
      domain: config.ngrokDomain
    });

    this.setupServer();
  }

  private async setupServer() {
    // Setup CORS
    await this.server.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });

    // Health check endpoint
    this.server.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        capabilities: this.capabilities ? {
          toolCount: this.capabilities.tools.length,
          resourceCount: this.capabilities.resources.length,
          promptCount: this.capabilities.prompts.length
        } : null
      };
    });

    // Error handler
    this.server.setErrorHandler((error, request, reply) => {
      this.emit('error', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message
      });
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      await this.server.listen({ port: this.port, host: 'localhost' });
      this.isRunning = true;
      this.emit('started', { port: this.port });

      // Start ngrok if enabled
      if (this.ngrokService.isEnabled()) {
        await this.ngrokService.start(this.port, this.mainWindow);
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Stop ngrok first if running
      if (this.ngrokService.isEnabled()) {
        await this.ngrokService.stop(this.mainWindow);
      }

      await this.server.close();
      this.isRunning = false;
      this.emit('stopped');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public setPort(port: number): void {
    if (this.isRunning) {
      throw new Error('Cannot change port while server is running');
    }
    this.port = port;
  }

  public async setMcpCapabilities(capabilities: McpCapabilities): Promise<void> {
    this.capabilities = capabilities;
    // Trigger route updates
    await this.updateRoutes();
  }

  private async updateRoutes(): Promise<void> {
    if (!this.capabilities) {
      return;
    }

    // Clear existing dynamic routes
    // Note: Fastify doesn't have a built-in way to remove routes
    // We'll need to recreate the server instance
    const oldServer = this.server;
    this.server = fastify({
      logger: true,
      trustProxy: true
    });

    await this.setupServer();

    // Add new routes based on capabilities
    for (const tool of this.capabilities.tools) {
      const [server, toolName] = tool.name.split('_');
      // The tool name is already in the format: server_toolname
      this.server.post(`/tools/${server}/${tool.name.replace(server + '_', '')}`, async (request, reply) => {
        try {
          const body = request.body as unknown
          
          // Call the tool through the MCP client
          const result = await this.mcpClient.callTool(tool.name, body as Record<string, any>);
          
          reply.send({ result });
        } catch (error) {
          console.error('Error calling tool:', error);
          if (error instanceof Error) {
            reply.status(500).send({ error: error.message });
          } else {
            reply.status(500).send({ error: 'Unknown error' });
          }
        }
      });
    }

    // If server was running, restart it
    if (this.isRunning) {
      await oldServer.close();
      await this.start();
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      ngrokStatus: this.ngrokService.getStatus(),
      capabilities: this.capabilities ? {
        toolCount: this.capabilities.tools.length,
        resourceCount: this.capabilities.resources.length,
        promptCount: this.capabilities.prompts.length
      } : null
    };
  }
} 