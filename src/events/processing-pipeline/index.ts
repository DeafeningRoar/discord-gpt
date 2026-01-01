import EntryPoint from './entry-point';
import MessageIngress from './message-ingress';
import Think from './think';
import OutputProcessor from './output-processor';

export default () => {
  EntryPoint();
  MessageIngress();
  Think();
  OutputProcessor();
};
