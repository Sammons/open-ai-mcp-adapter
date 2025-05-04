import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    // Configuration management
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
    
    // MCP server management
    startMcpServer: (serverConfig: any) => ipcRenderer.invoke('start-mcp-server', serverConfig),
    stopMcpServer: (serverId: string) => ipcRenderer.invoke('stop-mcp-server', serverId),
    getMcpServerStatus: (serverId: string) => ipcRenderer.invoke('get-mcp-server-status', serverId),
    getAllMcpServers: () => ipcRenderer.invoke('get-all-mcp-servers'),
    
    // API server management
    startApiServer: () => ipcRenderer.invoke('start-api-server'),
    stopApiServer: () => ipcRenderer.invoke('stop-api-server'),
    getApiServerStatus: () => ipcRenderer.invoke('get-api-server-status'),
    
    // Ngrok management
    startNgrok: (options: any) => ipcRenderer.invoke('start-ngrok', options),
    stopNgrok: () => ipcRenderer.invoke('stop-ngrok'),
    getNgrokStatus: () => ipcRenderer.invoke('get-ngrok-status'),
    
    // Event listeners
    onMcpServerStatusChange: (callback: (event: any, data: any) => void) => {
      const listener = (_event: any, data: any) => callback(_event, data);
      ipcRenderer.on('mcp-server-status-change', listener);
      return () => {
        ipcRenderer.removeListener('mcp-server-status-change', listener);
      };
    },
    
    onApiServerStatusChange: (callback: (event: any, data: any) => void) => {
      const listener = (_event: any, data: any) => callback(_event, data);
      ipcRenderer.on('api-server-status-change', listener);
      return () => {
        ipcRenderer.removeListener('api-server-status-change', listener);
      };
    },
    
    onNgrokStatusChange: (callback: (event: any, data: any) => void) => {
      const listener = (_event: any, data: any) => callback(_event, data);
      ipcRenderer.on('ngrok-status-change', listener);
      return () => {
        ipcRenderer.removeListener('ngrok-status-change', listener);
      };
    }
  }
); 