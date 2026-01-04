import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';
import { allTools, toolMap } from './tools/index.js';
import { getFullSystemPrompt, SYSTEM_PROMPTS } from './config/prompts.js';
import { handleToolError } from './utils/errors.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import express from 'express';
import cors from 'cors';
// Create MCP server
const server = new Server({
    name: 'finance-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
        prompts: {},
    },
});
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
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: `Unknown tool: ${name}`,
                    }),
                },
            ],
        };
    }
    try {
        // Validate input
        const validatedInput = tool.inputSchema.parse(args);
        // Execute tool
        const result = await tool.handler(validatedInput);
        logger.info({ tool: name, success: true }, 'Tool completed');
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        logger.error({ tool: name, error }, 'Tool error');
        const errorResult = handleToolError(error, name);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(errorResult),
                },
            ],
        };
    }
});
// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts: [
            {
                name: 'finance-assistant',
                description: 'Full context prompt for financial assistant interactions',
            },
            {
                name: 'trading-rules',
                description: 'Trading rules and constraints',
            },
        ],
    };
});
// Get specific prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    if (name === 'finance-assistant') {
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: getFullSystemPrompt(),
                    },
                },
            ],
        };
    }
    if (name === 'trading-rules') {
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: SYSTEM_PROMPTS.trading_rules,
                    },
                },
            ],
        };
    }
    throw new Error(`Unknown prompt: ${name}`);
});
async function main() {
    const isSseMode = process.env.MCP_TRANSPORT === 'sse' ||
        process.env.NODE_ENV === 'production' ||
        process.env.PORT !== undefined;
    if (isSseMode) {
        // SSE Transport (for Render/Deployment)
        const app = express();
        // Enable CORS for all origins (required for Claude Web UI)
        app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
            credentials: true,
        }));
        // Parse JSON bodies
        app.use(express.json());
        // Request logging middleware
        app.use((req, res, next) => {
            logger.info({
                method: req.method,
                path: req.path,
                headers: req.headers,
                query: req.query,
            }, 'Incoming request');
            next();
        });
        // Store active transports per session
        const transports = new Map();
        app.get('/sse', async (req, res) => {
            logger.info({ query: req.query }, 'New SSE connection request');
            // Set SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            const sessionId = req.query.sessionId || `session-${Date.now()}`;
            logger.info({ sessionId }, 'Creating SSE transport');
            const transport = new SSEServerTransport('/message', res);
            transports.set(sessionId, transport);
            res.on('close', () => {
                logger.info({ sessionId }, 'SSE connection closed');
                transports.delete(sessionId);
            });
            try {
                await server.connect(transport);
                logger.info({ sessionId }, 'Server connected to transport');
            }
            catch (error) {
                logger.error({ error, sessionId }, 'Failed to connect server to transport');
            }
        });
        app.post('/message', async (req, res) => {
            logger.info({ body: req.body, query: req.query }, 'Received POST message');
            const sessionId = req.query.sessionId;
            const transport = sessionId ? transports.get(sessionId) : transports.values().next().value;
            if (transport) {
                try {
                    await transport.handlePostMessage(req, res);
                    logger.info('Message handled successfully');
                }
                catch (error) {
                    logger.error({ error }, 'Error handling message');
                    res.status(500).json({ error: 'Failed to handle message' });
                }
            }
            else {
                logger.warn({ sessionId }, 'No active SSE connection found');
                res.status(400).json({ error: 'No active SSE connection' });
            }
        });
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                service: 'finance-mcp-server',
                mode: 'SSE',
                activeSessions: transports.size,
            });
        });
        // Root endpoint for basic info
        app.get('/', (req, res) => {
            res.json({
                name: 'Finance MCP Server',
                version: '1.0.0',
                endpoints: {
                    sse: '/sse',
                    message: '/message',
                    health: '/health',
                },
            });
        });
        const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        app.listen(PORT, '0.0.0.0', () => {
            logger.info({ port: PORT, mode: 'SSE' }, 'Finance MCP Server running');
        });
    }
    else {
        // Stdio Transport (for Local Claude Desktop)
        logger.info({ mode: 'Stdio' }, 'Starting Finance MCP Server');
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map