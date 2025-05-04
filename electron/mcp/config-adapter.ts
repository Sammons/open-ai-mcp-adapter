import { McpServerConfig as AppMcpServerConfig, McpProtocolType } from '../../src/types';
import { McpServerConfig as InternalMcpServerConfig } from './types';

/**
 * Adapts the application's McpServerConfig to the internal McpServerConfig format
 */
export function adaptMcpServerConfig(appConfig: AppMcpServerConfig): InternalMcpServerConfig {
    const baseConfig = {
        id: appConfig.id,
        name: appConfig.name,
        enabled: appConfig.enabled,
    };

    switch (appConfig.protocolType) {
        case McpProtocolType.STDIO:
            return {
                transportConfig: {
                    type: 'stdio',
                    config: {
                        ...baseConfig,
                        command: appConfig.command || '',
                        workingDir: appConfig.workingDir,
                        args: appConfig.args || [],
                        environmentVariables: {}
                    }
                }
            };

        case McpProtocolType.SSE:
            return {
                transportConfig: {
                    type: 'sse',
                    config: {
                        ...baseConfig,
                        endpoint: appConfig.remoteUrl || `http://localhost:${appConfig.port}`
                    }
                }
            };

        case McpProtocolType.StreamingHTTP:
            return {
                transportConfig: {
                    type: 'streaming-http',
                    config: {
                        ...baseConfig,
                        endpoint: appConfig.remoteUrl || `http://localhost:${appConfig.port}`
                    }
                }
            };

        default:
            throw new Error(`Unsupported protocol type: ${appConfig.protocolType}`);
    }
} 