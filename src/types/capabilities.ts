import { McpTool } from './index';

/**
 * Parameter definition for MCP resources
 */
export interface McpResourceParameter {
    type: string;
    description?: string;
    required?: boolean;
    format?: string;
    default?: any;
    enum?: any[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
}

/**
 * Resource definition for MCP servers
 */
export interface McpResource {
    name: string;
    description: string;
    type: string;
    parameters: Record<string, McpResourceParameter>;
    sourceServerId?: string;
}

/**
 * Prompt definition for MCP servers
 */
export interface McpPrompt {
    name: string;
    description: string;
    template: string;
    parameters: Record<string, McpResourceParameter>;
    sourceServerId?: string;
}

/**
 * Combined capabilities of an MCP server
 */
export interface McpCapabilities {
    tools: McpTool[];
    resources: McpResource[];
    prompts: McpPrompt[];
    sourceServerId: string;
}

/**
 * Response from MCP server capabilities discovery
 */
export interface McpCapabilitiesResponse {
    tools?: McpTool[];
    resources?: McpResource[];
    prompts?: McpPrompt[];
} 