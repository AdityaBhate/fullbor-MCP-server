export interface Entity {
    entity_id: number;
    entity_name: string;
    entity_type_id: number;
    entity_category?: string;
    client_id: number;
    properties?: Record<string, any>;
    deleted?: boolean;
    update_date?: string;
}
export interface Position {
    position_id: number;
    client_id: number;
    position_date: string;
    portfolio_entity_id: number;
    account_entity_id?: number;
    instrument_entity_id?: number;
    instrument_dimension_id?: number;
    settle_currency: string;
    trade_date_units: number;
    trade_date_mv: number;
    settle_date_units: number;
    settle_date_mv: number;
    update_date?: string;
    portfolio_name?: string;
    account_name?: string;
    instrument_name?: string;
    instrument_account_name?: string;
}
export interface Transaction {
    transaction_id: number;
    client_id: number;
    portfolio_entity_id: number;
    contra_entity_id?: number;
    instrument_entity_id?: number;
    instrument_dimension_id?: number;
    cash_entity_id?: number;
    trade_date: string;
    settle_date: string;
    transaction_status_id: number;
    transaction_type_id: number;
    units?: number;
    price?: number;
    amount?: number;
    settle_currency?: string;
    properties?: Record<string, any>;
    deleted?: boolean;
    update_date?: string;
    portfolio_name?: string;
    instrument_name?: string;
    contra_name?: string;
    transaction_type_name?: string;
    transaction_status_name?: string;
}
export interface TransactionType {
    transaction_type_id: number;
    transaction_type_name: string;
    properties?: Record<string, any>;
}
export interface TransactionStatus {
    transaction_status_id: number;
    transaction_status_name: string;
}
export interface EntityType {
    entity_type_id: number;
    entity_type_name: string;
    entity_category_id?: number;
    entity_category?: string;
    properties?: Record<string, any>;
}
export interface ListResponse<T> {
    data: T[];
    count: number;
}
export interface ApiError {
    error: string;
    details?: string;
}
export interface PositionQueryParams {
    client_id?: number;
    position_date?: string;
    portfolio_entity_id?: number;
    portfolio_or_account_id?: number;
    descriptive?: boolean;
    returns?: boolean;
}
export interface TransactionQueryParams {
    client_id?: number;
    portfolio_entity_id?: number;
    instrument_entity_id?: number;
    trade_date_from?: string;
    trade_date_to?: string;
    transaction_type_id?: number;
    transaction_status_id?: number;
    show_deleted?: 'Active' | 'Deleted' | 'All';
    descriptive?: boolean;
}
export interface EntityQueryParams {
    client_id?: number;
    entity_category?: 'Portfolio' | 'Account' | 'Instrument' | 'Currency' | 'Person';
    search?: string;
    names_only?: boolean;
    show_deleted?: 'Active' | 'Deleted' | 'All';
}
//# sourceMappingURL=types.d.ts.map