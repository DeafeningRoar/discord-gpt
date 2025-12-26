import type { AIPipelineEvent } from '../../../../../@types';

import { PIPELINE_EVENTS } from '../../../../config/constants';
import { Emitter } from '../../../../services';
// import { AICacheStrategy } from "../../../../strategies/ai-cache-strategy";

// type MessageQueue = {
//   lastUpdatedAt: number;
//   messages: Array<string>;
// };

// const batchMessages = (input: string, messages: Array<string>) => {
//   const batch = [...messages, input].join('\n---\n');

//   return batch;
// }

// const sendBatchedEvent = (event: AIPipelineEvent, input: string, messages: Array<string>) => {
//   const batchedInput = batchMessages(input, messages);
//   Emitter.emit(PIPELINE_EVENTS.DECISION_INPUT_PROCESSED, { ...event, data: { ...event.data, input: batchedInput } });
// }

const handleProcessInputEvent = (event: AIPipelineEvent) => {
  Emitter.emit(PIPELINE_EVENTS.DECISION_INPUT_PROCESSED, event);
  // const { data: { id, input }, cacheStrategy } = event;

  // const cacheService = new AICacheStrategy({ baseCacheKey: cacheStrategy?.baseCacheKey });
  // const cacheKey = cacheService.getCacheKey(id) + ':queue';
  // const cached = cacheService.getCache(cacheKey) as string;

  // const queue = cached ? JSON.parse(cached) : { messages: [], lastUpdatedAt: -1 };
  // const hasRecentMessages = (new Date().getTime() - Number(queue.lastUpdatedAt)) < 5000;

  // if (!hasRecentMessages && queue.messages.length < 10) {
  //   console.log('Sending batched messages 1', { hasRecentMessages, queueLength: queue.messages.length });
  //   sendBatchedEvent(event, input, queue.messages);
  // } else {
  //   if (hasRecentMessages) {
  //     queue.messages.push(input);
  //     queue.lastUpdatedAt = new Date().getTime();
  //   }

  //   if (queue.messages.length >= 10) {
  //     console.log('Sending batched messages 2', { hasRecentMessages, queueLength: queue.messages.length });
  //     sendBatchedEvent(event, input, queue.messages);
  //   }
  // }
};

export { handleProcessInputEvent };
