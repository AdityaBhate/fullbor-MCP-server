import { z } from 'zod';
import { getTransactions } from '../api/transactions.js';
import { searchInstruments, getPortfolios } from '../api/entities.js';
import { logger } from '../utils/logger.js';
// Input schemas
const GetTransactionsInputSchema = z.object({
    symbol: z.string().optional().describe('Stock symbol to filter (e.g., "IBM")'),
    portfolio_name: z.string().optional().describe('Portfolio name to filter'),
    date_from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    date_to: z.string().optional().describe('End date (YYYY-MM-DD)'),
    transaction_type: z.string().optional().describe('Transaction type (e.g., "Buy", "Sell", "Dividend")'),
    limit: z.number().optional().default(50).describe('Maximum number of transactions to return'),
});
const GetRecentTradesInputSchema = z.object({
    days: z.number().optional().default(7).describe('Number of days to look back'),
    symbol: z.string().optional().describe('Optional symbol to filter'),
});
// Helper to get date range
function getDateRange(days) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    return {
        from: from.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
    };
}
// Tool handlers
async function handleGetTransactions(input) {
    logger.info({ input }, 'get_transactions tool called');
    const params = {
        descriptive: true,
        show_deleted: 'Active',
    };
    if (input.date_from)
        params.trade_date_from = input.date_from;
    if (input.date_to)
        params.trade_date_to = input.date_to;
    // Look up portfolio if specified
    if (input.portfolio_name) {
        const portfolios = await getPortfolios();
        const portfolio = portfolios.find(p => p.entity_name.toLowerCase().includes(input.portfolio_name.toLowerCase()));
        if (portfolio) {
            params.portfolio_entity_id = portfolio.entity_id;
        }
    }
    // Look up instrument if symbol specified
    if (input.symbol) {
        const instruments = await searchInstruments(input.symbol);
        if (instruments.length > 0) {
            params.instrument_entity_id = instruments[0].entity_id;
        }
    }
    let transactions = await getTransactions(params);
    // Apply limit
    if (input.limit && transactions.length > input.limit) {
        transactions = transactions.slice(0, input.limit);
    }
    // Format transactions
    const formattedTransactions = transactions.map(t => ({
        transaction_id: t.transaction_id,
        date: t.trade_date,
        type: t.transaction_type_name || `Type ${t.transaction_type_id}`,
        symbol: t.instrument_name || 'N/A',
        portfolio: t.portfolio_name || `Portfolio ${t.portfolio_entity_id}`,
        units: t.units,
        price: t.price,
        amount: t.amount,
        currency: t.settle_currency,
        status: t.transaction_status_name || 'Unknown',
    }));
    return {
        success: true,
        count: formattedTransactions.length,
        transactions: formattedTransactions,
    };
}
async function handleGetRecentTrades(input) {
    logger.info({ input }, 'get_recent_trades tool called');
    const { from, to } = getDateRange(input.days);
    return handleGetTransactions({
        date_from: from,
        date_to: to,
        symbol: input.symbol,
        limit: 50,
    });
}
// Export tools
export const transactionTools = [
    {
        name: 'get_transactions',
        description: `Fetch transaction history with optional filters.
Use this when the user asks:
- "Show my recent trades"
- "What transactions did I make for IBM?"
- "List my buys and sells this month"
- "What did I trade last week?"`,
        inputSchema: GetTransactionsInputSchema,
        handler: handleGetTransactions,
    },
    {
        name: 'get_recent_trades',
        description: `Get recent trading activity within a specified number of days.
Use this for quick lookups like:
- "What did I trade recently?"
- "Show me this week's activity"
- "Any trades in the last 3 days?"`,
        inputSchema: GetRecentTradesInputSchema,
        handler: handleGetRecentTrades,
    },
];
//# sourceMappingURL=transactions.js.map