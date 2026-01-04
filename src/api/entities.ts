import { apiGet } from './client.js';
import type { Entity, ListResponse, EntityQueryParams } from './types.js';
import { logger } from '../utils/logger.js';

export async function getEntities(params?: EntityQueryParams): Promise<Entity[]> {
    logger.info({ params }, 'Fetching entities');

    const queryParams: Record<string, any> = {};

    if (params?.client_id) queryParams.client_id = params.client_id;
    if (params?.entity_category) queryParams.entity_category = params.entity_category;
    if (params?.search) queryParams.search = params.search;
    if (params?.names_only) queryParams.names_only = params.names_only;
    if (params?.show_deleted) queryParams.show_deleted = params.show_deleted;

    const response = await apiGet<ListResponse<Entity>>('/entities', queryParams);

    logger.info({ count: response.count }, 'Entities fetched');
    return response.data;
}

export async function getEntityByName(entityName: string): Promise<Entity | null> {
    try {
        const response = await apiGet<Entity>(`/entities/${encodeURIComponent(entityName)}`);
        return response;
    } catch (error: any) {
        if (error.statusCode === 404) {
            return null;
        }
        throw error;
    }
}

export async function searchInstruments(searchTerm: string): Promise<Entity[]> {
    return getEntities({
        entity_category: 'Instrument',
        search: searchTerm,
    });
}

export async function getPortfolios(): Promise<Entity[]> {
    return getEntities({
        entity_category: 'Portfolio',
    });
}
