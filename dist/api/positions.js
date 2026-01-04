import { apiGet } from './client.js';
import { logger } from '../utils/logger.js';
export async function getPositions(params) {
    logger.info({ params }, 'Fetching positions');
    const queryParams = {};
    if (params?.client_id)
        queryParams.client_id = params.client_id;
    if (params?.position_date)
        queryParams.position_date = params.position_date;
    if (params?.portfolio_entity_id)
        queryParams.portfolio_entity_id = params.portfolio_entity_id;
    if (params?.portfolio_or_account_id)
        queryParams.portfolio_or_account_id = params.portfolio_or_account_id;
    if (params?.descriptive !== undefined)
        queryParams.descriptive = params.descriptive;
    if (params?.returns !== undefined)
        queryParams.returns = params.returns;
    const response = await apiGet('/positions', queryParams);
    logger.info({ count: response.count }, 'Positions fetched');
    return response.data;
}
export async function getPositionById(positionId) {
    try {
        const response = await apiGet(`/positions/${positionId}`);
        return response;
    }
    catch (error) {
        if (error.statusCode === 404) {
            return null;
        }
        throw error;
    }
}
//# sourceMappingURL=positions.js.map