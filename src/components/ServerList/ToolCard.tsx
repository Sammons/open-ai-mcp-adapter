import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { ToolCardProps } from './types';

export const ToolCard: React.FC<ToolCardProps> = ({ tool, enabled, onToggle }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">{tool.name}</Typography>
            <Tooltip title={tool.description || 'No description available'}>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => onToggle(e.target.checked)}
                size="small"
              />
            }
            label="Enabled"
          />
        </Box>
        <Collapse in={expanded}>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" display="block">
              Description: {tool.description || 'No description available'}
            </Typography>
            {tool.parameters && (
              <>
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  Parameters:
                </Typography>
                {Object.entries(tool.parameters).map(([name, param]) => (
                  <Typography key={name} variant="caption" display="block" sx={{ ml: 1 }}>
                    • {name}: {param.type} {param.required ? '(required)' : '(optional)'}
                  </Typography>
                ))}
              </>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}; 