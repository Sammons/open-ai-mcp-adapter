/**
 * Normalizes a server name by converting to lowercase and replacing non-alphanumeric characters with underscores
 * @param name The server name to normalize
 * @returns The normalized server name
 */
export function normalizeServerName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
} 