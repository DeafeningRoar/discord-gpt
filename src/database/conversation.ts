import mongoose from './mongoose';
import { conversation, models } from './schemas';

const getModel = () => mongoose.getModel(models.conversation, conversation);

export { getModel };
