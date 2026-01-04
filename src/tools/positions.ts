import { z } from 'zod';
import { getPositions } from '../api/positions.js';
import { getEntities, searchInstruments } from '../api/entities.js';
import type { ToolDefinition } from './types.js';
import { logger } from '../utils/logger.js';

// Input schemas
const GetPositionsInputSchema = z.object({
    symbol: z.string().optional().describe('Stock symbol to filter (e.g., "IBM", "AAPL")'),
    portfolio_name: z.string().optional().describe('Portfolio name to filter'),
    position_date: z.string().optional().describe('Position date (YYYY-MM-DD format, defaults to today)'),
    include_details: z.boolean().optional().default(true).describe('Include entity names in response'),
});

const GetPositionBySymbolInputSchema = z.object({
    symbol: z.string().describe('Stock symbol (e.g., "IBM", "AAPL")'),
    portfolio_name: z.string().optional().describe('Optional portfolio name to filter'),
});

// Tool handlers
async function handleGetPositions(input: z.infer<typeof GetPositionsInputSchema>) {
    logger.info({ input }, 'get_positions tool called');

    // Build query parameters
    const params: any = {
        descriptive: input.include_details,
    };

    if (input.position_date) {
        params.position_date = input.position_date;
    }

    // If portfolio_name provided, look up portfolio entity ID
    if (input.portfolio_name) {
        const portfolios = await getEntities({
            entity_category: 'Portfolio',
            search: input.portfolio_name,
        });

        if (portfolios.length === 0) {
            return {
                success: false,
                message: `Portfolio "${input.portfolio_name}" not found`,
                positions: [],
            };
        }

        params.portfolio_entity_id = portfolios[0].entity_id;
    }

    // Fetch positions
    let positions = await getPositions(params);

    // If symbol provided, filter by instrument name
    if (input.symbol) {
        const symbolUpper = input.symbol.toUpperCase();
        positions = positions.filter(p =>
            p.instrument_name?.toUpperCase().includes(symbolUpper) ||
            p.instrument_account_name?.toUpperCase().includes(symbolUpper)
        );
    }

    // Transform to friendly format
    const formattedPositions = positions.map(p => ({
        position_id: p.position_id,
        symbol: p.instrument_name || p.instrument_account_name || 'Unknown',
        portfolio: p.portfolio_name || `Portfolio ${p.portfolio_entity_id}`,
        quantity: p.settle_date_units,
        market_value: p.settle_date_mv,
        currency: p.settle_currency,
        position_date: p.position_date,
    }));

    return {
        success: true,
        count: formattedPositions.length,
        positions: formattedPositions,
        summary: {
            total_market_value: formattedPositions.reduce((sum, p) => sum + (p.market_value || 0), 0),
            position_count: formattedPositions.length,
        },
    };
}

async function handleGetPositionBySymbol(input: z.infer<typeof GetPositionBySymbolInputSchema>) {
    logger.info({ input }, 'get_position_by_symbol tool called');

    // First, find the instrument entity
    const instruments = await searchInstruments(input.symbol);

    if (instruments.length === 0) {
        return {
            success: false,
            message: `Instrument "${input.symbol}" not found in the system`,
            position: null,
        };
    }

    // Get positions with descriptive names
    const params: any = {
        descriptive: true,
    };

    // If portfolio specified, filter by it
    if (input.portfolio_name) {
        const portfolios = await getEntities({
            entity_category: 'Portfolio',
            search: input.portfolio_name,
        });

        if (portfolios.length > 0) {
            params.portfolio_entity_id = portfolios[0].entity_id;
        }
    }

    const positions = await getPositions(params);

    // Filter to matching instrument
    const symbolUpper = input.symbol.toUpperCase();
    const matchingPositions = positions.filter(p =>
        p.instrument_name?.toUpperCase().includes(symbolUpper)
    );

    if (matchingPositions.length === 0) {
        return {
            success: true,
            message: `No position found for "${input.symbol}"`,
            position: null,
        };
    }

    // Return the first matching position (or aggregate if multiple)
    const position = matchingPositions[0];

    return {
        success: true,
        position: {
            symbol: position.instrument_name,
            portfolio: position.portfolio_name,
            quantity: position.settle_date_units,
            market_value: position.settle_date_mv,
            currency: position.settle_currency,
            position_date: position.position_date,
        },
    };
}

// Export tools
export const positionTools: ToolDefinition[] = [
    {
        name: 'get_positions',
        description: `Fetch current positions from the portfolio. 
Returns all positions or filter by symbol, portfolio, or date.
Use this when the user asks:
- "What positions do I have?"
- "Show me my portfolio"
- "What stocks do I own?"
- "List my holdings"`,
        inputSchema: GetPositionsInputSchema,
        handler: handleGetPositions,
    },
    {
        name: 'get_position_by_symbol',
        description: `Get detailed position information for a specific stock symbol.
Use this when the user asks about a specific stock like:
- "How many shares of IBM do I have?"
- "What's my AAPL position?"
- "Show me my Microsoft holdings"`,
        inputSchema: GetPositionBySymbolInputSchema,
        handler: handleGetPositionBySymbol,
    },
];
