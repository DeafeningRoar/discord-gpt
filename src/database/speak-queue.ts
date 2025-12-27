import mongoose from './mongoose';
import { speakQueue, models } from './schemas';

const getModel = () => mongoose.getModel(models.speakQueue, speakQueue);

export { getModel };
