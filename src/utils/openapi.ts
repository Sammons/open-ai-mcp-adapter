/**
 * Utility functions for OpenAPI schema generation and validation
 */

/**
 * Creates a valid operationId from server and tool identifiers.
 * Ensures the result is a valid JavaScript identifier by:
 * 1. Removing invalid characters
 * 2. Converting GUIDs to a shorter hash
 * 3. Replacing dots with underscores
 * 4. Ensuring it starts with a letter
 * 
 * @param serverId - The server identifier (may be a GUID)
 * @param toolName - The tool name
 * @returns A valid operationId string
 */
export function createValidOperationId(serverId: string, toolName: string): string {
  // Helper to convert GUID to shorter hash
  const shortenGuid = (guid: string): string => {
    const cleanGuid = guid.replace(/-/g, '');
    return cleanGuid.slice(0, 8); // Use first 8 chars as a shorter identifier
  };

  // Clean server ID - if it's a GUID, shorten it
  const cleanServerId = serverId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ? shortenGuid(serverId)
    : serverId.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Clean tool name - replace dots and invalid chars with underscore
  const cleanToolName = toolName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Combine and ensure starts with letter
  const combined = `${cleanServerId}_${cleanToolName}`;
  return combined.match(/^[a-z]/) ? combined : `fn_${combined}`;
}

/**
 * Validates if a string is a valid operationId according to OpenAPI spec
 * @param operationId - The operationId to validate
 * @returns true if valid, false otherwise
 */
export function isValidOperationId(operationId: string): boolean {
  // Must be a valid JavaScript identifier
  // Start with a letter, followed by letters, numbers, or underscores
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(operationId);
}

/**
 * Validates if a path is valid according to OpenAPI spec
 * @param path - The path to validate
 * @returns true if valid, false otherwise
 */
export function isValidPath(path: string): boolean {
  // Must start with forward slash
  // Can contain letters, numbers, underscores, hyphens
  // Path parameters in curly braces
  return /^\/[a-zA-Z0-9-_\/{}\\.]*$/.test(path);
} 