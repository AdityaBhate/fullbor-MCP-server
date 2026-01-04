import { z } from 'zod';
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodObject<any>;
    handler: (input: any) => Promise<any>;
}
//# sourceMappingURL=types.d.ts.map