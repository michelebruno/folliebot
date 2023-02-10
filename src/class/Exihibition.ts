import question, { EventOrExhibition } from './EventOrExhibition';
import { validateAndTransformDate, validateAndTransformUrl } from '../utils/validators';

export default class Exihibition extends EventOrExhibition {
  protected readonly type = 'exhibition';

  protected static jsonable = ['ItemId',
    'startDate',
    'tags',
    'title',
    'description',
    'link',
    'utente'];

  async handleSession(ctx = this.ctx) {
    const { message } = ctx;

    if (this.isWaitingFor(question.link)) {
      try {
        const link = new URL(validateAndTransformUrl(message?.text));

        ctx.session.link = link.toString();

        await this.ask(question.startDate);
      } catch (e) {
        if (e.code === 'ERR_INVALID_URL') {
          await ctx.reply('Questo link non è valido. Riprova o digita /cancel');
        }
      }
    } else if (this.isWaitingFor(question.startDate)) {
      const date = validateAndTransformDate(message.text);
      if (date) {
        ctx.session.startDate = date;
        await this.ask(question.endDate);
      } else {
        await ctx.reply('Questa data non è valida, riprova in un formato com DD/MM/YYYY');
      }
    } else if (this.isWaitingFor(question.endDate)) {
      const date = validateAndTransformDate(message.text);

      if (!date) {
        await ctx.reply('Questa data non è valida, riprova in un formato com DD/MM/YYYY');
      }

      ctx.session.endDate = date;

      await this.ask(question.description, ctx);
    } else if (this.isWaitingFor(question.description)) {
      ctx.session.description = {
        text: message?.text,
        entities: message?.entities,
      };

      await this.ask(question.tags);
    } else if (this.isWaitingFor(question.tags)) {
      const tags = message.text.split(',').filter((i) => i).map((t) => `#${t.trim().toLowerCase()}`);

      if (tags.length < 3) {
        return ctx.reply(`Hai usato ${tags.length}, ma devi specificare almeno 3 tags. Riprova o digita /cancel per annullare.`);
      }

      ctx.session.tags = tags;

      this.tags = tags;

      await ctx.reply(this.message.text);
      await ctx.reply("Ok, mando subito l'evento sul canale che hai scelto.");

      // await ctx.telegram.sendMessage(-1001640910905, this.message);

      await this.save();

      ctx?.session = null;
    }
  }

  get displayDate(): string {
    return '';
  }
}
