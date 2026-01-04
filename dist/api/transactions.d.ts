import type { Transaction, TransactionQueryParams } from './types.js';
export declare function getTransactions(params?: TransactionQueryParams): Promise<Transaction[]>;
export declare function getTransactionById(transactionId: number): Promise<Transaction | null>;
//# sourceMappingURL=transactions.d.ts.map