import { positionTools } from './positions.js';
import { transactionTools } from './transactions.js';
import { analyticsTools } from './analytics.js';
import { portfolioTools } from './portfolio.js';
import { referenceTools } from './reference.js';
// Combine all tools
export const allTools = [
    ...positionTools,
    ...transactionTools,
    ...analyticsTools,
    ...portfolioTools,
    ...referenceTools,
];
// Create a map for quick lookup
export const toolMap = new Map(allTools.map(tool => [tool.name, tool]));
//# sourceMappingURL=index.js.map