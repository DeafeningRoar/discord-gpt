import EntryPoint from './entry-point';
import MessageQueue from './message-queue';
import Decision from './decision';
import Summarize from './summarize';
import Think from './think';
import Speak from './speak';
import Ignore from './ignore';
import ContextComposer from './context-composer';

export default () => {
  EntryPoint();
  MessageQueue();
  Decision();
  Summarize();
  Think();
  Speak();
  Ignore();
  ContextComposer();
};
