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
        let transport;
        app.get('/sse', async (req, res) => {
            logger.info('New SSE connection');
            transport = new SSEServerTransport('/message', res);
            await server.connect(transport);
        });
        app.post('/message', async (req, res) => {
            logger.info('Received message');
            if (transport) {
                await transport.handlePostMessage(req, res);
            }
            else {
                res.status(400).send('No active SSE connection');
            }
        });
        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'healthy', service: 'finance-mcp-server' });
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