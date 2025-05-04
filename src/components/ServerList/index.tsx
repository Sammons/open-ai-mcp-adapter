import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, List } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Add as AddIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { McpServerConfig, McpProtocolType, McpServerStatus, NgrokState } from '../../types';
import { ServerListProps, ServerWithState } from './types';
import { ServerDialog } from './ServerDialog';
import { ServerListItem } from './ServerListItem';

const ServerList: React.FC<ServerListProps> = ({
  servers,
  serverStates,
  ngrokStatus,
  onSaveServers,
  onStartServer,
  onStopServer,
  onStartNgrok,
  onStopNgrok
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editServer, setEditServer] = useState<McpServerConfig | null>(null);
  const initialServerState: McpServerConfig = {
    id: uuidv4(),
    name: '',
    enabled: true,
    autoStart: false,
    protocolType: McpProtocolType.STDIO,
    command: '',
    args: [],
    workingDir: '',
    remoteUrl: ''
  };
  const [tempServer, setTempServer] = useState<McpServerConfig>(initialServerState);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [disabledTools, setDisabledTools] = useState<Record<string, Set<string>>>({});
  
  // Load disabled tools from localStorage
  useEffect(() => {
    const savedDisabledTools = localStorage.getItem('disabledTools');
    if (savedDisabledTools) {
      const parsed = JSON.parse(savedDisabledTools);
      // Convert JSON objects back to Sets
      const converted: Record<string, Set<string>> = {};
      Object.entries(parsed).forEach(([serverId, tools]) => {
        converted[serverId] = new Set(tools as string[]);
      });
      setDisabledTools(converted);
    }
  }, []);

  // Save disabled tools to localStorage
  const saveDisabledTools = (newDisabledTools: Record<string, Set<string>>) => {
    // Convert Sets to arrays for JSON serialization
    const toSave = Object.fromEntries(
      Object.entries(newDisabledTools).map(([serverId, tools]) => [
        serverId,
        Array.from(tools)
      ])
    );
    localStorage.setItem('disabledTools', JSON.stringify(toSave));
    setDisabledTools(newDisabledTools);
  };

  // Get server state by ID with type safety
  const getServerState = (serverId: string): ServerWithState | undefined => {
    const serverState = serverStates.find(state => state.id === serverId);
    const server = servers.find(s => s.id === serverId);
    
    if (!serverState || !server) return undefined;

    return {
      ...server,
      status: serverState.status,
      error: serverState.error,
      tools: serverState.tools,
      port: serverState.port,
      startTime: serverState.startTime,
      lastResponseTime: serverState.lastResponseTime
    };
  };

  // Open dialog to add a new server
  const handleAddServer = () => {
    setEditServer(null);
    setTempServer(initialServerState);
    setDialogOpen(true);
  };
  
  // Save changes from the dialog
  const handleSaveServer = () => {
    let updatedServers: McpServerConfig[];
    if (editServer) {
      // Update existing server
      updatedServers = servers.map(server => 
        server.id === tempServer.id ? tempServer : server
      );
    } else {
      // Add new server
      updatedServers = [...servers, tempServer];
    }
    
    onSaveServers(updatedServers);
    setDialogOpen(false);
  };
  
  // Handle server toggle operations
  const handleToggleEnabled = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    const updatedServers = servers.map(s => 
      s.id === serverId ? { ...s, enabled: !s.enabled } : s
    );
    onSaveServers(updatedServers);
  };

  const handleToggleAutoStart = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    const updatedServers = servers.map(s => 
      s.id === serverId ? { ...s, autoStart: !s.autoStart } : s
    );
    onSaveServers(updatedServers);
  };

  // Handle tool toggle
  const handleToggleTool = (serverId: string, toolName: string, enabled: boolean) => {
    const newDisabledTools = { ...disabledTools };
    if (!newDisabledTools[serverId]) {
      newDisabledTools[serverId] = new Set();
    }
    
    if (enabled) {
      newDisabledTools[serverId].delete(toolName);
    } else {
      newDisabledTools[serverId].add(toolName);
    }
    
    saveDisabledTools(newDisabledTools);
  };
  
  // Handle input changes in the dialog
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    
    setTempServer(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle changes to args (comma-separated)
  const handleArgsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    
    // Split by commas and trim whitespace
    const args = value.split(',').map(arg => arg.trim()).filter(arg => arg);
    
    setTempServer(prev => ({
      ...prev,
      args
    }));
  };
  
  // Handle protocol type change
  const handleProtocolChange = (event: SelectChangeEvent) => {
    setTempServer(prev => ({
      ...prev,
      protocolType: event.target.value as McpProtocolType
    }));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">MCP Servers</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddServer}
        >
          Add Server
        </Button>
      </Box>
      
      <Paper sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {servers.length === 0 ? (
          <Typography align="center" sx={{ p: 4 }}>
            No MCP servers configured. Click "Add Server" to get started.
          </Typography>
        ) : (
          <List>
            {servers.map((server) => (
              <ServerListItem
                key={server.id}
                server={server}
                serverState={getServerState(server.id)}
                ngrokStatus={ngrokStatus}
                disabledTools={disabledTools}
                isExpanded={expandedServer === server.id}
                onExpand={(expanded) => setExpandedServer(expanded ? server.id : null)}
                onToggleEnabled={handleToggleEnabled}
                onToggleAutoStart={handleToggleAutoStart}
                onStartServer={onStartServer}
                onStopServer={onStopServer}
                onStartNgrok={onStartNgrok}
                onStopNgrok={onStopNgrok}
                onToggleTool={handleToggleTool}
              />
            ))}
          </List>
        )}
      </Paper>
      
      <ServerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        server={tempServer}
        isEdit={!!editServer}
        onSave={handleSaveServer}
        onInputChange={handleInputChange}
        onArgsChange={handleArgsChange}
        onProtocolChange={handleProtocolChange}
      />
    </Box>
  );
};

export default ServerList; 