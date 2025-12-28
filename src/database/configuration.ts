import mongoose from './mongoose';
import { configuration, models } from './schemas';

const getModel = () => mongoose.getModel(models.configuration, configuration);

export { getModel };
