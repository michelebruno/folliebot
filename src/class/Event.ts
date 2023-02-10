import moment from 'moment';
import question, { EventOrExhibition } from './EventOrExhibition';
import { validateAndTransformDate, validateAndTransformTime, validateAndTransformUrl } from '../utils/validators';

export class Event extends EventOrExhibition {
  protected readonly type = 'event';

  private readonly hour: number;

  protected static jsonable = ['ItemId',
    'startDate',
    'tags',
    'title',
    'description',
    'link',
    'utente',
  ];

  constructor(data, ctx) {
    super(data, ctx);

    const { hour } = data;

    this.hour = hour;
  }

  async handleSession(ctx = this.ctx) {
    const { message } = ctx;

    if (this.isWaitingFor('link')) {
      try {
        const link = new URL(validateAndTransformUrl(message?.text));

        ctx.session.link = link.toString();

        await this.ask('startDate');
      } catch (e) {
        if (e.code === 'ERR_INVALID_URL') {
          await ctx.reply('Questo url non è valido. Riprova o digita /cancel');
        }
      }
    } else if (this.isWaitingFor('startDate')) {
      const date = validateAndTransformDate(message.text);
      if (date) {
        ctx.session.startDate = date;

        if (moment(date).hour()) {
          await this.ask('description', ctx);
        } else await this.ask('hour', ctx);
      } else {
        await ctx.reply('Questa data non è valida, riprova in un formato com DD/MM/YYYY');
      }
    } else if (this.isWaitingFor('hour')) {
      const time = validateAndTransformTime(message.text, this.startDate);

      if (!time) {
        await ctx.reply('Questa ora non è valida, riprova in un formato com HH:mm');
        return;
      }

      ctx.session.startDate = time;

      await this.ask('description', ctx);
    } else if (this.isWaitingFor('description')) {
      ctx.session.description = {
        text: message?.text,
        entities: message?.entities,
      };

      await this.ask('tags');
    } else if (this.isWaitingFor('tags')) {
      const tags = message.text.split(',').filter((i) => i).map((t) => `#${t.trim().toLowerCase()}`);

      if (tags.length < 3) {
        await ctx.reply(`Hai usato ${tags.length}, ma devi specificare almeno 3 tags. Riprova o digita /cancel per annullare.`);
        return;
      }

      ctx.session.tags = tags;

      this.tags = tags;

      await ctx.reply(this.message.text);

      await ctx.reply("Ok, mando subito l'evento sul canale che hai scelto.");

      // await ctx.telegram.sendMessage(-1001640910905, this.message)

      await this.save();

      ctx?.session = null;
    }
  }

  get displayDate(): string {
    return moment(this.startDate).locale('it').format('DD MMMM YY [-] HH:MM');
  }
}
