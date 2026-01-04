import type { Entity, EntityQueryParams } from './types.js';
export declare function getEntities(params?: EntityQueryParams): Promise<Entity[]>;
export declare function getEntityByName(entityName: string): Promise<Entity | null>;
export declare function searchInstruments(searchTerm: string): Promise<Entity[]>;
export declare function getPortfolios(): Promise<Entity[]>;
//# sourceMappingURL=entities.d.ts.map