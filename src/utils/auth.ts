import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { config } from '../config/index.js';
import { logger } from './logger.js';

let cachedToken: string | null = null;
let tokenExpiration: number = 0;

export async function getAuthToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if valid (with 5 minute buffer)
    if (cachedToken && tokenExpiration > now + 300) {
        return cachedToken;
    }

    logger.info('Acquiring new Cognito token...');

    try {
        const client = new CognitoIdentityProviderClient({ region: config.AWS_REGION });

        const command = new AdminInitiateAuthCommand({
            UserPoolId: config.USER_POOL_ID,
            ClientId: config.CLIENT_ID,
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            AuthParameters: {
                USERNAME: config.TEST_USERNAME,
                PASSWORD: config.TEST_PASSWORD,
            },
        });

        const response = await client.send(command);
        const result = response.AuthenticationResult;

        if (!result || !result.IdToken) {
            throw new Error('Authentication failed: No token received');
        }

        cachedToken = result.IdToken;
        // Default to 1 hour if ExpiresIn is missing (standard Cognito duration)
        tokenExpiration = now + (result.ExpiresIn || 3600);

        logger.info('Successfully authenticated with Cognito');
        return cachedToken;
    } catch (error) {
        logger.error({ error }, 'Failed to authenticate with Cognito');
        throw error;
    }
}
