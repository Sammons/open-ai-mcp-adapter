Working draft:

# Program Requirements

1. This is an Electron App supporting Windows, Mac, and Linux. The application allows users to input and manage MCP servers, which are best configured on a PC. The app aggregates MCP servers and provides a single MCP interface. It also exposes a Fastify server that wraps the MCP servers, exposing each tool as a REST POST endpoint, accessible only from localhost (for Ngrok tunneling). Users can easily copy a generated schema of the current Fastify API surface to use with ChatGPT custom actions. All MCP server configurations and settings are persisted locally.
2. The application opens to a page that:
    a. Lists MCP servers (Model Context Protocol)
        a1. Shows the name of each MCP server added
        a2. Shows the specific transport of each MCP server
        a3. Shows the status (active, stopped, error) of each MCP server (auto-refresh, event-based preferred)
        a4. Shows the tools exposed by each MCP server in a compact card (minimal screen space)
        a5. Allows users to disable/enable servers to include/exclude them from aggregation
        a6. Allows users to exclude individual tools from the exposed set (granular control)
    b. Allows editing a server (name, URL, transport)
    c. Allows deleting a server (does not affect the singleton tunnel or aggregator server)
3. On the second page, users can:
    a. See their MCP SSE server endpoint for the aggregation of MCP servers
    b. Configure their Ngrok API key and optionally a custom domain
    c. View the status of the Ngrok connection (auto-refresh)
    d. Start/stop the Ngrok tunnel
    e. Ngrok failures are retried with exponential backoff
4. On the third page, users can:
    a. See a summary of the tools exposed by the aggregator
    b. Generate and copy the schema for ChatGPT custom actions (format per ChatGPT requirements)
    c. Control which servers/tools are included via enable/disable toggles
5. When the application boots, it should automatically start the aggregator server, which auto-restarts on failure.
6. Logging:
    a. Logs are shown on stdout
    b. Errors are logged to stderr
    c. Errors may be shown in the UI for user interactions

# References

- https://github.com/modelcontextprotocol/typescript-sdk?tab=readme-ov-file#writing-mcp-clients

# Example Custom Action JSON

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Get weather data",
    "description": "Retrieves current weather data for a location.",
    "version": "v1.0.0"
  },
  "servers": [
    {
      "url": "https://weather.example.com"
    }
  ],
  "paths": {
    "/location": {
      "get": {
        "description": "Get temperature for a specific location",
        "operationId": "GetCurrentWeather",
        "parameters": [
          {
            "name": "location",
            "in": "query",
            "description": "The city and state to retrieve the weather for",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "deprecated": false
      }
    }
  },
  "components": {
    "schemas": {}
  }
}
```

# Program Structure

## Server startup sequence

Boot local webserver on customized port, this startup state should be on the landing page above the MCP servers.
 + yes the user should be able to customize the port the app runs on, inline there. Changing the port should cause a restart.
 + we will encapsulate the local server in `electron/local-server/local-server.ts`, although there should also be a `electron/local-server/mcp-to-routes.ts` mapper. The server class should expose public methods for setPort() start() stop() setMcpServers(detectedMcpCapabilities), and forward()
 + detected McpCapabilities should be obtained like `{ tools: clientAggregator.listTools(), resources: clientAggregator.listResources(), prompts: clientAggregator.listPrompts() }`.
 + ngrok should be a sub-component of the local-server, with implementation details captured in `electron/local-server/ngrok.ts`, where the server .forward() method starts the ngrok server and forwards the port from the local server. There should be an `electron/local-server/ngrok-config.ts` which handles managing the configuration that the UI supports.


## Proposed MCP Server Configuration Details

This will abstract over the @modelcontextprotocol/sdk usages, following the examples in `node_modules\@modelcontextprotocol\sdk\dist\cjs\examples`

```typescript

interface STDIOMCPServerConfig {
    name: string
    command: string
    environmentVariables: {
        [variable: string]: string
    }[]
}

interface SSEMCPServerConfig {
    name: string
    endpoint: string
}

interface StreamingHTTPMCPServerConfig {
    name: string
    endpoint: string
}

interface MCPServerConfig {
    transportConfig: 
    | { type: 'stdio', config: STDIOMCPServerConfig } 
    | { type: 'sse', config: SSEMCPServerConfig }
    | { type: 'streaming-http', config: StreamingHTTPMCPServerConfig }
    authenticationConfig: { /* TODO */ }
}
```

Propose there be a layout like this, with folder `electron/mcp`:
- `electron/mcp/client.ts`: exposing a class UniversalMcpClient {} with public methods listTools, listResources, listPrompts, start, stop
  + this client should consume the other transport clients
- `electron/mcp/transports/sse.ts`: exposing a class SseMcpClient {} with public methods listTools, listResources, listPrompts, start, stop
- `electron/mcp/transports/stdio.ts`: exposing a class StdioMcpClient {} with public methods listTools, listResources, listPrompts, start, stop
- `electron/mcp/transports/streaming-http.ts`: exposing a class StreamingHttpMcpClient {} with public methods listTools, listResources, listPrompts, start, stop
- `electron/mcp/client-aggregator.ts`: exposing a class AggregatedMcpClient {} with public methods listTools, listResources, listPrompts, start, stop
  

# Open Questions

1. MCP SDK Integration: Would a wrapper module/service for the @modelcontextprotocol/sdk help avoid agent confusion? Any preferred abstraction pattern?
2. Event-Based Auto-Refresh: Should the app use WebSockets, SSE, or polling for event-based updates from MCP servers?
3. ChatGPT Schema Example: Please provide a sample schema for ChatGPT custom actions if available, or confirm the required format.
4. UI/UX: Should there be confirmation dialogs for deleting servers or disabling tools? Any preferred design system or component library?

# Next Steps

## 1. Local Server Implementation (Priority: HIGH) ✅

### A. Core Server Components ✅
1. Created `local-server.ts`:
   - ✅ Implemented server setup with Fastify
   - ✅ Added CORS and error handling
   - ✅ Added health check endpoint
   - ✅ Implemented server lifecycle management
   - ✅ Added MCP server capabilities management

2. Implemented `mcp-to-routes.ts`:
   - ✅ Created REST endpoint mapping logic
   - ✅ Added request/response validation
   - ✅ Implemented tool invocation routing
   - ✅ Added error handling and logging
   - ✅ Added OpenAPI schema generation

3. Created Ngrok integration:
   - ✅ Implemented `ngrok.ts` for tunnel management
   - ✅ Added `ngrok-config.ts` for configuration
   - ✅ Added exponential backoff for failures
   - ✅ Implemented status monitoring
   - ✅ Added event-based status updates

Key Features Implemented:
1. ✅ Dynamic route generation from MCP tools
2. ✅ Input validation against tool schemas
3. ✅ Proper error handling and status codes
4. ✅ OpenAPI schema generation for ChatGPT
5. ✅ Ngrok tunnel management with retry
6. ✅ Configuration persistence
7. ✅ Event-based status updates

## 1.5 Main Process Implementation (Priority: HIGH) ✅

### A. Core Process Components ✅
1. Implemented `main.ts`:
   - ✅ Window management and lifecycle
   - ✅ Configuration loading and persistence
   - ✅ Auto-start service management
   - ✅ IPC handler setup
   - ✅ Error handling and logging

2. Implemented `preload.ts`:
   - ✅ Secure IPC bridge
   - ✅ Type-safe API exposure
   - ✅ Event handling setup
   - ✅ Context isolation

3. Implemented Service Integration:
   - ✅ MCP server management
   - ✅ Local server coordination
   - ✅ Ngrok integration
   - ✅ Configuration synchronization

4. Implemented State Management:
   - ✅ API server state tracking
   - ✅ Ngrok status synchronization
   - ✅ Server capabilities aggregation
   - ✅ Event-based updates

Key Features Implemented:
1. ✅ Secure main-to-renderer communication
2. ✅ Proper window management
3. ✅ Configuration persistence
4. ✅ Service auto-start capabilities
5. ✅ Cross-platform process management
6. ✅ Comprehensive error handling
7. ✅ Event-based state updates
8. ✅ Type-safe IPC communication
9. ✅ Proper service lifecycle management

### B. Integration Points ✅
1. Local Server Integration:
   - ✅ Server lifecycle management
   - ✅ Port configuration
   - ✅ Status monitoring
   - ✅ Capability aggregation

2. MCP Server Integration:
   - ✅ Server management (start/stop)
   - ✅ Status tracking
   - ✅ Tool discovery
   - ✅ Capability aggregation

3. Ngrok Integration:
   - ✅ Tunnel management
   - ✅ Status synchronization
   - ✅ URL management
   - ✅ Error handling

### C. Security Measures ✅
1. ✅ Context isolation between main and renderer
2. ✅ Type-safe IPC communication
3. ✅ Proper error handling and validation
4. ✅ Secure configuration storage
5. ✅ Safe process management

## 2. UI Implementation (Priority: HIGH) ✅

### A. Server Management UI ✅
1. Created `server-list.tsx`:
   - ✅ Server list with status indicators
   - ✅ Server enable/disable controls
   - ✅ Auto-start configuration
   - ✅ Tool display and management
   - ✅ Server edit/delete functionality
   - ✅ Error handling and display
   - ✅ Event-based updates
   - ✅ Metrics display (uptime, tool count)

2. Created `server-card.tsx`:
   - ✅ Integrated into ServerList component
   - ✅ Expandable tool details
   - ✅ Status indicators
   - ✅ Action buttons
   - ✅ Error display

3. Created `add-server-dialog.tsx`:
   - ✅ Integrated into ServerList component
   - ✅ Protocol type selection
   - ✅ Configuration validation
   - ✅ Error handling

### B. Tool Management UI ✅
1. Created `tool-card.tsx`:
   - ✅ Integrated into ServerList component
   - ✅ Tool enable/disable controls
   - ✅ Parameter display
   - ✅ Description display
   - ✅ Expandable details

### C. Status and Monitoring UI ✅
1. Created `status-bar.tsx`: ✅
   - ✅ Global application status
   - ✅ Active server count
   - ✅ Total tool count
   - ✅ Error indicators
   - ✅ Service status (API Server, Ngrok)
   - ✅ Refresh functionality
   - ✅ Status tooltips
   - ✅ Clean Material-UI based design
   - ✅ Event-based updates

2. Created `log-viewer.tsx`: ✅
   - ✅ Error log display
   - ✅ Status log display
   - ✅ Log filtering by level, source, and server
   - ✅ Log search with real-time filtering
   - ✅ Log export to JSON
   - ✅ Clear log functionality
   - ✅ Detailed log entries with timestamps
   - ✅ Visual indicators for log levels
   - ✅ Collapsible log details
   - ✅ Server-specific log filtering
   - ✅ Material-UI components
   - ✅ Performance optimizations

### D. Global Features ⏳
1. Event System:
   - ✅ Server status updates
   - ✅ Tool state synchronization
   - ✅ Log updates
   - ✅ Error notifications
   - ⏳ Real-time metrics updates

2. Error Handling:
   - ✅ Server errors
   - ✅ Tool errors
   - ✅ Global error display
   - ⏳ Error recovery suggestions

3. Loading States:
   - ✅ Server operations
   - ✅ Tool operations
   - ✅ Global loading indicator
   - ⏳ Operation progress display

4. Theme Support:
   - ⏳ Light/dark mode
   - ⏳ Custom themes
   - ⏳ Color scheme customization

5. Accessibility:
   - ⏳ Keyboard navigation
   - ⏳ Screen reader support
   - ⏳ Focus management
   - ⏳ ARIA attributes

Next Steps:
1. ✅ Implement StatusBar component
2. ✅ Implement LogViewer component
3. ⏳ Add global error handling
4. ⏳ Implement theme support
5. ⏳ Add accessibility features

## 3. State Management (Priority: MEDIUM)

### A. Server State
1. Create `server-store.ts`:
   - Implement server CRUD operations
   - Add persistence layer
   - Add state change notifications

2. Create `tool-store.ts`:
   - Implement tool state management
   - Add tool enable/disable functionality
   - Add tool configuration persistence

### B. Configuration State
1. Create `config-store.ts`:
   - Implement configuration management
   - Add persistence layer
   - Add validation and defaults

## 4. Testing and Documentation (Priority: MEDIUM)

### A. Unit Tests
1. Create test suites for:
   - Server management
   - Tool handling
   - Configuration management
   - UI components

### B. Integration Tests
1. Create test suites for:
   - Server-UI interaction
   - Tool-UI interaction
   - Configuration persistence
   - Ngrok integration

### C. Documentation
1. Create documentation for:
   - Setup and installation
   - Configuration options
   - API reference
   - UI components
   - Troubleshooting guide

## Success Criteria

1. ✅ MCP transport implementations complete
2. ✅ Event system implemented
3. ✅ Local server with REST endpoints
4. ✅ UI implementation
5. ✅ Ngrok integration
6. ⏳ Security measures
7. ⏳ Documentation
8. ⏳ Test coverage > 80%

## Risk Factors

1. ✅ MCP SDK integration complexity (MITIGATED)
2. ⚠️ Cross-platform compatibility (IN PROGRESS)
3. ⚠️ Real-time performance with multiple servers (PARTIALLY MITIGATED)
4. ⚠️ Security considerations for tool exposure

## Implementation Timeline

### Phase 1: Core Infrastructure (Week 1-2) ✅
- ✅ MCP Client Refactoring
- ✅ Local Server Setup
- ✅ Configuration Updates

### Phase 2: UI and Integration (Week 2-3) ✅
- ✅ Basic UI Implementation
- ✅ MCP to REST Mapping
- ✅ Event System

### Phase 3: Enhanced Features (Week 3-4) ⏳
- ✅ Ngrok Integration
- ⏳ Error Handling & Recovery
- ✅ Tool Management

### Phase 4: Security & Polish (Week 4-5) ⏳
- ⏳ Security Implementation
- ⏳ UI/UX Improvements
- ⏳ Documentation

### Phase 5: Testing & Refinement (Week 5-6) ⏳
- ⏳ Testing Infrastructure
- ⏳ Performance Optimization
- ⏳ Final Polish
