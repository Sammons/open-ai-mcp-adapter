import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  Grid
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { McpServerConfig, McpServerState, McpServerStatus, NgrokState, NgrokStatus } from '../types';

interface ServerListProps {
  servers: McpServerConfig[];
  serverStates: McpServerState[];
  ngrokStatus: NgrokState | null;
  onSaveServers: (servers: McpServerConfig[]) => void;
  onStartServer: (serverId: string) => void;
  onStopServer: (serverId: string) => void;
  onStartNgrok: (port: number) => void;
  onStopNgrok: () => void;
}

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
  const [tempServer, setTempServer] = useState<McpServerConfig>({
    id: '',
    name: '',
    command: '',
    args: [],
    workingDir: '',
    enabled: true,
    autoStart: false
  });
  
  // Open dialog to add a new server
  const handleAddServer = () => {
    setEditServer(null);
    setTempServer({
      id: uuidv4(),
      name: '',
      command: '',
      args: [],
      workingDir: '',
      enabled: true,
      autoStart: false
    });
    setDialogOpen(true);
  };
  
  // Open dialog to edit an existing server
  const handleEditServer = (server: McpServerConfig) => {
    setEditServer(server);
    setTempServer({ ...server });
    setDialogOpen(true);
  };
  
  // Delete a server
  const handleDeleteServer = (serverId: string) => {
    // First stop the server if it's running
    const serverState = serverStates.find(state => state.id === serverId);
    if (serverState && serverState.status === McpServerStatus.Running) {
      onStopServer(serverId);
    }
    
    // Remove from configuration
    const updatedServers = servers.filter(server => server.id !== serverId);
    onSaveServers(updatedServers);
  };
  
  // Save changes from the dialog
  const handleSaveServer = () => {
    if (!tempServer.name || !tempServer.command) {
      return; // Validation
    }
    
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
  
  // Toggle server enabled state
  const handleToggleEnabled = (serverId: string) => {
    const updatedServers = servers.map(server => {
      if (server.id === serverId) {
        return { ...server, enabled: !server.enabled };
      }
      return server;
    });
    
    onSaveServers(updatedServers);
  };
  
  // Toggle autostart for a server
  const handleToggleAutoStart = (serverId: string) => {
    const updatedServers = servers.map(server => {
      if (server.id === serverId) {
        return { ...server, autoStart: !server.autoStart };
      }
      return server;
    });
    
    onSaveServers(updatedServers);
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
  
  // Get status chip for a server
  const getStatusChip = (status: McpServerStatus) => {
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    
    switch (status) {
      case McpServerStatus.Running:
        color = 'success';
        break;
      case McpServerStatus.Error:
        color = 'error';
        break;
      case McpServerStatus.Starting:
        color = 'warning';
        break;
      default:
        color = 'default';
    }
    
    return <Chip size="small" label={status} color={color} />;
  };
  
  // Get server state by ID
  const getServerState = (serverId: string): McpServerState | undefined => {
    return serverStates.find(state => state.id === serverId);
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
            {servers.map((server, index) => {
              const serverState = getServerState(server.id);
              const status = serverState?.status || McpServerStatus.Stopped;
              const isRunning = status === McpServerStatus.Running;
              const port = serverState?.port;
              
              return (
                <React.Fragment key={server.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <Box>
                        <IconButton edge="end" onClick={() => handleEditServer(server)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton edge="end" onClick={() => handleDeleteServer(server.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{server.name}</Typography>
                          {getStatusChip(status)}
                          {isRunning && port && (
                            <Typography variant="caption">Port: {port}</Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Command: {server.command} {server.args?.join(' ')}
                          </Typography>
                          
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={server.enabled}
                                    onChange={() => handleToggleEnabled(server.id)}
                                    size="small"
                                  />
                                }
                                label="Enabled"
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={server.autoStart}
                                    onChange={() => handleToggleAutoStart(server.id)}
                                    size="small"
                                  />
                                }
                                label="Auto-start"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {!isRunning ? (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="primary"
                                  disabled={!server.enabled || status === McpServerStatus.Starting}
                                  onClick={() => onStartServer(server.id)}
                                >
                                  Start Server
                                </Button>
                              ) : (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    onClick={() => onStopServer(server.id)}
                                  >
                                    Stop Server
                                  </Button>
                                  
                                  {port && (
                                    ngrokStatus && ngrokStatus.status === NgrokStatus.Connected ? (
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        color="warning"
                                        onClick={onStopNgrok}
                                      >
                                        Stop Ngrok
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        color="success"
                                        onClick={() => onStartNgrok(port)}
                                      >
                                        Expose via Ngrok
                                      </Button>
                                    )
                                  )}
                                </Box>
                              )}
                            </Grid>
                          </Grid>
                          
                          {serverState?.error && (
                            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                              Error: {serverState.error}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Paper>
      
      {/* Server Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editServer ? 'Edit MCP Server' : 'Add MCP Server'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Server Name"
            type="text"
            fullWidth
            variant="outlined"
            value={tempServer.name}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="command"
            label="Command"
            type="text"
            fullWidth
            variant="outlined"
            value={tempServer.command}
            onChange={handleInputChange}
            helperText="The command to run the MCP server (e.g., npx, python)"
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="tempArgs"
            label="Command Arguments"
            type="text"
            fullWidth
            variant="outlined"
            value={tempServer.args?.join(', ')}
            onChange={handleArgsChange}
            helperText="Comma-separated list of arguments"
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="workingDir"
            label="Working Directory"
            type="text"
            fullWidth
            variant="outlined"
            value={tempServer.workingDir}
            onChange={handleInputChange}
            helperText="Optional: Working directory for the command"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={tempServer.enabled}
                  onChange={handleInputChange}
                  name="enabled"
                />
              }
              label="Enabled"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={tempServer.autoStart}
                  onChange={handleInputChange}
                  name="autoStart"
                />
              }
              label="Auto-start"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveServer}
            disabled={!tempServer.name || !tempServer.command}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServerList; 