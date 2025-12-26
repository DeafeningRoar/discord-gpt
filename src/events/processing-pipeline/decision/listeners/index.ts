import { Emitter } from '../../../../services';
import { placeholderController } from '../controllers';

const EVENTS_PREFIX = 'decision';
const EVENTS = {
  PLACEHOLDER: `${EVENTS_PREFIX}:placeholder`,
};

const start = () => {
  Emitter.on(
    EVENTS.PLACEHOLDER,
    placeholderController,
  );
};

export default start;
