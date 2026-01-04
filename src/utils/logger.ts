import { pino } from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
    level: config.LOG_LEVEL,
    base: {
        service: 'finance-mcp-server',
        env: config.NODE_ENV,
    },
}, pino.destination(2)); // Use stderr for logs
