# Finance MCP Server

A Model Context Protocol (MCP) server that connects to the FullBor Finance API using Cognito Authentication.

## Features

- **Positions**: Query current portfolio holdings
- **Transactions**: Search transaction history
- **Analytics**: Calculate unrealized gains and portfolio allocation
- **Entities**: Search for instruments and portfolios
- **Authentication**: Native AWS Cognito integration for secure access
- **Dual Transport**: Supports `Stdio` (Local) and `SSE` (Remote/Web) transports

## Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment**
   Copy `.env.example` to `.env` and fill in your details:

   ```bash
   cp .env.example .env
   ```

   Required variables in `.env`:
   - `TEST_USERNAME`: Your Cognito username
   - `TEST_PASSWORD`: Your Cognito password
   - `USER_POOL_ID`: AWS Cognito User Pool ID
   - `CLIENT_ID`: AWS Cognito Client ID
   - `AWS_REGION`: AWS Region (default: us-east-2)

3. **Build**

   ```bash
   npm run build
   ```

## Running the Server

### Local Development (Stdio)

For use with strictly local Claude Desktop.

```bash
npm start
```

### Remote/Web Mode (SSE)

For deployment to Render.com or connecting via HTTP.

```bash
export MCP_TRANSPORT=sse
npm start
```

Server will listen on port 3000 (default) with endpoints:

- `/sse`: Server-Sent Events connection
- `/message`: JSON-RPC message endpoint
- `/health`: Health check

### Deployment on Render.com

This repository is configured for deployment on Render.com.

1. Create a new Web Service on Render
2. Connect this repository
3. Add environment variables for Cognito credentials
4. **Important**: Render will automatically set `NODE_ENV=production`, which enables SSE mode.

### Connecting to Claude Web UI (Connectors)

Once deployed to `https://your-app.onrender.com`:

1. Go to the Claude Connectors page.
2. Add a new **Custom Connector**.
3. Enter the URL: `https://your-app.onrender.com/sse`
