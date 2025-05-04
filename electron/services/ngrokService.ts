import * as ngrok from '@ngrok/ngrok';
import { BrowserWindow } from 'electron';
import { NgrokState, NgrokStatus } from '../../src/types';

// Ngrok connection management
let ngrokConnection: any = null; // Using any as the NgrokTunnel type is not exported
let ngrokState: NgrokState = {
  status: NgrokStatus.Disconnected
};

// Initialize ngrok with auth token
export async function initializeNgrok(authToken: string): Promise<boolean> {
  if (!authToken) {
    console.error('Ngrok auth token not provided');
    return false;
  }
  
  try {
    ngrok.authtoken(authToken);
    console.log('Ngrok authtoken set successfully');
    return true;
  } catch (error) {
    console.error('Failed to set ngrok authtoken:', error);
    return false;
  }
}

// Start ngrok tunnel
export async function startNgrok(
  options: {
    port: number;
    authToken?: string;
    domain?: string;
  },
  mainWindow: BrowserWindow
): Promise<boolean> {
  try {
    // Update state to connecting
    ngrokState = {
      status: NgrokStatus.Connecting
    };
    mainWindow.webContents.send('ngrok-status-change', ngrokState);
    
    // Initialize if auth token provided
    if (options.authToken) {
      await initializeNgrok(options.authToken);
    }
    
    // Connect to ngrok
    const connectOptions: any = { // Using any as NgrokOptions type is not exported
      addr: options.port,
      authtoken_from_env: false,
    };
    
    // Add custom domain if provided
    if (options.domain) {
      connectOptions.domain = options.domain;
    }
    
    // Start tunnel
    ngrokConnection = await ngrok.connect(connectOptions);
    
    // Update state to connected
    ngrokState = {
      status: NgrokStatus.Connected,
      url: ngrokConnection.url(),
      connectedSince: Date.now()
    };
    
    mainWindow.webContents.send('ngrok-status-change', ngrokState);
    console.log(`Ngrok tunnel established to ${options.port} at ${ngrokState.url}`);
    
    return true;
  } catch (error) {
    console.error('Failed to start ngrok tunnel:', error);
    
    // Update state to error
    ngrokState = {
      status: NgrokStatus.Error,
      error: error instanceof Error ? error.message : String(error)
    };
    
    mainWindow.webContents.send('ngrok-status-change', ngrokState);
    return false;
  }
}

// Stop ngrok tunnel
export async function stopNgrok(mainWindow: BrowserWindow): Promise<boolean> {
  if (!ngrokConnection) {
    return false;
  }
  
  try {
    await ngrokConnection.close();
    ngrokConnection = null;
    
    ngrokState = {
      status: NgrokStatus.Disconnected
    };
    
    mainWindow.webContents.send('ngrok-status-change', ngrokState);
    console.log('Ngrok tunnel closed');
    
    return true;
  } catch (error) {
    console.error('Failed to close ngrok tunnel:', error);
    
    ngrokState = {
      status: NgrokStatus.Error,
      error: error instanceof Error ? error.message : String(error)
    };
    
    mainWindow.webContents.send('ngrok-status-change', ngrokState);
    return false;
  }
}

// Get current ngrok status
export function getNgrokStatus(): NgrokState {
  return ngrokState;
}