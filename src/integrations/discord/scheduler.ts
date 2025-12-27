import { CronJob } from 'cron';

// import { mongoose, schemas } from '../../database';

const autoStart = false;

// const SOURCE = 'discord';

const job = new CronJob(
  '*/15 * * * * *',
  async function () {
    // const model = mongoose.getModel(schemas.models.conversation, schemas.conversation);

    // if (!model) return;

    // const activeConversations = await model.find({
    //   source: SOURCE,
    //   'state.active': true,
    // });

    // console.log(activeConversations);
  },
  null,
  autoStart,
);

export default job;
