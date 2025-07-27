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
import { AWS_ALEXA_SKILL_ID, API_KEY } from '../config/env';

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
      logger.log(`Received request: ${req.method} - ${req.url}`, {
        body: req.body,
      });
      next();
    });

    app.use((req, res, next) => {
      const skillId = req.headers['x-skill-id'];
      const apiKey = req.headers['x-api-key'];

      if (!skillId && !apiKey) {
        return res.status(404).send();
      }

      if (skillId && skillId !== AWS_ALEXA_SKILL_ID) {
        return res.status(404).send();
      }

      if (apiKey && apiKey !== API_KEY) {
        return res.status(404).send();
      }

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
