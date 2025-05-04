import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Tooltip,
  Chip,
  Badge,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CloudOff as CloudOffIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import { StatusBarProps } from './types';
import { ApiServerStatus, NgrokState } from '../../types';

export const StatusBar: React.FC<StatusBarProps> = ({
  activeServers,
  totalTools,
  apiServerStatus,
  ngrokStatus,
  hasErrors,
  onRefresh
}) => {
  const getApiStatusColor = (status: ApiServerStatus): 'success' | 'error' | 'warning' => {
    switch (status) {
      case ApiServerStatus.Running:
        return 'success';
      case ApiServerStatus.Error:
        return 'error';
      default:
        return 'warning';
    }
  };

  const getNgrokStatusIcon = () => {
    if (!ngrokStatus) return <CloudOffIcon />;
    switch (ngrokStatus.status) {
      case 'connected':
        return <CloudIcon color="success" />;
      case 'connecting':
        return <CloudIcon color="warning" />;
      case 'error':
        return <CloudIcon color="error" />;
      default:
        return <CloudOffIcon />;
    }
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
          {/* Server Stats */}
          <Tooltip title="Active MCP Servers">
            <Chip
              label={`Servers: ${activeServers}`}
              color={activeServers > 0 ? 'success' : 'default'}
              size="small"
            />
          </Tooltip>

          {/* Tool Stats */}
          <Tooltip title="Total Available Tools">
            <Chip
              label={`Tools: ${totalTools}`}
              color={totalTools > 0 ? 'primary' : 'default'}
              size="small"
            />
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* API Server Status */}
          <Tooltip title={`API Server: ${apiServerStatus}`}>
            <Chip
              icon={apiServerStatus === ApiServerStatus.Running ? <CheckCircleIcon /> : <WarningIcon />}
              label="API Server"
              color={getApiStatusColor(apiServerStatus)}
              size="small"
            />
          </Tooltip>

          {/* Ngrok Status */}
          <Tooltip title={`Ngrok: ${ngrokStatus?.status || 'disconnected'}${ngrokStatus?.url ? ` (${ngrokStatus.url})` : ''}`}>
            <Chip
              icon={getNgrokStatusIcon()}
              label="Ngrok"
              color={ngrokStatus?.status === 'connected' ? 'success' : 'default'}
              size="small"
            />
          </Tooltip>

          {/* Error Indicator */}
          {hasErrors && (
            <Tooltip title="System has errors. Check logs for details.">
              <IconButton size="small" color="error">
                <ErrorIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Refresh Button */}
        <Tooltip title="Refresh Status">
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}; 