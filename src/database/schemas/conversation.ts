import { type ObjectId, Schema } from 'mongoose';

export interface Conversation {
  _id: ObjectId;
  source: string;
  channelId: string;
  version: number;
  state: {
    active: boolean;
    lastUserMessageAt: Date;
    lastBotMessageAt: Date;
  };
  summary?: {
    factual: string;
    lastUpdatedAt: Date;
  };
  liveBuffer: {
    role: string;
    content: string;
    files: { image?: { url: string; expiresAt: Date } };
    ts: Date;
  }[];
  lastDecision?: {
    action: string;
    confidence: number;
    reason: string;
    ts: string;
  };
  locks: {
    thinking: boolean;
    pending: boolean;
  };
  metadata: {
    responseEvent: string;
  };
  createdAt: Date;
  updatedAt?: Date;
}

const fileSchema = {
  image: {
    type: {
      url: { type: String, required: true },
      expiresAt: { type: Date },
    },
  },
};

export default new Schema({
  source: { type: String, required: true },
  channelId: { type: String, required: true },
  version: { type: Number, default: 1 },
  state: {
    active: { type: Boolean },
    lastUserMessageAt: { type: Date },
    lastBotMessageAt: { type: Date },
  },
  summary: {
    factual: { type: String },
    lastUpdatedAt: { type: Date },
  },
  liveBuffer: {
    type: [
      {
        role: { type: String, required: true },
        content: { type: String, required: true },
        files: { type: fileSchema, default: {} },
        ts: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  lastDecision: {
    type: {
      action: { type: String, required: true },
      confidence: { type: Number },
      reason: { type: String, required: true },
      ts: { type: Date, required: true },
    },
    required: false,
  },
  locks: {
    thinking: { type: Boolean, default: false },
    pending: { type: Boolean, default: false },
  },
  metadata: {
    type: {
      responseEvent: { type: String, required: true },
    },
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});
