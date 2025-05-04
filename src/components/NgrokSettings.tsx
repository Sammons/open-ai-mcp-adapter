import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Chip,
  Grid,
  CircularProgress
} from '@mui/material';
import { NgrokConfig, NgrokState, NgrokStatus } from '../types';

interface NgrokSettingsProps {
  ngrokConfig: NgrokConfig;
  ngrokStatus: NgrokState | null;
  onSaveConfig: (config: NgrokConfig) => void;
  onStartNgrok: (port: number) => void;
  onStopNgrok: () => void;
}

const NgrokSettings: React.FC<NgrokSettingsProps> = ({
  ngrokConfig,
  ngrokStatus,
  onSaveConfig,
  onStartNgrok,
  onStopNgrok
}) => {
  const [config, setConfig] = useState<NgrokConfig>(ngrokConfig);
  const [port, setPort] = useState<string>('3000');

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save configuration
  const handleSaveConfig = () => {
    onSaveConfig(config);
  };

  // Start ngrok
  const handleStartNgrok = () => {
    const portNumber = parseInt(port, 10);
    if (!isNaN(portNumber) && portNumber > 0) {
      onStartNgrok(portNumber);
    }
  };

  // Format connection time
  const formatConnectionTime = (timestamp?: number): string => {
    if (!timestamp) return 'N/A';
    
    const duration = Math.floor((Date.now() - timestamp) / 1000);
    
    if (duration < 60) return `${duration} seconds`;
    if (duration < 3600) return `${Math.floor(duration / 60)} minutes`;
    return `${Math.floor(duration / 3600)} hours`;
  };

  // Get status chip
  const getStatusChip = (status: NgrokStatus) => {
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    
    switch (status) {
      case NgrokStatus.Connected:
        color = 'success';
        break;
      case NgrokStatus.Error:
        color = 'error';
        break;
      case NgrokStatus.Connecting:
        color = 'warning';
        break;
      default:
        color = 'default';
    }
    
    return <Chip label={status} color={color} />;
  };

  const isConnected = ngrokStatus?.status === NgrokStatus.Connected;
  const isConnecting = ngrokStatus?.status === NgrokStatus.Connecting;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>Ngrok Settings</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Connection Status</Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            {ngrokStatus ? getStatusChip(ngrokStatus.status) : <Chip label="Unknown" />}
          </Grid>
          
          {isConnected && ngrokStatus?.url && (
            <Grid item xs={12} sm={true}>
              <Typography variant="body1">
                URL: <a href={ngrokStatus.url} target="_blank" rel="noopener noreferrer">{ngrokStatus.url}</a>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Connected for: {formatConnectionTime(ngrokStatus.connectedSince)}
              </Typography>
            </Grid>
          )}
          
          {ngrokStatus?.error && (
            <Grid item xs={12}>
              <Typography color="error">{ngrokStatus.error}</Typography>
            </Grid>
          )}
          
          <Grid item>
            {isConnected ? (
              <Button 
                variant="outlined" 
                color="error" 
                onClick={onStopNgrok}
              >
                Disconnect
              </Button>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  label="Port"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  type="number"
                  size="small"
                  sx={{ width: 100 }}
                />
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleStartNgrok}
                  disabled={isConnecting}
                  startIcon={isConnecting ? <CircularProgress size={20} /> : undefined}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Configuration</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Ngrok Auth Token"
              name="authToken"
              value={config.authToken}
              onChange={handleInputChange}
              helperText="Your ngrok authentication token from ngrok.com"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Reserved Domain (Optional)"
              name="domain"
              value={config.domain || ''}
              onChange={handleInputChange}
              helperText="If you have a reserved domain with ngrok"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={handleInputChange}
                  name="enabled"
                />
              }
              label="Enable Ngrok Integration"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.autoStart}
                  onChange={handleInputChange}
                  name="autoStart"
                />
              }
              label="Auto-start on Application Launch"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSaveConfig}
            >
              Save Configuration
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Ngrok Setup Help</Typography>
        <Typography variant="body1">
          Ngrok allows you to expose your local MCP servers to the internet, making them accessible to OpenAI's ChatGPT.
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          1. Register for a free account at <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer">ngrok.com</a>
        </Typography>
        <Typography variant="body2">
          2. Get your auth token from your ngrok dashboard
        </Typography>
        <Typography variant="body2">
          3. Enter your auth token above and save the configuration
        </Typography>
        <Typography variant="body2">
          4. Connect to an MCP server's port to expose it via ngrok
        </Typography>
      </Paper>
    </Box>
  );
};

export default NgrokSettings; 