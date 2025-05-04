import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Toolbar,
  Divider,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { LogViewerProps, LogFilter, LogViewerState } from './types';
import { LogEntry } from './LogEntry';
import { LogLevel, LogSource } from '../../types';

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  onExport,
  onClear
}) => {
  const [state, setState] = useState<LogViewerState>({
    filter: {
      levels: new Set(Object.values(LogLevel)),
      sources: new Set(Object.values(LogSource)),
      serverIds: new Set(),
      searchTerm: ''
    },
    expandedLogs: new Set(),
    selectedLogs: new Set()
  });

  // Extract unique server IDs from logs
  const serverIds = useMemo(() => {
    const ids = new Set<string>();
    logs.forEach(log => {
      if (log.serverId) ids.add(log.serverId);
    });
    return Array.from(ids);
  }, [logs]);

  // Filter logs based on current filter settings
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Check level filter
      if (!state.filter.levels.has(log.level)) return false;

      // Check source filter
      if (!state.filter.sources.has(log.source)) return false;

      // Check server filter
      if (log.serverId && state.filter.serverIds.size > 0 && !state.filter.serverIds.has(log.serverId)) {
        return false;
      }

      // Check search term
      if (state.filter.searchTerm) {
        const searchLower = state.filter.searchTerm.toLowerCase();
        const matchesMessage = log.message.toLowerCase().includes(searchLower);
        const matchesDetails = log.details && 
          JSON.stringify(log.details).toLowerCase().includes(searchLower);
        if (!matchesMessage && !matchesDetails) return false;
      }

      return true;
    });
  }, [logs, state.filter]);

  // Handle filter changes
  const handleLevelToggle = (level: LogLevel) => {
    setState(prev => {
      const newLevels = new Set(prev.filter.levels);
      if (newLevels.has(level)) {
        newLevels.delete(level);
      } else {
        newLevels.add(level);
      }
      return {
        ...prev,
        filter: {
          ...prev.filter,
          levels: newLevels
        }
      };
    });
  };

  const handleSourceToggle = (source: LogSource) => {
    setState(prev => {
      const newSources = new Set(prev.filter.sources);
      if (newSources.has(source)) {
        newSources.delete(source);
      } else {
        newSources.add(source);
      }
      return {
        ...prev,
        filter: {
          ...prev.filter,
          sources: newSources
        }
      };
    });
  };

  const handleServerToggle = (serverId: string) => {
    setState(prev => {
      const newServerIds = new Set(prev.filter.serverIds);
      if (newServerIds.has(serverId)) {
        newServerIds.delete(serverId);
      } else {
        newServerIds.add(serverId);
      }
      return {
        ...prev,
        filter: {
          ...prev.filter,
          serverIds: newServerIds
        }
      };
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      filter: {
        ...prev.filter,
        searchTerm: event.target.value
      }
    }));
  };

  const handleClearSearch = () => {
    setState(prev => ({
      ...prev,
      filter: {
        ...prev.filter,
        searchTerm: ''
      }
    }));
  };

  const handleToggleExpand = (logId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedLogs);
      if (newExpanded.has(logId)) {
        newExpanded.delete(logId);
      } else {
        newExpanded.add(logId);
      }
      return {
        ...prev,
        expandedLogs: newExpanded
      };
    });
  };

  const handleToggleSelect = (logId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedLogs);
      if (newSelected.has(logId)) {
        newSelected.delete(logId);
      } else {
        newSelected.add(logId);
      }
      return {
        ...prev,
        selectedLogs: newSelected
      };
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ mb: 2 }}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            System Logs
          </Typography>
          <Tooltip title="Export Logs">
            <IconButton onClick={onExport}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear Logs">
            <IconButton onClick={onClear} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>

        <Divider />

        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search logs..."
            value={state.filter.searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: state.filter.searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            {/* Level Filters */}
            <FormGroup row>
              {Object.values(LogLevel).map(level => (
                <FormControlLabel
                  key={level}
                  control={
                    <Checkbox
                      size="small"
                      checked={state.filter.levels.has(level)}
                      onChange={() => handleLevelToggle(level)}
                    />
                  }
                  label={level}
                />
              ))}
            </FormGroup>

            <Divider orientation="vertical" flexItem />

            {/* Source Filters */}
            <FormGroup row>
              {Object.values(LogSource).map(source => (
                <FormControlLabel
                  key={source}
                  control={
                    <Checkbox
                      size="small"
                      checked={state.filter.sources.has(source)}
                      onChange={() => handleSourceToggle(source)}
                    />
                  }
                  label={source}
                />
              ))}
            </FormGroup>

            {serverIds.length > 0 && (
              <>
                <Divider orientation="vertical" flexItem />
                {/* Server Filters */}
                <FormGroup row>
                  {serverIds.map(serverId => (
                    <FormControlLabel
                      key={serverId}
                      control={
                        <Checkbox
                          size="small"
                          checked={state.filter.serverIds.has(serverId)}
                          onChange={() => handleServerToggle(serverId)}
                        />
                      }
                      label={`Server: ${serverId}`}
                    />
                  ))}
                </FormGroup>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {filteredLogs.length === 0 ? (
          <Typography align="center" color="text.secondary">
            No logs match the current filters.
          </Typography>
        ) : (
          filteredLogs.map(log => (
            <LogEntry
              key={log.id}
              log={log}
              isExpanded={state.expandedLogs.has(log.id)}
              isSelected={state.selectedLogs.has(log.id)}
              onToggleExpand={handleToggleExpand}
              onToggleSelect={handleToggleSelect}
            />
          ))
        )}
      </Paper>
    </Box>
  );
}; 