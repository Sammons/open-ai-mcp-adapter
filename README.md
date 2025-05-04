# OpenAI MCP Adapter

A powerful Electron-based desktop application that aggregates Model Context Protocol (MCP) servers and exposes them as OpenAI Custom Actions. This cross-platform application (Windows, Mac, Linux) provides a unified interface for managing multiple MCP servers and makes their tools accessible via a local REST API.

## Features

- 🌐 **MCP Server Management**
  - Add, edit, and remove MCP servers with different transport types (SSE, STDIO, HTTP)
  - Real-time server status monitoring
  - Granular control over tool exposure
  - Auto-start and auto-restart capabilities

- 🔄 **Unified REST API**
  - Automatic conversion of MCP tools to REST endpoints
  - Local Fastify server with localhost-only access
  - OpenAPI schema generation for ChatGPT custom actions
  - Comprehensive request/response validation

- 🚇 **Ngrok Integration**
  - Secure tunneling with custom domain support
  - Automatic retry with exponential backoff
  - Real-time connection status monitoring
  - API key management

- 🛠️ **Tool Management**
  - Enable/disable individual tools
  - Detailed tool information and capabilities
  - Tool-level configuration options
  - Real-time tool status updates

- 📊 **Monitoring & Logging**
  - Comprehensive logging system
  - Real-time status updates
  - Error tracking and reporting
  - Performance metrics

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/open-ai-mcp-adapter.git
   cd open-ai-mcp-adapter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Start the application:
   ```bash
   npm start
   ```

## Development

### Prerequisites
- Node.js 18+
- npm 8+
- Electron development environment

### Development Scripts
- `npm run dev` - Start the application in development mode with hot reload
- `npm run build` - Build the application
- `npm run watch` - Watch for changes and rebuild
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run clean` - Clean build artifacts

### Project Structure
```
├── src/                  # React frontend code
│   ├── components/       # UI components
│   ├── services/        # Frontend services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── electron/            # Electron main process code
│   ├── mcp/            # MCP client implementations
│   ├── local-server/   # Fastify server implementation
│   ├── services/       # Backend services
│   └── utils/          # Backend utilities
└── package.json        # Project configuration
```

### Architecture

The application follows a modular architecture with clear separation of concerns:

1. **Frontend Layer (src/)**
   - React-based UI components
   - Material-UI for styling
   - Event-based state management
   - Real-time updates

2. **Backend Layer (electron/)**
   - MCP server management
   - Local REST API server
   - Ngrok integration
   - Configuration persistence

3. **Communication Layer**
   - IPC for frontend-backend communication
   - Event system for real-time updates
   - Type-safe message passing

## Configuration

The application supports various configuration options:

1. **MCP Server Configuration**
   - Server name and endpoint
   - Transport type (SSE, STDIO, HTTP)
   - Authentication settings
   - Auto-start options

2. **Ngrok Configuration**
   - API key
   - Custom domain
   - Tunnel options
   - Retry settings

3. **Local Server Configuration**
   - Port settings
   - CORS configuration
   - Rate limiting
   - Security options

## Security

- 🔒 Localhost-only API access
- 🔐 Secure configuration storage
- 🛡️ Input validation and sanitization
- 🔑 API key management
- 🚫 Context isolation in Electron

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)
- [Electron](https://www.electronjs.org/)
- [Fastify](https://www.fastify.io/)
- [Ngrok](https://ngrok.com/)
- [Material-UI](https://mui.com/) 