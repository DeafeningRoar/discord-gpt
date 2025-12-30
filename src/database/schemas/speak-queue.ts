import { type ObjectId, Schema } from 'mongoose';

export interface SpeakQueue {
  _id: ObjectId;
  status: 'PENDING' | 'DONE' | 'CLAIMED';
  conversationId: string;
  version: number;
  claimedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export default new Schema({
  status: { type: String, required: true },
  conversationId: { type: Schema.ObjectId, required: true },
  version: { type: Number, default: 1 },
  claimedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});
