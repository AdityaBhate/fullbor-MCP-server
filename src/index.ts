import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { allTools, toolMap } from './tools/index.js';
import { getFullSystemPrompt, SYSTEM_PROMPTS } from './config/prompts.js';
import { handleToolError } from './utils/errors.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

// Create MCP server
const server = new Server(
    {
        name: 'finance-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
            prompts: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.info('Listing tools');
    return {
        tools: allTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: zodToJsonSchema(tool.inputSchema),
        })),
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info({ tool: name, args }, 'Tool called');

    const tool = toolMap.get(name);
    if (!tool) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }) }],
        };
    }

    try {
        const validatedInput = tool.inputSchema.parse(args);
        const result = await tool.handler(validatedInput);
        logger.info({ tool: name, success: true }, 'Tool completed');
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    } catch (error) {
        logger.error({ tool: name, error }, 'Tool error');
        const errorResult = handleToolError(error, name);
        return {
            content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        };
    }
});

// Prompts handlers
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
        { name: 'finance-assistant', description: 'Full context prompt for financial assistant interactions' },
        { name: 'trading-rules', description: 'Trading rules and constraints' },
    ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    if (name === 'finance-assistant') {
        return { messages: [{ role: 'user', content: { type: 'text', text: getFullSystemPrompt() } }] };
    }
    if (name === 'trading-rules') {
        return { messages: [{ role: 'user', content: { type: 'text', text: SYSTEM_PROMPTS.trading_rules } }] };
    }
    throw new Error(`Unknown prompt: ${name}`);
});

async function main() {
    const isSseMode =
        process.env.MCP_TRANSPORT === 'sse' ||
        process.env.NODE_ENV === 'production' ||
        process.env.PORT !== undefined;

    if (isSseMode) {
        const app = express();

        // CORS for all origins
        app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: '*', credentials: true }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Request logging
        app.use((req, res, next) => {
            logger.info({ method: req.method, path: req.path, query: req.query }, 'Request');
            next();
        });

        // =============================================
        // OAuth 2.0 Implementation for Claude Web UI
        // =============================================

        // In-memory stores (use Redis/DB in production)
        const authCodes = new Map<string, { clientId: string; redirectUri: string; expiresAt: number }>();
        const accessTokens = new Map<string, { clientId: string; expiresAt: number }>();

        // Well-known OAuth metadata (RFC 8414)
        app.get('/.well-known/oauth-authorization-server', (req, res) => {
            const baseUrl = `https://${req.get('host')}`;
            res.json({
                issuer: baseUrl,
                authorization_endpoint: `${baseUrl}/oauth/authorize`,
                token_endpoint: `${baseUrl}/oauth/token`,
                response_types_supported: ['code'],
                grant_types_supported: ['authorization_code'],
                code_challenge_methods_supported: ['S256'],
                token_endpoint_auth_methods_supported: ['none'],
            });
        });

        // Authorization endpoint - shows login form or auto-approves
        app.get('/oauth/authorize', (req, res) => {
            const { client_id, redirect_uri, response_type, state, code_challenge, code_challenge_method } = req.query;

            logger.info({ client_id, redirect_uri, response_type, state }, 'OAuth authorize request');

            if (response_type !== 'code') {
                return res.status(400).json({ error: 'unsupported_response_type' });
            }

            // Generate authorization code
            const code = crypto.randomBytes(32).toString('hex');
            authCodes.set(code, {
                clientId: client_id as string,
                redirectUri: redirect_uri as string,
                expiresAt: Date.now() + 600000, // 10 minutes
            });

            // Redirect back to client with code
            const redirectUrl = new URL(redirect_uri as string);
            redirectUrl.searchParams.set('code', code);
            if (state) redirectUrl.searchParams.set('state', state as string);

            logger.info({ redirectUrl: redirectUrl.toString() }, 'Redirecting with auth code');
            res.redirect(redirectUrl.toString());
        });

        // Token endpoint
        app.post('/oauth/token', (req, res) => {
            const { grant_type, code, redirect_uri, client_id } = req.body;

            logger.info({ grant_type, code: code?.substring(0, 8) + '...', client_id }, 'Token request');

            if (grant_type !== 'authorization_code') {
                return res.status(400).json({ error: 'unsupported_grant_type' });
            }

            const authCode = authCodes.get(code);
            if (!authCode || authCode.expiresAt < Date.now()) {
                authCodes.delete(code);
                return res.status(400).json({ error: 'invalid_grant' });
            }

            // Delete used code
            authCodes.delete(code);

            // Generate access token
            const accessToken = crypto.randomBytes(32).toString('hex');
            accessTokens.set(accessToken, {
                clientId: client_id,
                expiresAt: Date.now() + 3600000, // 1 hour
            });

            logger.info({ accessToken: accessToken.substring(0, 8) + '...' }, 'Issued access token');

            res.json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: 3600,
            });
        });

        // Token validation middleware
        const validateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const authHeader = req.headers.authorization;

            // Allow unauthenticated access for now (Claude may not send token on SSE)
            if (!authHeader) {
                logger.debug('No Authorization header, allowing request');
                return next();
            }

            const token = authHeader.replace('Bearer ', '');
            const tokenData = accessTokens.get(token);

            if (!tokenData || tokenData.expiresAt < Date.now()) {
                logger.warn('Invalid or expired token');
                // Still allow for now, but log it
            }

            next();
        };

        // =============================================
        // MCP SSE Endpoints
        // =============================================

        const transports = new Map<string, SSEServerTransport>();

        app.get('/sse', validateToken, async (req, res) => {
            logger.info({ query: req.query }, 'New SSE connection');

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            const sessionId = req.query.sessionId as string || `session-${Date.now()}`;
            const transport = new SSEServerTransport('/message', res);
            transports.set(sessionId, transport);

            res.on('close', () => {
                logger.info({ sessionId }, 'SSE connection closed');
                transports.delete(sessionId);
            });

            try {
                await server.connect(transport);
                logger.info({ sessionId }, 'Server connected to transport');
            } catch (error) {
                logger.error({ error, sessionId }, 'Failed to connect');
            }
        });

        app.post('/message', validateToken, async (req, res) => {
            logger.info({ body: req.body, query: req.query }, 'POST message');

            const sessionId = req.query.sessionId as string;
            const transport = sessionId ? transports.get(sessionId) : transports.values().next().value;

            if (transport) {
                try {
                    await transport.handlePostMessage(req, res);
                } catch (error) {
                    logger.error({ error }, 'Error handling message');
                    res.status(500).json({ error: 'Failed to handle message' });
                }
            } else {
                res.status(400).json({ error: 'No active SSE connection' });
            }
        });

        app.get('/health', (req, res) => {
            res.json({ status: 'healthy', service: 'finance-mcp-server', mode: 'SSE', activeSessions: transports.size });
        });

        app.get('/', (req, res) => {
            res.json({
                name: 'Finance MCP Server',
                version: '1.0.0',
                oauth: '/.well-known/oauth-authorization-server',
                endpoints: { sse: '/sse', message: '/message', health: '/health' },
            });
        });

        const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        app.listen(PORT, '0.0.0.0', () => {
            logger.info({ port: PORT, mode: 'SSE' }, 'Finance MCP Server running');
        });
    } else {
        logger.info({ mode: 'Stdio' }, 'Starting Finance MCP Server');
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
