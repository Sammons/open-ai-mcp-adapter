import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  FormControlLabel,
  Switch,
  SelectChangeEvent
} from '@mui/material';
import { McpServerConfig, McpProtocolType } from '../../types';

interface ServerDialogProps {
  open: boolean;
  onClose: () => void;
  server: McpServerConfig;
  isEdit: boolean;
  onSave: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onArgsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProtocolChange: (e: SelectChangeEvent) => void;
}

export const ServerDialog: React.FC<ServerDialogProps> = ({
  open,
  onClose,
  server,
  isEdit,
  onSave,
  onInputChange,
  onArgsChange,
  onProtocolChange
}) => {
  const isLocalProtocol = server.protocolType === McpProtocolType.HTTP || 
                         server.protocolType === McpProtocolType.STDIO;

  const isSaveDisabled = !server.name || 
    (isLocalProtocol && !server.command) ||
    (!isLocalProtocol && !server.remoteUrl);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit MCP Server' : 'Add MCP Server'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="Server Name"
          type="text"
          fullWidth
          variant="outlined"
          value={server.name}
          onChange={onInputChange}
          required
          sx={{ mb: 2 }}
        />
        
        <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
          <InputLabel id="protocol-type-label">Protocol Type</InputLabel>
          <Select
            labelId="protocol-type-label"
            id="protocol-type"
            value={server.protocolType}
            label="Protocol Type"
            onChange={onProtocolChange}
          >
            <MenuItem value={McpProtocolType.STDIO}>STDIO (Local)</MenuItem>
            <MenuItem value={McpProtocolType.HTTP}>HTTP (Local)</MenuItem>
            <MenuItem value={McpProtocolType.SSE}>Server-Sent Events (SSE)</MenuItem>
            <MenuItem value={McpProtocolType.StreamingHTTP}>Streaming HTTP</MenuItem>
          </Select>
        </FormControl>
        
        {isLocalProtocol ? (
          <>
            <TextField
              margin="dense"
              name="command"
              label="Command"
              type="text"
              fullWidth
              variant="outlined"
              value={server.command}
              onChange={onInputChange}
              helperText={
                server.protocolType === McpProtocolType.STDIO 
                  ? "The command to run the MCP server (e.g., python -m your_mcp_script)" 
                  : "The command to run the MCP server (e.g., npx, python)"
              }
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
              value={server.args?.join(', ')}
              onChange={onArgsChange}
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
              value={server.workingDir}
              onChange={onInputChange}
              helperText="Optional: Working directory for the command"
              sx={{ mb: 2 }}
            />
          </>
        ) : (
          <TextField
            margin="dense"
            name="remoteUrl"
            label="Remote URL"
            type="text"
            fullWidth
            variant="outlined"
            value={server.remoteUrl}
            onChange={onInputChange}
            helperText={
              server.protocolType === McpProtocolType.StreamingHTTP
                ? "URL of the remote MCP server (e.g., http://localhost:3000/mcp)"
                : "URL of the remote MCP server (e.g., http://localhost:3000/sse)"
            }
            required
            sx={{ mb: 2 }}
          />
        )}
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={server.enabled}
                onChange={onInputChange}
                name="enabled"
              />
            }
            label="Enabled"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={server.autoStart}
                onChange={onInputChange}
                name="autoStart"
              />
            }
            label="Auto-start"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onSave}
          disabled={isSaveDisabled}
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 