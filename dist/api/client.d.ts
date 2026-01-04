import { AxiosInstance } from 'axios';
export declare class ApiError extends Error {
    statusCode: number;
    originalError?: Error | undefined;
    constructor(message: string, statusCode: number, originalError?: Error | undefined);
}
export declare const apiClient: AxiosInstance;
export declare function apiGet<T>(endpoint: string, params?: Record<string, any>): Promise<T>;
export declare function apiPut<T>(endpoint: string, data?: Record<string, any>): Promise<T>;
//# sourceMappingURL=client.d.ts.map