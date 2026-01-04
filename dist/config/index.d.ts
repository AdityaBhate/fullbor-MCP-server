import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    API_BASE_URL: z.ZodDefault<z.ZodString>;
    AWS_REGION: z.ZodDefault<z.ZodString>;
    USER_POOL_ID: z.ZodDefault<z.ZodString>;
    CLIENT_ID: z.ZodDefault<z.ZodString>;
    TEST_USERNAME: z.ZodString;
    TEST_PASSWORD: z.ZodString;
    PORT: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    API_TIMEOUT_MS: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    API_RETRY_COUNT: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    DEFAULT_USER_ID: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    API_BASE_URL: string;
    AWS_REGION: string;
    USER_POOL_ID: string;
    CLIENT_ID: string;
    TEST_USERNAME: string;
    TEST_PASSWORD: string;
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    API_TIMEOUT_MS: number;
    API_RETRY_COUNT: number;
    DEFAULT_USER_ID?: string | undefined;
}, {
    TEST_USERNAME: string;
    TEST_PASSWORD: string;
    API_BASE_URL?: string | undefined;
    AWS_REGION?: string | undefined;
    USER_POOL_ID?: string | undefined;
    CLIENT_ID?: string | undefined;
    PORT?: string | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    API_TIMEOUT_MS?: string | undefined;
    API_RETRY_COUNT?: string | undefined;
    DEFAULT_USER_ID?: string | undefined;
}>;
export type EnvConfig = z.infer<typeof envSchema>;
export declare function loadConfig(): EnvConfig;
export declare const config: {
    API_BASE_URL: string;
    AWS_REGION: string;
    USER_POOL_ID: string;
    CLIENT_ID: string;
    TEST_USERNAME: string;
    TEST_PASSWORD: string;
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    API_TIMEOUT_MS: number;
    API_RETRY_COUNT: number;
    DEFAULT_USER_ID?: string | undefined;
};
export {};
//# sourceMappingURL=index.d.ts.map