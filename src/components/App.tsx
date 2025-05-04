import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';

// Import our components
import ServerList from './ServerList/index';
import { SchemaGenerator } from './SchemaGenerator';
import NgrokSettings from './NgrokSettings';

// Import types
import { AppConfig, McpServerState, NgrokState, ApiServerState } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ flexGrow: 1, display: value === index ? 'flex' : 'none', height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3, width: '100%', height: '100%', overflow: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Create a dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const App: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [mcpServers, setMcpServers] = useState<McpServerState[]>([]);
  const [ngrokStatus, setNgrokStatus] = useState<NgrokState | null>(null);
  const [apiServerStatus, setApiServerStatus] = useState<ApiServerState | null>(null);
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };
  
  // Load initial configuration
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load configuration
        const appConfig = await window.electronAPI.getConfig();
        setConfig(appConfig);
        
        // Get MCP server status
        const servers = await window.electronAPI.getAllMcpServers();
        setMcpServers(servers);
        
        // Get ngrok status
        const status = await window.electronAPI.getNgrokStatus();
        setNgrokStatus(status);

        // Get API server status
        const apiStatus = await window.electronAPI.getApiServerStatus();
        console.log('API Server Status:', apiStatus);
        setApiServerStatus(apiStatus);
        
        // If API server should be running but isn't, try to start it
        if (appConfig && appConfig.apiServer && appConfig.apiServer.enabled && 
            apiStatus && apiStatus.status !== 'running') {
          console.log('API server is not running but should be, attempting to start...');
          const startResult = await window.electronAPI.startApiServer();
          console.log('API server start result:', startResult);
          
          // Refresh API server status
          const updatedApiStatus = await window.electronAPI.getApiServerStatus();
          console.log('Updated API Server Status:', updatedApiStatus);
          setApiServerStatus(updatedApiStatus);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadData();
    
    // Set up event listeners
    const mcpStatusUnsubscribe = window.electronAPI.onMcpServerStatusChange((_event, data) => {
      setMcpServers(prevServers => {
        const updatedServers = [...prevServers];
        const index = updatedServers.findIndex(server => server.id === data.id);
        
        if (index !== -1) {
          updatedServers[index] = data;
        } else {
          updatedServers.push(data);
        }
        
        return updatedServers;
      });
    });
    
    const ngrokStatusUnsubscribe = window.electronAPI.onNgrokStatusChange((_event, data) => {
      setNgrokStatus(data);
    });
    
    const apiServerStatusUnsubscribe = window.electronAPI.onApiServerStatusChange((_event, data) => {
      console.log('API Server Status Changed:', data);
      setApiServerStatus(data);
    });
    
    // Clean up event listeners
    return () => {
      mcpStatusUnsubscribe();
      ngrokStatusUnsubscribe();
      apiServerStatusUnsubscribe();
    };
  }, []);
  
  // Save configuration
  const saveConfig = async (newConfig: AppConfig) => {
    try {
      await window.electronAPI.saveConfig(newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };
  
  // Start an MCP server
  const startServer = async (serverId: string) => {
    if (!config) return;
    
    const serverConfig = config.mcpServers.find(s => s.id === serverId);
    if (!serverConfig) return;
    
    await window.electronAPI.startMcpServer(serverConfig);
  };
  
  // Stop an MCP server
  const stopServer = async (serverId: string) => {
    await window.electronAPI.stopMcpServer(serverId);
  };
  
  // Start ngrok
  const startNgrok = async (port: number) => {
    if (!config) return;
    
    await window.electronAPI.startNgrok({
      port,
      authToken: config.ngrok.authToken,
      domain: config.ngrok.domain
    });
  };
  
  // Stop ngrok
  const stopNgrok = async () => {
    await window.electronAPI.stopNgrok();
  };

  // Start API server manually if needed
  const startApiServer = async () => {
    console.log('Manually starting API server...');
    try {
      const result = await window.electronAPI.startApiServer();
      console.log('API server start result:', result);
      
      // Refresh status
      const apiStatus = await window.electronAPI.getApiServerStatus();
      setApiServerStatus(apiStatus);
    } catch (error) {
      console.error('Error starting API server:', error);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIndex} onChange={handleTabChange} aria-label="app tabs">
            <Tab label="MCP Servers" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Ngrok Settings" id="tab-1" aria-controls="tabpanel-1" />
            <Tab label="Schema Generator" id="tab-2" aria-controls="tabpanel-2" />
          </Tabs>
        </Box>
        
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          <TabPanel value={tabIndex} index={0}>
            {config ? (
              <ServerList 
                servers={config.mcpServers}
                serverStates={mcpServers}
                ngrokStatus={ngrokStatus}
                onSaveServers={(servers) => saveConfig({ ...config, mcpServers: servers })}
                onStartServer={startServer}
                onStopServer={stopServer}
                onStartNgrok={startNgrok}
                onStopNgrok={stopNgrok}
              />
            ) : (
              <Typography>Loading servers...</Typography>
            )}
          </TabPanel>
          
          <TabPanel value={tabIndex} index={1}>
            {config ? (
              <NgrokSettings 
                ngrokConfig={config.ngrok}
                ngrokStatus={ngrokStatus}
                onSaveConfig={(ngrokConfig) => saveConfig({ ...config, ngrok: ngrokConfig })}
                onStartNgrok={startNgrok}
                onStopNgrok={stopNgrok}
              />
            ) : (
              <Typography>Loading ngrok settings...</Typography>
            )}
          </TabPanel>
          
          <TabPanel value={tabIndex} index={2}>
            <SchemaGenerator 
              ngrokStatus={ngrokStatus}
              mcpServers={mcpServers}
              apiServerStatus={apiServerStatus}
              onStartApiServer={startApiServer}
            />
          </TabPanel>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App; 