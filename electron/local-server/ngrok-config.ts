import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

interface NgrokConfig {
    authtoken?: string;
    domain?: string;
    region?: string;
}

class NgrokConfigManager {
    private configPath: string;
    private config: NgrokConfig;

    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'ngrok-config.json');
        this.config = this.loadConfig();
    }

    private loadConfig(): NgrokConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load Ngrok config:', error);
        }
        return {};
    }

    private saveConfig(): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Failed to save Ngrok config:', error);
        }
    }

    public getConfig(): NgrokConfig {
        return { ...this.config };
    }

    public setAuthToken(token: string): void {
        this.config.authtoken = token;
        this.saveConfig();
    }

    public setDomain(domain: string): void {
        this.config.domain = domain;
        this.saveConfig();
    }

    public setRegion(region: string): void {
        this.config.region = region;
        this.saveConfig();
    }

    public clearConfig(): void {
        this.config = {};
        this.saveConfig();
    }
}

export const ngrokConfig = new NgrokConfigManager(); 