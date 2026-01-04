// Custom error types for better error handling
export class McpError extends Error {
    code;
    recoverable;
    constructor(message, code, recoverable = true) {
        super(message);
        this.code = code;
        this.recoverable = recoverable;
        this.name = 'McpError';
    }
}
export class ApiConnectionError extends McpError {
    endpoint;
    constructor(message, endpoint) {
        super(message, 'API_CONNECTION_ERROR', true);
        this.endpoint = endpoint;
        this.name = 'ApiConnectionError';
    }
}
export class AuthenticationError extends McpError {
    constructor(message = 'Authentication failed') {
        super(message, 'AUTH_ERROR', false);
        this.name = 'AuthenticationError';
    }
}
export class ValidationError extends McpError {
    field;
    constructor(message, field) {
        super(message, 'VALIDATION_ERROR', false);
        this.field = field;
        this.name = 'ValidationError';
    }
}
export class NotFoundError extends McpError {
    constructor(resource, identifier) {
        super(`${resource} "${identifier}" not found`, 'NOT_FOUND', false);
        this.name = 'NotFoundError';
    }
}
// Error handler for tool execution
export function handleToolError(error, toolName) {
    if (error instanceof McpError) {
        return {
            success: false,
            error: error.message,
            code: error.code,
            recoverable: error.recoverable,
        };
    }
    if (error instanceof Error) {
        return {
            success: false,
            error: error.message,
            code: 'UNKNOWN_ERROR',
            recoverable: true,
        };
    }
    return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        recoverable: true,
    };
}
// Friendly error messages for users
export function getFriendlyErrorMessage(error) {
    if (error instanceof ApiConnectionError) {
        return "I'm having trouble reaching your portfolio data right now. This usually resolves in a few seconds. Want to try again?";
    }
    if (error instanceof AuthenticationError) {
        return "There's an authentication issue. Please make sure the MCP server is properly configured.";
    }
    if (error instanceof NotFoundError) {
        return error.message;
    }
    if (error instanceof ValidationError) {
        return `Invalid input: ${error.message}`;
    }
    return "I encountered an unexpected issue. Let me try a different approach...";
}
//# sourceMappingURL=errors.js.map