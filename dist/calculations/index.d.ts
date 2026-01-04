import type { Position, Transaction } from '../api/types.js';
export interface UnrealizedGain {
    symbol: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    costBasis: number;
    marketValue: number;
    unrealizedGain: number;
    unrealizedGainPct: number;
    currency: string;
}
export declare function calculateUnrealizedGains(positions: Position[], transactions: Transaction[]): UnrealizedGain[];
export interface AllocationItem {
    name: string;
    value: number;
    weight: number;
    count: number;
}
export interface AllocationResult {
    items: AllocationItem[];
    totalValue: number;
}
export declare function calculatePortfolioAllocation(positions: Position[], groupBy?: 'symbol' | 'sector' | 'currency'): AllocationResult;
export declare function calculateDailyPnL(todayPositions: Position[], yesterdayPositions: Position[]): number;
export declare function formatCurrency(amount: number, currency?: string): string;
export declare function formatPercentage(value: number): string;
//# sourceMappingURL=index.d.ts.map