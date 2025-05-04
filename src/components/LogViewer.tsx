import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Menu,
  MenuItem,
  Divider,
  InputAdornment
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BugReport as DebugIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Storage as ServerIcon,
  Api as ApiIcon,
  Cloud as NgrokIcon,
  Settings as SystemIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  LogEntry, 
  LogLevel, 
  LogSource, 
  LogFilter, 
  McpServerConfig 
} from '../types';

interface LogViewerProps {
  logs: LogEntry[];
  servers: McpServerConfig[];
  onClearLogs: () => void;
  maxHeight?: string | number;
}

const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  servers,
  onClearLogs,
  maxHeight = '500px'
}) => {
  // Filter state
  const [filter, setFilter] = useState<LogFilter>({
    levels: new Set(Object.values(LogLevel)),
    sources: new Set(Object.values(LogSource)),
    serverIds: new Set(servers.map(s => s.id)),
    searchTerm: ''
  });

  // Filter menu state
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Update filter when servers change
  useEffect(() => {
    setFilter(prev => ({
      ...prev,
      serverIds: new Set(servers.map(s => s.id))
    }));
  }, [servers]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Check level
      if (!filter.levels.has(log.level)) return false;

      // Check source
      if (!filter.sources.has(log.source)) return false;

      // Check server ID if applicable
      if (log.serverId && !filter.serverIds.has(log.serverId)) return false;

      // Check search term
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        const matchesSearch = 
          log.message.toLowerCase().includes(searchLower) ||
          (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [logs, filter]);

  // Get icon for log level
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

  // Get icon for log source
  const getSourceIcon = (source: LogSource) => {
    switch (source) {
      case LogSource.Server:
        return <ServerIcon />;
      case LogSource.ApiServer:
        return <ApiIcon />;
      case LogSource.Ngrok:
        return <NgrokIcon />;
      case LogSource.System:
        return <SystemIcon />;
    }
  };

  // Export logs
  const handleExport = () => {
    const exportData = filteredLogs.map(log => ({
      timestamp: format(log.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      level: log.level,
      source: log.source,
      message: log.message,
      details: log.details,
      serverId: log.serverId
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search logs..."
          value={filter.searchTerm}
          onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: filter.searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setFilter(prev => ({ ...prev, searchTerm: '' }))}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ flexGrow: 1 }}
        />

        <Tooltip title="Filter Logs">
          <IconButton onClick={(e) => setFilterAnchorEl(e.currentTarget)}>
            <FilterIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Export Logs">
          <IconButton onClick={handleExport}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Clear Logs">
          <IconButton onClick={onClearLogs}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" gutterBottom>Log Levels</Typography>
          <FormGroup>
            {Object.values(LogLevel).map(level => (
              <FormControlLabel
                key={level}
                control={
                  <Checkbox
                    checked={filter.levels.has(level)}
                    onChange={(e) => {
                      const newLevels = new Set(filter.levels);
                      if (e.target.checked) {
                        newLevels.add(level);
                      } else {
                        newLevels.delete(level);
                      }
                      setFilter(prev => ({ ...prev, levels: newLevels }));
                    }}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getLevelIcon(level)}
                    <Typography variant="body2">{level}</Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>Sources</Typography>
          <FormGroup>
            {Object.values(LogSource).map(source => (
              <FormControlLabel
                key={source}
                control={
                  <Checkbox
                    checked={filter.sources.has(source)}
                    onChange={(e) => {
                      const newSources = new Set(filter.sources);
                      if (e.target.checked) {
                        newSources.add(source);
                      } else {
                        newSources.delete(source);
                      }
                      setFilter(prev => ({ ...prev, sources: newSources }));
                    }}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getSourceIcon(source)}
                    <Typography variant="body2">{source}</Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>

          {servers.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Servers</Typography>
              <FormGroup>
                {servers.map(server => (
                  <FormControlLabel
                    key={server.id}
                    control={
                      <Checkbox
                        checked={filter.serverIds.has(server.id)}
                        onChange={(e) => {
                          const newServerIds = new Set(filter.serverIds);
                          if (e.target.checked) {
                            newServerIds.add(server.id);
                          } else {
                            newServerIds.delete(server.id);
                          }
                          setFilter(prev => ({ ...prev, serverIds: newServerIds }));
                        }}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{server.name}</Typography>}
                  />
                ))}
              </FormGroup>
            </>
          )}
        </Box>
      </Menu>

      {/* Log List */}
      <Paper 
        variant="outlined" 
        sx={{ 
          maxHeight, 
          overflow: 'auto',
          bgcolor: 'background.default'
        }}
      >
        {filteredLogs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No logs to display
              {filter.searchTerm && ' matching search criteria'}
            </Typography>
          </Box>
        ) : (
          <List dense>
            {filteredLogs.map((log) => (
              <ListItem
                key={log.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 'none'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getLevelIcon(log.level)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" component="span">
                        {format(log.timestamp, 'HH:mm:ss')}
                      </Typography>
                      <Chip
                        icon={getSourceIcon(log.source)}
                        label={log.source}
                        size="small"
                        variant="outlined"
                      />
                      {log.serverId && (
                        <Chip
                          label={servers.find(s => s.id === log.serverId)?.name || 'Unknown Server'}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" component="span" color="textPrimary">
                        {log.message}
                      </Typography>
                      {log.details && (
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            overflow: 'auto'
                          }}
                        >
                          {JSON.stringify(log.details, null, 2)}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default LogViewer; 