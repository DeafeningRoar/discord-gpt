import type { Mongoose, Schema } from 'mongoose';

import { connect } from 'mongoose';

import { MONGODB_CONNECTION_URL, MONGODB_DB_NAME } from '../config/env';

class MongoDB {
  #client?: Mongoose;

  private static instance?: MongoDB;

  private async init() {
    this.#client = await connect(MONGODB_CONNECTION_URL as string, {
      dbName: MONGODB_DB_NAME as string,
    });
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new MongoDB();
    this.instance.init();

    return this.instance;
  }

  get client() {
    return this.#client;
  }

  getModel(name: string, schema: Schema) {
    if (!this.#client) {
      throw new Error('Mongoose client not started');
    }

    return this.#client.model(name, schema);
  }
}

export default MongoDB.getInstance();
