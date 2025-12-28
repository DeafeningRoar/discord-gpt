import { type ObjectId, Schema } from 'mongoose';

export interface Configuration {
  _id: ObjectId;
  name: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
}

export default new Schema({
  name: { type: String, required: true, index: true },
  config: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});
