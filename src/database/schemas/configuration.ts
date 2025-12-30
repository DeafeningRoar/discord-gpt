import { type ObjectId, Schema } from 'mongoose';

export interface Configuration<T = Record<string, unknown>> {
  _id: ObjectId;
  name: string;
  config: T;
  createdAt: Date;
  updatedAt?: Date;
}

export default new Schema({
  name: { type: String, required: true, index: true },
  config: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});
