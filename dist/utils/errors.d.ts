export declare class McpError extends Error {
    code: string;
    recoverable: boolean;
    constructor(message: string, code: string, recoverable?: boolean);
}
export declare class ApiConnectionError extends McpError {
    endpoint?: string | undefined;
    constructor(message: string, endpoint?: string | undefined);
}
export declare class AuthenticationError extends McpError {
    constructor(message?: string);
}
export declare class ValidationError extends McpError {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class NotFoundError extends McpError {
    constructor(resource: string, identifier: string);
}
export declare function handleToolError(error: unknown, toolName: string): object;
export declare function getFriendlyErrorMessage(error: unknown): string;
//# sourceMappingURL=errors.d.ts.map