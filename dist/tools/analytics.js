import { z } from 'zod';
import { getPositions } from '../api/positions.js';
import { getTransactions } from '../api/transactions.js';
import { getPortfolios } from '../api/entities.js';
import { calculateUnrealizedGains, calculatePortfolioAllocation } from '../calculations/index.js';
import { logger } from '../utils/logger.js';
// Input schemas
const GetUnrealizedGainsInputSchema = z.object({
    symbol: z.string().optional().describe('Stock symbol to calculate gains for'),
    portfolio_name: z.string().optional().describe('Portfolio to analyze'),
});
const GetPortfolioAllocationInputSchema = z.object({
    portfolio_name: z.string().optional().describe('Portfolio to analyze'),
    group_by: z.enum(['symbol', 'sector', 'currency']).optional().default('symbol'),
});
const GetPerformanceSummaryInputSchema = z.object({
    portfolio_name: z.string().optional(),
    period: z.enum(['day', 'week', 'month', 'ytd', 'all']).optional().default('all'),
});
// Tool handlers
async function handleGetUnrealizedGains(input) {
    logger.info({ input }, 'get_unrealized_gains tool called');
    const params = { descriptive: true };
    // Look up portfolio if specified
    if (input.portfolio_name) {
        const portfolios = await getPortfolios();
        const portfolio = portfolios.find(p => p.entity_name.toLowerCase().includes(input.portfolio_name.toLowerCase()));
        if (portfolio) {
            params.portfolio_entity_id = portfolio.entity_id;
        }
    }
    // Get positions
    let positions = await getPositions(params);
    // Filter by symbol if specified
    if (input.symbol) {
        const symbolUpper = input.symbol.toUpperCase();
        positions = positions.filter(p => p.instrument_name?.toUpperCase().includes(symbolUpper));
    }
    // Get transactions to calculate cost basis
    const transactionParams = { descriptive: true };
    if (params.portfolio_entity_id) {
        transactionParams.portfolio_entity_id = params.portfolio_entity_id;
    }
    const transactions = await getTransactions(transactionParams);
    // Calculate gains using calculation engine
    const gains = calculateUnrealizedGains(positions, transactions);
    // Format response
    const formattedGains = gains.map(g => ({
        symbol: g.symbol,
        quantity: g.quantity,
        avg_cost: g.avgCost,
        current_price: g.currentPrice,
        cost_basis: g.costBasis,
        market_value: g.marketValue,
        unrealized_gain: g.unrealizedGain,
        unrealized_gain_pct: g.unrealizedGainPct,
        currency: g.currency,
    }));
    const totalGain = formattedGains.reduce((sum, g) => sum + g.unrealized_gain, 0);
    const totalCostBasis = formattedGains.reduce((sum, g) => sum + g.cost_basis, 0);
    const totalGainPct = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;
    return {
        success: true,
        positions: formattedGains,
        summary: {
            total_unrealized_gain: totalGain,
            total_unrealized_gain_pct: totalGainPct,
            total_cost_basis: totalCostBasis,
            position_count: formattedGains.length,
        },
    };
}
async function handleGetPortfolioAllocation(input) {
    logger.info({ input }, 'get_portfolio_allocation tool called');
    const params = { descriptive: true };
    if (input.portfolio_name) {
        const portfolios = await getPortfolios();
        const portfolio = portfolios.find(p => p.entity_name.toLowerCase().includes(input.portfolio_name.toLowerCase()));
        if (portfolio) {
            params.portfolio_entity_id = portfolio.entity_id;
        }
    }
    const positions = await getPositions(params);
    const allocation = calculatePortfolioAllocation(positions, input.group_by);
    return {
        success: true,
        allocation: allocation.items,
        summary: {
            total_value: allocation.totalValue,
            position_count: positions.length,
            group_count: allocation.items.length,
        },
    };
}
async function handleGetPerformanceSummary(input) {
    logger.info({ input }, 'get_performance_summary tool called');
    // Get unrealized gains
    const gainsResult = await handleGetUnrealizedGains({
        portfolio_name: input.portfolio_name,
    });
    // Get allocation
    const allocationResult = await handleGetPortfolioAllocation({
        portfolio_name: input.portfolio_name,
        group_by: 'symbol',
    });
    // Get recent transactions
    const dateRange = getPeriodDateRange(input.period);
    const transactions = await getTransactions({
        trade_date_from: dateRange.from,
        trade_date_to: dateRange.to,
        descriptive: true,
    });
    // Calculate transaction summary
    const buys = transactions.filter(t => t.transaction_type_name?.toLowerCase().includes('buy'));
    const sells = transactions.filter(t => t.transaction_type_name?.toLowerCase().includes('sell'));
    return {
        success: true,
        performance: {
            period: input.period,
            unrealized_gains: gainsResult.summary,
            allocation: allocationResult.summary,
            activity: {
                transaction_count: transactions.length,
                buy_count: buys.length,
                sell_count: sells.length,
                total_bought: buys.reduce((sum, t) => sum + (t.amount || 0), 0),
                total_sold: sells.reduce((sum, t) => sum + (t.amount || 0), 0),
            },
        },
        top_positions: gainsResult.positions.slice(0, 5),
        top_allocations: allocationResult.allocation.slice(0, 5),
    };
}
// Helper function
function getPeriodDateRange(period) {
    const today = new Date();
    const to = today.toISOString().split('T')[0];
    let from;
    switch (period) {
        case 'day':
            from = new Date(today);
            break;
        case 'week':
            from = new Date(today);
            from.setDate(from.getDate() - 7);
            break;
        case 'month':
            from = new Date(today);
            from.setMonth(from.getMonth() - 1);
            break;
        case 'ytd':
            from = new Date(today.getFullYear(), 0, 1);
            break;
        default:
            from = new Date(2000, 0, 1); // All time
    }
    return { from: from.toISOString().split('T')[0], to };
}
// Export tools
export const analyticsTools = [
    {
        name: 'get_unrealized_gains',
        description: `Calculate unrealized gains/losses for positions.
Returns P&L in both dollar amounts and percentages.
Use this when the user asks:
- "What are my unrealized gains?"
- "How much am I up/down on IBM?"
- "What's my P&L?"
- "Am I making money on my stocks?"`,
        inputSchema: GetUnrealizedGainsInputSchema,
        handler: handleGetUnrealizedGains,
    },
    {
        name: 'get_portfolio_allocation',
        description: `Get portfolio allocation breakdown.
Shows how the portfolio is distributed across holdings.
Use this when the user asks:
- "What's my portfolio breakdown?"
- "How is my portfolio allocated?"
- "What percentage is in tech stocks?"`,
        inputSchema: GetPortfolioAllocationInputSchema,
        handler: handleGetPortfolioAllocation,
    },
    {
        name: 'get_performance_summary',
        description: `Get comprehensive portfolio performance summary.
Combines P&L, allocation, and activity metrics.
Use this for overview questions like:
- "How is my portfolio doing?"
- "Give me a summary of my investments"
- "What's my portfolio performance?"`,
        inputSchema: GetPerformanceSummaryInputSchema,
        handler: handleGetPerformanceSummary,
    },
];
//# sourceMappingURL=analytics.js.map