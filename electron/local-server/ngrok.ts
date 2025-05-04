import * as ngrok from '@ngrok/ngrok';
import { BrowserWindow } from 'electron';

export interface NgrokConfig {
  enabled: boolean;
  authToken?: string;
  domain?: string;
}

export enum NgrokStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error'
}

export interface NgrokState {
  status: NgrokStatus;
  url?: string;
  error?: string;
}

export class NgrokService {
  private config: NgrokConfig;
  private state: NgrokState = {
    status: NgrokStatus.Disconnected
  };

  constructor(config: NgrokConfig) {
    this.config = config;
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public async start(port: number, mainWindow: BrowserWindow): Promise<void> {
    if (!this.config.enabled || !this.config.authToken) {
      throw new Error('Ngrok is not enabled or auth token is missing');
    }

    try {
      this.updateState({
        status: NgrokStatus.Connecting
      }, mainWindow);

      // Connect to ngrok
      await ngrok.authtoken(this.config.authToken);
      
      const listener = await ngrok.forward({
        addr: port,
        domain: this.config.domain,
        authtoken: this.config.authToken,
        schemes: ['https'], // Using schemes instead of bind_tls
      });

      const url = listener.url();
      if (!url) {
        throw new Error('Failed to get ngrok URL');
      }

      this.updateState({
        status: NgrokStatus.Connected,
        url: url
      }, mainWindow);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.updateState({
        status: NgrokStatus.Error,
        error: errorMessage
      }, mainWindow);
      throw error;
    }
  }

  public async stop(mainWindow: BrowserWindow): Promise<void> {
    try {
      await ngrok.disconnect();
      
      this.updateState({
        status: NgrokStatus.Disconnected
      }, mainWindow);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.updateState({
        status: NgrokStatus.Error,
        error: errorMessage
      }, mainWindow);
      throw error;
    }
  }

  public getStatus(): NgrokState {
    return this.state;
  }

  private updateState(newState: Partial<NgrokState>, mainWindow: BrowserWindow): void {
    this.state = {
      ...this.state,
      ...newState
    };

    // Notify the renderer process of the state change
    mainWindow.webContents.send('ngrok-status-change', this.state);
  }
} 