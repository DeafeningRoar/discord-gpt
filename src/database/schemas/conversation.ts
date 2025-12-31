import { type ObjectId, Schema } from 'mongoose';

export interface Conversation {
  _id: ObjectId;
  source: string;
  channelId: string;
  version: number;
  state: {
    active: boolean;
    topic: string;
    confidence: number;
    lastUserMessageAt: Date;
    lastBotMessageAt: Date;
    secondsSinceLastSpeak: number;
  };
  summary?: {
    factual: string;
    openIntents: string[];
    lastUpdatedAt: Date;
  };
  liveBuffer: {
    role: string;
    content: string;
    files: { image?: { url: string; expiresAt: Date } };
    ts: Date;
  }[];
  pending: {
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
    speaking: boolean;
    thinking: boolean;
    pending: boolean;
  };
  metadata: {
    pendingSpeak: boolean;
    thinkCount: number;
    ignoreCount: number;
    responseEvent: string;
    pendingStartAt: Date | null;
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
    topic: { type: String },
    confidence: { type: Number },
    lastUserMessageAt: { type: Date },
    lastBotMessageAt: { type: Date },
    secondsSinceLastSpeak: { type: Number, default: 0 },
  },
  summary: {
    factual: { type: String },
    openIntents: { type: Array, default: [] },
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
  pending: {
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
    speaking: { type: Boolean, default: false },
    thinking: { type: Boolean, default: false },
    pending: { type: Boolean, default: false },
  },
  metadata: {
    type: {
      pendingSpeak: { type: Boolean, default: false },
      thinkCount: { type: Number, default: 0 },
      ignoreCount: { type: Number, default: 0 },
      responseEvent: { type: String, required: true },
      pendingStartAt: { type: Date },
    },
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});
