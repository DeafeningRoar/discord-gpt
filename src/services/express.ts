import type { Express } from 'express';
import type { Response } from 'express';
import type { ResponseEvent } from '../../@types';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import routes from '../routes';
import logger from './logger';
import Emitter from './event-emitter';
import { EVENTS } from '../config/constants';

class ExpressService {
  app: Express | undefined;

  PORT = process.env.PORT || 3000;

  init() {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors());
    app.use(helmet());
    app.use((req, res, next) => {
      logger.log(`Received request: ${req.method} - ${req.url}`);
      next();
    });

    app.use('/api/v1', routes);

    app.listen(this.PORT, () => {
      logger.log(`Express server is running on port ${this.PORT}`);
    });

    Emitter.on(EVENTS.EXPRESS_RESPONSE_READY, (data: ResponseEvent<{ res: Response }, string>) => {
      const { response, responseMetadata } = data;

      const { res } = responseMetadata;

      res.send({ response });
    });

    return app;
  }
}

export default ExpressService;
