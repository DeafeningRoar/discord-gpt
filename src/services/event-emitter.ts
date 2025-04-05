import EventEmitter from 'events';

let emitter = null;

if (emitter === null) {
  emitter = new EventEmitter({ captureRejections: true });
}

export default emitter as EventEmitter;
