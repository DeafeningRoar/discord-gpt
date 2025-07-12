/* eslint-disable @typescript-eslint/no-extraneous-class */
import EventEmitter from 'events';

class EventEmitterService {
  private static instance: EventEmitter;

  static getInstance(): EventEmitter {
    if (!EventEmitterService.instance) {
      EventEmitterService.instance = new EventEmitter({ captureRejections: true });
    }
    return EventEmitterService.instance;
  }
}

export default EventEmitterService.getInstance();
