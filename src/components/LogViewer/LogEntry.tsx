import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper,
  Checkbox,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BugReport as DebugIcon
} from '@mui/icons-material';
import { LogEntryProps } from './types';
import { LogLevel } from '../../types';

export const LogEntry: React.FC<LogEntryProps> = ({
  log,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect
}) => {
  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.Error:
        return <ErrorIcon color="error" />;
      case LogLevel.Warning:
        return <WarningIcon color="warning" />;
      case LogLevel.Info:
        return <InfoIcon color="info" />;
      case LogLevel.Debug:
        return <DebugIcon color="action" />;
    }
  };

  const getLevelColor = (level: LogLevel): 'error' | 'warning' | 'info' | 'default' => {
    switch (level) {
      case LogLevel.Error:
        return 'error';
      case LogLevel.Warning:
        return 'warning';
      case LogLevel.Info:
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        mb: 1, 
        p: 1,
        backgroundColor: isSelected ? 'action.selected' : 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Checkbox
          checked={isSelected}
          onChange={() => onToggleSelect(log.id)}
          size="small"
        />
        
        {getLevelIcon(log.level)}
        
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          {log.message}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={log.source}
            size="small"
            color={getLevelColor(log.level)}
          />
          
          {log.serverId && (
            <Chip
              label={`Server: ${log.serverId}`}
              size="small"
              variant="outlined"
            />
          )}
          
          <Typography variant="caption" color="text.secondary">
            {new Date(log.timestamp).toLocaleString()}
          </Typography>

          <IconButton 
            size="small" 
            onClick={() => onToggleExpand(log.id)}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ mt: 1, pl: 4 }}>
          {log.details && (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {typeof log.details === 'string' 
                ? log.details 
                : JSON.stringify(log.details, null, 2)
              }
            </pre>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}; 