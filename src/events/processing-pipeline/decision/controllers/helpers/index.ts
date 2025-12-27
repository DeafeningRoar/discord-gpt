import { z } from 'zod';

import { DECISION_ACTIONS, PIPELINE_EVENTS } from '../../../../../config/constants';

const decisionMakingSchema = z.object({
  action: z.enum([DECISION_ACTIONS.IGNORE, DECISION_ACTIONS.THINK, DECISION_ACTIONS.SUMMARIZE, DECISION_ACTIONS.SPEAK]),
  confidence: z.number().max(1.0).min(0.0),
  reason: z.string().describe('Short justification (max 15 words)'),
});

type Decision = typeof decisionMakingSchema._type;

const getActionPromotion = (decision: Decision) => {
  if (decision.action === DECISION_ACTIONS.IGNORE && decision.confidence < 0.8) {
    return {
      promoted: true,
      action: DECISION_ACTIONS.THINK,
    };
  }

  if (decision.action === DECISION_ACTIONS.SPEAK && decision.confidence < 0.65) {
    return {
      promoted: true,
      action: DECISION_ACTIONS.THINK,
    };
  }

  if (decision.action === DECISION_ACTIONS.THINK && decision.confidence < 0.6) {
    return {
      promoted: true,
      action: DECISION_ACTIONS.IGNORE,
    };
  }

  if (decision.action === DECISION_ACTIONS.THINK && decision.confidence < 0.75) {
    return {
      promoted: true,
      action: DECISION_ACTIONS.SPEAK,
    };
  }

  return {
    promoted: false,
    action: null,
  };
};

const getNextAction = (action: string) => {
  switch (action) {
    case DECISION_ACTIONS.IGNORE:
      return PIPELINE_EVENTS.IGNORE_INPUT_PROCESSED;
    case DECISION_ACTIONS.SUMMARIZE:
      return PIPELINE_EVENTS.SUMMARIZE_INPUT_PROCESSED;
    case DECISION_ACTIONS.THINK:
      return PIPELINE_EVENTS.THINK_INPUT_PROCESSED;

    case DECISION_ACTIONS.SPEAK:
      return PIPELINE_EVENTS.SPEAK_INPUT_PROCESSED;

    default:
      return DECISION_ACTIONS.THINK;
  }
};

const getProcessedDecision = (decision: Decision) => {
  const actionPromotion = getActionPromotion(decision);

  if (actionPromotion.promoted && actionPromotion.action) {
    return getNextAction(actionPromotion.action);
  }

  return getNextAction(decision.action);
};

export { getProcessedDecision, decisionMakingSchema };
