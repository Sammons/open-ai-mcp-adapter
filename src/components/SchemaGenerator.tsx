import React, { useCallback, useEffect, useState } from 'react';
import { McpServerState, NgrokState, ApiServerState, McpServerStatus } from '../types';
import { Box, Button, Card, CardContent, Checkbox, FormControlLabel, MenuItem, Select, TextField, Typography } from '@mui/material';

interface SchemaGeneratorProps {
    mcpServers: McpServerState[];
    apiServerStatus: ApiServerState | null;
    ngrokStatus: NgrokState | null;
    onStartApiServer: () => void;
}

export const SchemaGenerator: React.FC<SchemaGeneratorProps> = ({ mcpServers, apiServerStatus, ngrokStatus }) => {
    const [selectedServerId, setSelectedServerId] = useState<string>('');
    const [generatedSchema, setGeneratedSchema] = useState<string>('');
    const [error, setError] = useState<string>('');

    const generateSingleServerSchema = useCallback((serverId: string) => {
        const server = mcpServers.find(s => s.id === serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }

        const tools = server.tools || [];
        const baseUrl = ngrokStatus?.url || server.remoteUrl || `http://localhost:${server.port}`;
        
        const openApiSpec = {
            openapi: '3.0.0',
            info: {
                title: `${server.name} API`,
                version: '1.0.0',
                description: `OpenAPI specification for ${server.name}`
            },
            servers: [{
                url: baseUrl,
                description: `${server.name} server${ngrokStatus?.url ? ' (via ngrok)' : ''}`
            }],
            paths: tools.reduce((paths: any, tool) => {
                const path = `/tools/${server.name.toLowerCase()}/${tool.name}`;
                paths[path] = {
                    post: {
                        operationId: `${tool.name}`,
                        summary: tool.description,
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: tool.parameters || {}
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Successful response',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                result: {
                                                    type: 'object',
                                                    description: 'Tool execution result'
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            '500': {
                                description: 'Error response',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                error: {
                                                    type: 'string',
                                                    description: 'Error message'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
                return paths;
            }, {})
        };

        return JSON.stringify(openApiSpec, null, 2);
    }, [mcpServers, ngrokStatus]);

    const generateSchema = useCallback(() => {
        try {
            if (!selectedServerId) {
                throw new Error('Please select a server');
            }
            setGeneratedSchema(generateSingleServerSchema(selectedServerId));
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setGeneratedSchema('');
        }
    }, [selectedServerId, mcpServers, generateSingleServerSchema]);

    useEffect(() => {
        if (selectedServerId) {
            generateSchema();
        }
    }, [mcpServers, selectedServerId, apiServerStatus, ngrokStatus, generateSchema]);

    const handleServerChange = (event: any) => {
        setSelectedServerId(event.target.value);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedSchema);
    };

    const isServerReady = useCallback((server: McpServerState) => {
        return server.status === McpServerStatus.Running;
    }, []);

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" gutterBottom>
                    OpenAPI Schema Generator
                </Typography>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Generate OpenAPI schema for MCP tools
                    </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Select
                        value={selectedServerId}
                        onChange={handleServerChange}
                        fullWidth
                        displayEmpty
                    >
                        <MenuItem value="" disabled>
                            Select a server
                        </MenuItem>
                        {mcpServers.map(server => (
                            <MenuItem
                                key={server.id}
                                value={server.id}
                                disabled={!isServerReady(server)}
                            >
                                {server.name} ({isServerReady(server) ? 'Ready' : 'Not Ready'})
                            </MenuItem>
                        ))}
                    </Select>
                </Box>

                {error && (
                    <Box sx={{ mb: 2 }}>
                        <Typography color="error">{error}</Typography>
                    </Box>
                )}

                {generatedSchema && (
                    <Box>
                        <Box sx={{ mb: 2 }}>
                            <Button variant="contained" onClick={handleCopy}>
                                Copy to Clipboard
                            </Button>
                        </Box>
                        <TextField
                            multiline
                            fullWidth
                            rows={20}
                            value={generatedSchema}
                            variant="outlined"
                            InputProps={{
                                readOnly: true,
                            }}
                        />
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}; 