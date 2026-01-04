import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    // API Configuration
    API_BASE_URL: z.string().url().default('https://api.fullbor.ai/v2'),

    // Cognito Configuration
    AWS_REGION: z.string().default('us-east-2'),
    USER_POOL_ID: z.string().default('us-east2_IJ1C0mWXW'),
    CLIENT_ID: z.string().default('1lntksiqrqhmjea6obrrrrnmh1'),
    TEST_USERNAME: z.string().min(1, 'TEST_USERNAME is required'),
    TEST_PASSWORD: z.string().min(1, 'TEST_PASSWORD is required'),

    // Server Configuration
    PORT: z.string().transform(Number).default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // API Client Configuration
    API_TIMEOUT_MS: z.string().transform(Number).default('10000'),
    API_RETRY_COUNT: z.string().transform(Number).default('3'),

    // User Context (for API calls)
    DEFAULT_USER_ID: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadConfig(): EnvConfig {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment configuration:');
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
}

export const config = loadConfig();
