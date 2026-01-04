export declare const SYSTEM_PROMPTS: {
    assistant_context: string;
    trading_rules: string;
    formatting_rules: string;
    error_handling: string;
};
export declare function getFullSystemPrompt(): string;
export declare function getPromptSection(section: keyof typeof SYSTEM_PROMPTS): string;
//# sourceMappingURL=prompts.d.ts.map