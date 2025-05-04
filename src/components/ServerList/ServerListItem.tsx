import React from 'react';
import {
  ListItem,
  Box,
  Typography,
  Chip,
  Switch,
  FormControlLabel,
  Button,
  Badge,
  Tooltip,
  CircularProgress,
  Collapse
} from '@mui/material';
import { McpServerConfig, McpServerStatus, NgrokState } from '../../types';
import { ServerWithState, ServerMetrics } from './types';
import { ToolCard } from './ToolCard';

interface ServerListItemProps {
  server: McpServerConfig;
  serverState?: ServerWithState;
  ngrokStatus: NgrokState | null;
  disabledTools: Record<string, Set<string>>;
  isExpanded: boolean;
  onExpand: (expanded: boolean) => void;
  onToggleEnabled: (serverId: string) => void;
  onToggleAutoStart: (serverId: string) => void;
  onStartServer: (serverId: string) => void;
  onStopServer: (serverId: string) => void;
  onStartNgrok: (port: number) => void;
  onStopNgrok: () => void;
  onToggleTool: (serverId: string, toolName: string, enabled: boolean) => void;
}

export const ServerListItem: React.FC<ServerListItemProps> = ({
  server,
  serverState,
  ngrokStatus,
  disabledTools,
  isExpanded,
  onExpand,
  onToggleEnabled,
  onToggleAutoStart,
  onStartServer,
  onStopServer,
  onStartNgrok,
  onStopNgrok,
  onToggleTool
}) => {
  const status = serverState?.status || McpServerStatus.Stopped;
  const isRunning = status === McpServerStatus.Running;
  const port = serverState?.port;

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

  return (
    <ListItem
      sx={{
        flexDirection: 'column',
        alignItems: 'stretch',
        cursor: 'pointer'
      }}
      onClick={() => onExpand(!isExpanded)}
    >
      {/* Server header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle1">{server.name}</Typography>
        {getStatusChip(status)}
        {isRunning && (
          <Tooltip title={`Protocol: ${server.protocolType.toUpperCase()}${port ? `, Port: ${port}` : ''}`}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {server.protocolType.toUpperCase()}
              {serverState?.tools && (
                <Badge 
                  badgeContent={`${serverState.tools.length - (disabledTools[server.id]?.size || 0)}/${serverState.tools.length}`}
                  color="primary"
                  sx={{ ml: 1 }}
                >
                  <span>Tools</span>
                </Badge>
              )}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Server controls */}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={server.enabled}
                onChange={(e) => { e.stopPropagation(); onToggleEnabled(server.id); }}
                size="small"
              />
            }
            label="Enabled"
            onClick={(e) => e.stopPropagation()}
          />
          <FormControlLabel
            control={
              <Switch
                checked={server.autoStart}
                onChange={(e) => { e.stopPropagation(); onToggleAutoStart(server.id); }}
                size="small"
              />
            }
            label="Auto-start"
            onClick={(e) => e.stopPropagation()}
          />
        </Box>
        <Box>
          {!isRunning ? (
            <Button
              variant="outlined"
              size="small"
              color="primary"
              disabled={!server.enabled || status === McpServerStatus.Starting}
              onClick={(e) => { 
                e.stopPropagation(); 
                onStartServer(server.id);
              }}
              startIcon={status === McpServerStatus.Starting ? <CircularProgress size={16} /> : undefined}
            >
              {status === McpServerStatus.Starting ? 'Starting...' : 'Start Server'}
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onStopServer(server.id);
                }}
              >
                Stop Server
              </Button>
              
              {port && (
                ngrokStatus?.status === 'connected' ? (
                  <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    onClick={(e) => { e.stopPropagation(); onStopNgrok(); }}
                  >
                    Stop Ngrok
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    onClick={(e) => { e.stopPropagation(); onStartNgrok(port); }}
                  >
                    Expose via Ngrok
                  </Button>
                )
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Error display */}
      {serverState?.error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          Error: {serverState.error}
        </Typography>
      )}

      {/* Tools section */}
      <Collapse in={isExpanded}>
        {serverState?.tools && serverState.tools.length > 0 ? (
          <Box sx={{ mt: 2, pl: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Available Tools
            </Typography>
            {serverState.tools.map(tool => (
              <ToolCard
                key={tool.name}
                tool={tool}
                enabled={!disabledTools[server.id]?.has(tool.name)}
                onToggle={(enabled) => onToggleTool(server.id, tool.name, enabled)}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{ mt: 2, pl: 2 }}>
            <Typography variant="body2" color="textSecondary">
              No tools available{isRunning ? '.' : ' (server not running).'}
            </Typography>
          </Box>
        )}
      </Collapse>
    </ListItem>
  );
}; 