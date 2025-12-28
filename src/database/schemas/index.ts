import conversation from './conversation';
import speakQueue from './speak-queue';
import configuration from './configuration';

enum models {
  conversation = 'conversation',
  speakQueue = 'speakQueue',
  configuration = 'configuration',
};

export { models, conversation, speakQueue, configuration };
