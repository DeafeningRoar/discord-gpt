import type { Conversation } from './conversation';
import type { SpeakQueue } from './speak-queue';
import type { Configuration } from './configuration';

import conversation from './conversation';
import speakQueue from './speak-queue';
import configuration from './configuration';

enum models {
  conversation = 'conversation',
  speakQueue = 'speakQueue',
  configuration = 'configuration',
};

export type { Configuration, Conversation, SpeakQueue };
export { models, conversation, speakQueue, configuration };
