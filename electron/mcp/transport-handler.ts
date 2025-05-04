import { EventEmitter } from 'events';
import { McpTool } from './types';
import { McpResource, McpPrompt, McpCapabilities } from '../../src/types/capabilities';

export interface TransportHandler extends EventEmitter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    discoverTools(): Promise<McpTool[]>;
    discoverResources(): Promise<McpResource[]>;
    discoverPrompts(): Promise<McpPrompt[]>;
    discoverCapabilities(): Promise<McpCapabilities>;
    callTool(toolName: string, args: Record<string, any>): Promise<any>;
} 