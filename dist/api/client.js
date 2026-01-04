import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { getAuthToken } from '../utils/auth.js';
// Custom error class for API errors
export class ApiError extends Error {
    statusCode;
    originalError;
    constructor(message, statusCode, originalError) {
        super(message);
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.name = 'ApiError';
    }
}
// Create axios instance with default configuration
function createApiClient() {
    const client = axios.create({
        baseURL: config.API_BASE_URL,
        timeout: config.API_TIMEOUT_MS,
        headers: {
            'Content-Type': 'application/json',
            // Authorization header will be added dynamically by the interceptor
        },
    });
    // Request interceptor for logging and auth
    client.interceptors.request.use(async (requestConfig) => {
        // Add dynamic auth token
        try {
            const token = await getAuthToken();
            requestConfig.headers['Authorization'] = `Bearer ${token}`;
        }
        catch (error) {
            logger.error({ error }, 'Failed to inject auth token');
            throw error;
        }
        logger.debug({
            method: requestConfig.method?.toUpperCase(),
            url: requestConfig.url,
            params: requestConfig.params,
        }, 'API Request');
        return requestConfig;
    }, (error) => {
        logger.error({ error: error.message }, 'Request interceptor error');
        return Promise.reject(error);
    });
    // Response interceptor for logging and error handling
    client.interceptors.response.use((response) => {
        logger.debug({
            status: response.status,
            url: response.config.url,
            dataSize: JSON.stringify(response.data).length,
        }, 'API Response');
        return response;
    }, (error) => {
        const statusCode = error.response?.status || 500;
        const message = error.response?.data?.error || error.message;
        logger.error({
            status: statusCode,
            url: error.config?.url,
            message,
        }, 'API Error');
        return Promise.reject(new ApiError(message, statusCode, error));
    });
    return client;
}
// Retry logic wrapper
async function withRetry(fn, retries = config.API_RETRY_COUNT, delay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            // Don't retry on 4xx errors (client errors)
            if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
                throw error;
            }
            if (attempt < retries) {
                logger.warn({
                    attempt,
                    maxRetries: retries,
                    error: lastError.message,
                }, 'Retrying API call');
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }
    throw lastError;
}
// Export singleton client
export const apiClient = createApiClient();
// Helper for GET requests with retry
export async function apiGet(endpoint, params) {
    return withRetry(async () => {
        const response = await apiClient.get(endpoint, { params });
        return response.data;
    });
}
// Helper for PUT requests with retry
export async function apiPut(endpoint, data) {
    return withRetry(async () => {
        const response = await apiClient.put(endpoint, data);
        return response.data;
    });
}
//# sourceMappingURL=client.js.map