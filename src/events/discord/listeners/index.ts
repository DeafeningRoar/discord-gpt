import type { Discord } from '../../../integrations';
import type {
  DiscordInteraction,
  DiscordInteractionResponseEvent,
  DiscordCreateMessageEvent,
  DiscordEnrichMessageEvent,
  DiscordProcessingErrorEvent,
  AIResponseInProgressEvent,
  AgentResponseEvent,
  DiscordMessage,
} from '../../../../@types';

import { Emitter } from '../../../services';
import { DISCORD_EVENTS, EVENTS } from '../../../config/constants';

import DiscordControllers from '../controllers';

const startListeners = ({ discord }: { discord: Discord }) => {
  Emitter.on(
    EVENTS.DISCORD_CONNECTION_ERROR,
    async discordInstance => await DiscordControllers.handleConnectionError(discordInstance),
  );

  Emitter.on(EVENTS.DISCORD_READY, async () => await DiscordControllers.handleDiscordReady(discord));

  Emitter.on(
    EVENTS.DISCORD_ENRICHED_MESSAGE,
    async (event: DiscordEnrichMessageEvent) => await DiscordControllers.handleEnrichedMessage(event, discord),
  );

  Emitter.on(
    EVENTS.DISCORD_CREATED_MESSAGE,
    async (event: DiscordCreateMessageEvent) => await DiscordControllers.handleCreatedMessage(event, discord),
  );

  Emitter.on(
    EVENTS.DISCORD_INTERACTION_PROCESSED,
    async (event: DiscordInteractionResponseEvent) => await DiscordControllers.handleInteractionProcessed(event),
  );

  Emitter.on(
    EVENTS.DISCORD_MESSAGE_PROCESSED,
    async (event: AgentResponseEvent) => await DiscordControllers.handleMessageProcessed(event, discord),
  );

  Emitter.on(
    EVENTS.DISCORD_INTERACTION_CREATED,
    async (event: { interaction: DiscordInteraction | DiscordMessage; type: 'message' | 'interaction' }) => await DiscordControllers.handleInteractionCreated(event),
  );

  Emitter.on(
    EVENTS.DISCORD_INTERACTION_VALIDATED,
    async (event: { eventType: string; interaction: DiscordInteraction; user: string; guildId: string; userId: string; isDM: boolean }) =>
      DiscordControllers.handleInteractionValidated(event),
  );

  Emitter.on(
    EVENTS.DISCORD_PROCESSING_ERROR,
    (event: DiscordProcessingErrorEvent) =>
      DiscordControllers.handleProcessingError(event),
  );

  Emitter.on(
    DISCORD_EVENTS.RESPONSE_IN_PROGRESS,
    (event: AIResponseInProgressEvent) => DiscordControllers.handleResponseInProgress(event, discord),
  );
};

export default startListeners;
