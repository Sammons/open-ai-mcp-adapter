import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  SelectChangeEvent
} from '@mui/material';
import { McpServerState, McpServerStatus, NgrokState, NgrokStatus, McpTool } from '../types';

interface SchemaGeneratorProps {
  mcpServers: McpServerState[];
  ngrokStatus: NgrokState | null;
}

const SchemaGenerator: React.FC<SchemaGeneratorProps> = ({
  mcpServers,
  ngrokStatus
}) => {
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [generatedSchema, setGeneratedSchema] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [copying, setCopying] = useState<boolean>(false);

  // Reset selected server if it's no longer available
  useEffect(() => {
    if (selectedServerId) {
      const serverExists = mcpServers.some(server => 
        server.id === selectedServerId && server.status === McpServerStatus.Running
      );
      
      if (!serverExists) {
        setSelectedServerId('');
        setGeneratedSchema('');
      }
    }
  }, [mcpServers, selectedServerId]);

  // Generate tool schema for OpenAI plugins
  const generateToolSchema = (serverId: string) => {
    const server = mcpServers.find(s => s.id === serverId);
    if (!server || !server.tools || server.tools.length === 0) {
      return '';
    }

    const ngrokUrl = ngrokStatus?.url;
    if (!ngrokUrl) {
      return '';
    }

    // Format the tools in OpenAI Actions format
    const toolsSchema = server.tools.map(tool => formatToolForOpenAI(tool));
    
    return JSON.stringify(toolsSchema, null, 2);
  };

  // Format a single MCP tool for OpenAI
  const formatToolForOpenAI = (tool: McpTool) => {
    // Convert MCP tool parameters to OpenAI format
    const parameters: any = {
      type: 'object',
      properties: {},
      required: []
    };

    // Add each parameter
    Object.entries(tool.parameters).forEach(([name, param]) => {
      parameters.properties[name] = {
        type: param.type.toLowerCase(),
        description: param.description
      };
      
      if (param.required) {
        parameters.required.push(name);
      }
    });

    // If no required parameters, remove the required array
    if (parameters.required.length === 0) {
      delete parameters.required;
    }

    // Return the formatted tool
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters
      }
    };
  };

  // Handle server selection change
  const handleServerChange = (event: SelectChangeEvent<string>) => {
    const serverId = event.target.value;
    setSelectedServerId(serverId);
    
    if (serverId) {
      const schema = generateToolSchema(serverId);
      setGeneratedSchema(schema);
    } else {
      setGeneratedSchema('');
    }
  };

  // Copy schema to clipboard
  const handleCopySchema = async () => {
    if (!generatedSchema) return;
    
    setCopying(true);
    try {
      await navigator.clipboard.writeText(generatedSchema);
      setCopySuccess(true);
    } catch (err) {
      console.error('Failed to copy schema:', err);
    } finally {
      setCopying(false);
    }
  };

  // Get running servers
  const runningServers = mcpServers.filter(server => 
    server.status === McpServerStatus.Running && server.tools && server.tools.length > 0
  );

  // Check if ngrok is connected
  const isNgrokConnected = ngrokStatus?.status === NgrokStatus.Connected;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>Schema Generator for OpenAI</Typography>
      
      {!isNgrokConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You need to connect to ngrok first to generate a working schema.
        </Alert>
      )}
      
      {runningServers.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No running MCP servers with tools available. Start a server to generate a schema.
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Server Selection</Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="server-select-label">Select MCP Server</InputLabel>
          <Select
            labelId="server-select-label"
            id="server-select"
            value={selectedServerId}
            onChange={handleServerChange}
            label="Select MCP Server"
            disabled={runningServers.length === 0 || !isNgrokConnected}
          >
            <MenuItem value="">
              <em>Select a server</em>
            </MenuItem>
            {runningServers.map(server => (
              <MenuItem key={server.id} value={server.id}>
                {/* Use id as fallback since name isn't in McpServerState */}
                {server.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedServerId && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              OpenAI Actions Schema
            </Typography>
            
            <TextField
              multiline
              fullWidth
              rows={15}
              value={generatedSchema}
              variant="outlined"
              InputProps={{
                readOnly: true,
              }}
              sx={{ fontFamily: 'monospace', mb: 2 }}
            />
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleCopySchema}
              disabled={!generatedSchema || copying}
              startIcon={copying ? <CircularProgress size={20} /> : undefined}
            >
              {copying ? 'Copying...' : 'Copy to Clipboard'}
            </Button>
          </>
        )}
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>How to Use the Schema</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="body1" paragraph>
              This schema generator helps you create the necessary configuration for connecting your MCP server to OpenAI's ChatGPT.
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Divider />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Steps to use with ChatGPT:
            </Typography>
            
            <Typography variant="body2" paragraph>
              1. Make sure your MCP server is running and exposed via ngrok
            </Typography>
            
            <Typography variant="body2" paragraph>
              2. Select your server from the dropdown above
            </Typography>
            
            <Typography variant="body2" paragraph>
              3. Copy the generated schema 
            </Typography>
            
            <Typography variant="body2" paragraph>
              4. In ChatGPT, create a new GPT and add the schema to the Actions section
            </Typography>
            
            <Typography variant="body2" paragraph>
              5. Set the API endpoint URL to your ngrok URL
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        message="Schema copied to clipboard!"
      />
    </Box>
  );
};

export default SchemaGenerator; 