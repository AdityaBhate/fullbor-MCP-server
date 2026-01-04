export function calculateUnrealizedGains(positions, transactions) {
    const gains = [];
    // Group transactions by instrument to calculate cost basis
    const costBasisByInstrument = new Map();
    for (const transaction of transactions) {
        if (!transaction.instrument_entity_id)
            continue;
        const isBuy = transaction.transaction_type_name?.toLowerCase().includes('buy');
        if (!isBuy)
            continue; // Only count buys for cost basis
        const instrumentId = transaction.instrument_entity_id;
        const existing = costBasisByInstrument.get(instrumentId) || { totalCost: 0, totalUnits: 0 };
        existing.totalCost += (transaction.amount || 0);
        existing.totalUnits += (transaction.units || 0);
        costBasisByInstrument.set(instrumentId, existing);
    }
    // Calculate gains for each position
    for (const position of positions) {
        if (!position.instrument_entity_id || position.settle_date_units === 0)
            continue;
        const costInfo = costBasisByInstrument.get(position.instrument_entity_id);
        const quantity = position.settle_date_units;
        const marketValue = position.settle_date_mv;
        // Calculate average cost
        let avgCost = 0;
        if (costInfo && costInfo.totalUnits > 0) {
            avgCost = costInfo.totalCost / costInfo.totalUnits;
        }
        const costBasis = avgCost * quantity;
        const currentPrice = quantity !== 0 ? marketValue / quantity : 0;
        const unrealizedGain = marketValue - costBasis;
        const unrealizedGainPct = costBasis !== 0 ? (unrealizedGain / costBasis) * 100 : 0;
        gains.push({
            symbol: position.instrument_name || `Instrument ${position.instrument_entity_id}`,
            quantity,
            avgCost,
            currentPrice,
            costBasis,
            marketValue,
            unrealizedGain,
            unrealizedGainPct,
            currency: position.settle_currency,
        });
    }
    // Sort by absolute gain (largest first)
    gains.sort((a, b) => Math.abs(b.unrealizedGain) - Math.abs(a.unrealizedGain));
    return gains;
}
export function calculatePortfolioAllocation(positions, groupBy = 'symbol') {
    const groups = new Map();
    let totalValue = 0;
    for (const position of positions) {
        if (position.settle_date_mv === 0)
            continue;
        let groupKey;
        switch (groupBy) {
            case 'symbol':
                groupKey = position.instrument_name || position.instrument_account_name || 'Other';
                break;
            case 'currency':
                groupKey = position.settle_currency || 'Unknown';
                break;
            case 'sector':
                // Would need sector data from entity properties
                groupKey = 'Unknown'; // Placeholder
                break;
            default:
                groupKey = 'Other';
        }
        const existing = groups.get(groupKey) || { value: 0, count: 0 };
        existing.value += position.settle_date_mv;
        existing.count += 1;
        groups.set(groupKey, existing);
        totalValue += position.settle_date_mv;
    }
    // Convert to array and calculate weights
    const items = [];
    for (const [name, data] of groups) {
        items.push({
            name,
            value: data.value,
            weight: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
            count: data.count,
        });
    }
    // Sort by value (largest first)
    items.sort((a, b) => b.value - a.value);
    return { items, totalValue };
}
// ===== Daily P&L Calculation =====
export function calculateDailyPnL(todayPositions, yesterdayPositions) {
    const todayValue = todayPositions.reduce((sum, p) => sum + p.settle_date_mv, 0);
    const yesterdayValue = yesterdayPositions.reduce((sum, p) => sum + p.settle_date_mv, 0);
    return todayValue - yesterdayValue;
}
// ===== Helper Functions =====
export function formatCurrency(amount, currency = 'USD') {
    const symbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
    };
    const symbol = symbols[currency] || `${currency} `;
    const formatted = Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}
export function formatPercentage(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}
//# sourceMappingURL=index.js.map