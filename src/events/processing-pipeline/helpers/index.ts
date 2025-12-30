import type { Configuration } from '../../../database/schemas';

import { Cache, logger } from '../../../services';
import { configuration } from '../../../database';

enum AGENT_TYPES {
  DECISION = 'decisionAgent',
  CHAT = 'chatAgent',
}

interface AgentConfig {
  [x: string]: unknown;
  prompt: string;
  model: string;
}

const getAgentConfig = async (agent: AGENT_TYPES): Promise<AgentConfig> => {
  try {
    const configsModel = configuration.getModel();

    const cached = Cache.getCache<string>('agents');

    if (cached) {
      const parsed = JSON.parse(cached);

      return parsed[agent];
    }

    const agentsConfig = await configsModel.findOne<Configuration>({ name: 'agents' });

    const config = agentsConfig?.config?.[agent] as AgentConfig | undefined;

    if (!config) {
      throw new Error('No agents config found in database');
    }

    Cache.setCache('agents', JSON.stringify(agentsConfig?.config), 300);

    return config;
  } catch (error: unknown) {
    const err = error as Error;

    logger.info('Error fetching agent configurations', {
      message: err.message,
      stack: err.stack,
      agent,
    });

    throw error;
  }
};

export { AGENT_TYPES, getAgentConfig };
