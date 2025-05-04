import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  Divider
} from '@mui/material';
import {
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import { McpServerState, McpServerStatus, NgrokState, NgrokStatus, ApiServerState, ApiServerStatus } from '../types';

interface StatusBarProps {
  serverStates: McpServerState[];
  ngrokStatus: NgrokState;
  apiServerState: ApiServerState;
  onRefresh: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  serverStates,
  ngrokStatus,
  apiServerState,
  onRefresh
}) => {
  // Calculate metrics
  const activeServers = serverStates.filter(s => s.status === McpServerStatus.Running).length;
  const totalServers = serverStates.length;
  const totalTools = serverStates.reduce((sum, server) => sum + (server.tools?.length || 0), 0);
  const enabledTools = serverStates.reduce((sum, server) => {
    if (server.status === McpServerStatus.Running) {
      return sum + (server.tools?.length || 0);
    }
    return sum;
  }, 0);
  
  const hasErrors = serverStates.some(s => s.error) || 
                   ngrokStatus.error || 
                   apiServerState.status === ApiServerStatus.Error;

  // Get status color
  const getStatusColor = () => {
    if (hasErrors) return 'error';
    if (activeServers === 0) return 'warning';
    return 'success';
  };

  // Get Ngrok status chip
  const getNgrokStatusChip = () => {
    switch (ngrokStatus.status) {
      case NgrokStatus.Connected:
        return (
          <Tooltip title={`Ngrok URL: ${ngrokStatus.url}`}>
            <Chip
              icon={<CloudIcon />}
              label="Ngrok Connected"
              color="success"
              size="small"
            />
          </Tooltip>
        );
      case NgrokStatus.Error:
        return (
          <Tooltip title={`Ngrok Error: ${ngrokStatus.error}`}>
            <Chip
              icon={<ErrorIcon />}
              label="Ngrok Error"
              color="error"
              size="small"
            />
          </Tooltip>
        );
      default:
        return (
          <Chip
            icon={<CloudIcon />}
            label="Ngrok Disconnected"
            color="default"
            size="small"
          />
        );
    }
  };

  // Get API server status chip
  const getApiServerStatusChip = () => {
    switch (apiServerState.status) {
      case ApiServerStatus.Running:
        return (
          <Tooltip title={`API Server: ${apiServerState.url}`}>
            <Chip
              icon={<CheckCircleIcon />}
              label="API Server Running"
              color="success"
              size="small"
            />
          </Tooltip>
        );
      case ApiServerStatus.Error:
        return (
          <Tooltip title={`API Server Error: ${apiServerState.error}`}>
            <Chip
              icon={<ErrorIcon />}
              label="API Server Error"
              color="error"
              size="small"
            />
          </Tooltip>
        );
      default:
        return (
          <Chip
            icon={<WarningIcon />}
            label="API Server Stopped"
            color="warning"
            size="small"
          />
        );
    }
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense">
        {/* Status Icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Tooltip title={hasErrors ? 'Errors Detected' : 'All Systems Operational'}>
            <IconButton size="small" color={getStatusColor()}>
              {hasErrors ? <ErrorIcon /> : <CheckCircleIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Server Stats */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            Servers: {activeServers}/{totalServers}
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Tooltip title="Active/Total Tools">
            <Badge badgeContent={`${enabledTools}/${totalTools}`} color="primary">
              <BuildIcon sx={{ mr: 1 }} />
            </Badge>
          </Tooltip>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Service Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getApiServerStatusChip()}
          {getNgrokStatusChip()}
        </Box>

        {/* Refresh Button */}
        <Box sx={{ ml: 2 }}>
          <Tooltip title="Refresh Status">
            <IconButton size="small" onClick={onRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default StatusBar; 