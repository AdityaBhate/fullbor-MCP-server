import { apiGet } from './client.js';
import type { Transaction, ListResponse, TransactionQueryParams } from './types.js';
import { logger } from '../utils/logger.js';

export async function getTransactions(params?: TransactionQueryParams): Promise<Transaction[]> {
    logger.info({ params }, 'Fetching transactions');

    const queryParams: Record<string, any> = {};

    if (params?.client_id) queryParams.client_id = params.client_id;
    if (params?.portfolio_entity_id) queryParams.portfolio_entity_id = params.portfolio_entity_id;
    if (params?.instrument_entity_id) queryParams.instrument_entity_id = params.instrument_entity_id;
    if (params?.trade_date_from) queryParams.trade_date_from = params.trade_date_from;
    if (params?.trade_date_to) queryParams.trade_date_to = params.trade_date_to;
    if (params?.transaction_type_id) queryParams.transaction_type_id = params.transaction_type_id;
    if (params?.show_deleted) queryParams.show_deleted = params.show_deleted;
    if (params?.descriptive !== undefined) queryParams.descriptive = params.descriptive;

    const response = await apiGet<ListResponse<Transaction>>('/transactions', queryParams);

    logger.info({ count: response.count }, 'Transactions fetched');
    return response.data;
}

export async function getTransactionById(transactionId: number): Promise<Transaction | null> {
    try {
        const response = await apiGet<Transaction>(`/transactions/${transactionId}`, { descriptive: true });
        return response;
    } catch (error: any) {
        if (error.statusCode === 404) {
            return null;
        }
        throw error;
    }
}
