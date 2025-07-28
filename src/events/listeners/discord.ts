import type { Discord } from '../../services';
import type {
  DiscordInteraction,
  DiscordInteractionResponseEvent,
  DiscordCreateMessageEvent,
  DiscordEnrichMessageEvent,
} from '../../../@types';

import { Emitter } from '../../services';
import { EVENTS } from '../../config/constants';

import DiscordControllers from '../controllers/discord';

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
    EVENTS.DISCORD_INTERACTION_CREATED,
    async (event: { interaction: DiscordInteraction }) => await DiscordControllers.handleInteractionCreated(event),
  );

  Emitter.on(
    EVENTS.DISCORD_INTERACTION_VALIDATED,
    async (event: { eventType: string; interaction: DiscordInteraction; user: string; guildId: string }) =>
      DiscordControllers.handleInteractionValidated(event),
  );
};

export default startListeners;
