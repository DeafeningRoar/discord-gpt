import type { Configuration } from '../../../database/schemas';

import { Cache, logger } from '../../../services';
import { configuration } from '../../../database';
import { ResponseStream } from 'openai/lib/responses/ResponseStream';

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

const getConversationConfig = async <T = Record<string, unknown>>(): Promise<Configuration<T>['config']> => {
  try {
    const configsModel = configuration.getModel();

    const cached = Cache.getCache<string>('conversation-config');

    if (cached) {
      return JSON.parse(cached);
    }

    const conversationConfig = await configsModel.findOne<Configuration<T>>({ name: 'conversation_settings' });

    const config = conversationConfig?.config;

    if (!config) {
      logger.warn('No conversation config found in database');
      return {} as T;
    }

    Cache.setCache('conversation-config', JSON.stringify(conversationConfig?.config), 60);

    return config;
  } catch (err: unknown) {
    const error = err as Error;

    logger.error('Error fetching conversation config', {
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    });

    return {} as T;
  }
};

const getAllowedChannels = async <T = Record<string, unknown>>(): Promise<Configuration<T>['config']> => {
  try {
    const configsModel = configuration.getModel();

    const cached = Cache.getCache<string>('channels-config');

    if (cached) {
      return JSON.parse(cached);
    }

    const channelsConfig = await configsModel.findOne<Configuration<T>>({ name: 'allowed_channels' });

    const config = channelsConfig?.config;

    if (!config) {
      logger.warn('No channel config found in database');
      return {} as T;
    }

    Cache.setCache('channels-config', JSON.stringify(channelsConfig?.config), 60);

    return config;
  } catch (err: unknown) {
    const error = err as Error;

    logger.error('Error fetching channel config', {
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    });

    return {} as T;
  }
};

const promisifyAgentStream = (stream: ResponseStream) => {
  return new Promise((resolve, reject) => {
    stream.on('response.completed', (event) => {
      if (event.response.status === 'failed' || event.response.status === 'cancelled') {
        reject(event.response.error);
      }
    });

    stream.on('response.output_text.done', event => resolve(event.text));

    stream.on('error', reject);
  });
};

export { AGENT_TYPES, getAgentConfig, getConversationConfig, getAllowedChannels, promisifyAgentStream };
