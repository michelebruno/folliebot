import { VercelRequest, VercelResponse } from '@vercel/node';
import { Markup } from 'telegraf';
import DynamoDBSession from 'telegraf-session-dynamodb';
import moment from 'moment';
import handleElemosina, { handleElemosinaCallback } from '../src/handlers/elemosina';
import { getTickets } from '../src/utils/tickets';
import {
  addUser, broadcast, getDisplayName, isAdmin, mapUsers,
} from '../src/utils/users';
import { getCurrentStatus } from '../src/utils/limits';
import Context from '../src/types/Context';
// @ts-ignore
import { hasUserName } from '../src/utils/validators';
import { bot } from '../src/bot';
import { Event } from '../src/class/Event';
import Exihibition from '../src/class/Exihibition';
import question from '../src/class/EventOrExhibition';

const { SECRET_HASH } = process.env;

// Note: change to false when running locally
const BASE_PATH = 'https://folliebot.vercel.app';

const dynamoDBSession = new DynamoDBSession({
  dynamoDBConfig: {
    params: {
      TableName: process.env.AWS_DYNAMODB_TABLE_SESSIONS,
    },
    region: process.env.AWS_DYNAMODB_REGION || 'eu-south-1',
  },
  getSessionKey(ctx: Context) {
    if (!ctx.from || !ctx.chat) {
      return;
    }
    return `${process.env.VERCEL_ENV}:${ctx.from.id}:${ctx.chat.id}`;
  },
});

bot.use(dynamoDBSession.middleware());

bot.start(async (ctx: Context) => {
  const { update: { message: { from, chat } } } = ctx;

  await addUser(from, chat);

  await ctx.reply('Ciao, benvenuto!');
});

bot.command('eventi', async (ctx: Context) => {
  await ctx.reply('ciao');
  const events = await Event.getAll();

  for (const event of events) {
    await ctx.reply(event.message);
  }
});

export async function handleTestCommand(ctx: Context) {
  const COMMAND = '/test';
  const { message } = ctx;

  const reply = `Hello there! Awaiting your service: ${process.env?.VERCEL_ENV || process.env.NODE_ENV}`;

  const didReply = await ctx.reply(reply, {
    reply_to_message_id: message?.message_id,
  });

  if (didReply) {
    console.log(`Reply to ${COMMAND} command sent successfully.`);
  } else {
    console.error(
      `Something went wrong with the ${COMMAND} command. Reply not sent.`,
    );
  }
}

bot.command('broadcast', async (ctx: Context) => {
  ctx?.session = null;

  if (await hasUserName(ctx) && isAdmin(ctx)) {
    ctx.session.sharing_to = 'broadcast';

    await ctx.reply('Manda il messaggio da inoltrare a tutti.');
  }
});

bot.command('test', handleTestCommand);

bot.command('elemosina', handleElemosina);
bot.command('scrocca', handleElemosina);

bot.command('listTickets', async (ctx: Context) => {
  const result = await getTickets();
  return ctx.sendMessage(`Ecco i biglietti emessi: \n${result?.values?.map(([t, id, username]: string[]) => `${t} da ${username}`).join('\n')}`);
});

bot.command('productionWebhook', async (ctx: Context) => {
  await fetch('https://folliebot.vercel.app/api/telegram-hook?setWebhook=true');

  return ctx.reply('Hit hook');
});

bot.command('cancel', async (ctx: Context) => {
  ctx.session = null;
  await ctx.reply('Ho annnulato la tua richiesta.');
});

bot.command('consiglia', async (ctx: Context) => {
  await ctx.sendChatAction('typing');

  ctx.session = null;

  if (await hasUserName(ctx)) {
    ctx.session.utente = ctx.from;

    await ctx.reply(
      'Cosa vuoi consigliare?',

      Markup.inlineKeyboard([
        [
          Markup.button.callback('Evento', 'consiglia/evento'),
          Markup.button.callback('Mostra', 'consiglia/mostra'),
        ],
        [
          Markup.button.callback('Sito', 'consiglia/sito'),
        ],
      ]),
    );
  }
});

bot.action('consiglia/evento', async (ctx: Context) => {
  await ctx.editMessageReplyMarkup({
    reply_markup: { remove_keyboard: true },
  });

  ctx.session.sharing_to = 'events';

  await ctx.reply('Stai consigliando un *evento* su @eventiBVS', { parse_mode: 'MarkdownV2' });

  await (new Event(ctx.session, ctx)).ask('link', ctx);
});
bot.action('consiglia/mostra', async (ctx: Context) => {
  await ctx.editMessageReplyMarkup({
    reply_markup: { remove_keyboard: true },
  });

  ctx.session.sharing_to = 'exhibitions';

  await ctx.reply('Stai consigliando una *mostra* su @eventiBVS', { parse_mode: 'MarkdownV2' });

  await (new Exihibition(ctx.session, ctx)).ask('link', ctx);
});

bot.command('aule', async (ctx: Context) => {
  await ctx.sendChatAction('typing');

  const today = moment();

  const url = `https://www7.ceda.polimi.it/spazi/spazi/controller/OccupazioniGiornoEsatto.do?csic=MIB02&categoria=tutte&tipologia=tutte&giorno_day=${today.date()}&giorno_month=${today.month() + 1}&giorno_year=${today.year()}&jaf_giorno_date_format=dd%2FMM%2Fyyyy&evn_visualizza=`;

  await ctx.replyWithHTML('Situa aule di oggi', Markup.inlineKeyboard([
    [Markup.button.url('🏢🏢🏢️', url)],
  ]));
});

bot.command('angelus', async (ctx: Context) => {
  await ctx.sendChatAction('typing');

  await ctx.sendMessage('L’angelo del Signore portò l’annuncio a Maria\n'
    + '*E la Vergine concepì per opera dello Spirito Santo* \n'
    + '\n'
    + 'Ecco la serva del Signore\n'
    + '*Mi accada secondo la tua parola* \n'
    + '\n'
    + 'E il Verbo si è fatto carne\n'
    + '*E abita in mezzo a noi* \n'
    + '\n'
    + '_Ave Maria…_\n'
    + '\n'
    + 'Prega per noi, santa Madre di Dio\n'
    + '*Perché diventiamo degni delle promesse di Cristo*\n'
    + '\n'
    + 'Preghiamo\n'
    + 'Infondi, Signore, la tua grazia nei nostri cuori, affinché noi, che abbiamo conosciuto per l’annuncio dell’angelo l’Incarnazione del Figlio tuo Gesù Cristo, attraverso la sua Passione e Morte siamo condotti alla gloria della sua Risurrezione\n'
    + 'Per Cristo nostro Signore\n'
    + '*Amen* \n'
    + '\n'
    + 'Gloria…\n', { parse_mode: 'MarkdownV2' });
});

bot.command('memorare', async (ctx: Context) => {
  await ctx.sendChatAction('typing');

  await ctx.reply('Memoráre, o piíssima Virgo María, non esse audìtum a sǽculo, quémquam ad tua curréntem præsìdia, tua implorántem auxìlia, tua peténtem suffrágia, esse derelíctum.\n'
    + 'Ego tali animátus confidéntia, ad te, Virgo Vìrginum, Màter, curro, ad te vénio, còram te gémens peccàtor assisto.\nNoli, Màter Verbi, verba mea despícere; sed áudi propìtia et exáudi.');
});

bot.command('grandmaison', async (ctx: Context) => {
  await ctx.sendChatAction('typing');

  await ctx.reply('Santa Maria, Madre di Dio,\nconservami un cuore di fanciullo,\npuro e limpido come acqua di sorgente.\nOttienimi un cuore semplice,\nche non assapori la tristezza;\nun cuore grande nel donarsi\ne tenero nella compassione;\nun cuore fedele e generoso\nche non dimentichi nessun beneficio\ne non serbi rancore per il male.\nForma in me un cuore dolce e umile,\nun cuore grande ed indomabile\nche nessuna ingratitudine possa chiudere\ne nessuna indifferenza possa stancare;\nun cuore tormentato dalla gloria di Gesù Cristo,\nferito dal Suo amore con una piaga\nche non rimargini se non in Cielo. Amen.');
});

bot.command('status', async (ctx: Context) => {
  const status = await getCurrentStatus();

  await ctx.reply(`Globale state:\n${Object.entries(status).map(([k, v]) => (`${k}: ${v}`)).join('\n')}`);

  const myStatus = await getCurrentStatus(ctx?.from);

  await ctx.reply(`Your state:\n${Object.entries(myStatus).map(([k, v]) => (`${k}: ${v}`)).join('\n')}`);
});

bot.on('message', async (ctx: Context) => {
  if (ctx.session.sharing_to === 'events') {
    const event = new Event(ctx.session, ctx);
    return event.handleSession();
  }
  if (ctx.session.sharing_to === 'exhibitions') {
    const exhibition = new Exihibition(ctx.session, ctx);
    return await exhibition.handleSession();
  }
  if (ctx.session.sharing_to === 'broadcast' && isAdmin(ctx)) {
    await mapUsers(async (u) => {
      try {
        await bot.telegram.sendMessage(u.chatId, ctx?.message?.text, {
          entities: ctx?.message?.entities,
          // parse_mode: 'Markdown'
          // use the same parse_mode that you used in the original message
        });
      } catch (e) {
        await bot.telegram.sendMessage(850859747, `Errore nel broadcast verso l'utente ${getDisplayName(u)} con ID: ${u.chatId}`);
      }
    });
  }
});

bot.on('callback_query', async (ctx: Context) => {
  const { update: { callback_query } } = ctx;
  const { message, from } = callback_query;

  try {
    if (callback_query?.data === 'elemosina_sure') {
      return await handleElemosinaCallback(ctx);
    }
    if (callback_query?.data === 'elemosina_delete') {
      await ctx.telegram.deleteMessage(message.chat.id, message.message_id);

      await ctx.reply('Grande, conservalo per un caffé giudizio!');
    }
  } catch (e: any) {
    console.error(e.toString());
    if (e.toString() === '400: Bad Request: message to delete not found') return;
    // await ctx.reply("C'è stato un errore. Riprova")
    await bot.telegram.sendMessage(850859747, `⚠️ C'è stato un errore con ${getDisplayName(from)}`);
    await bot.telegram.sendMessage(850859747, e.toString());
  }
});

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Retrieve the POST request body that gets sent from Telegram
    const { body, query } = req;

    if (query.setWebhook === 'true') {
      const webhookUrl = `${BASE_PATH}/api/telegram-hook?secret_hash=${encodeURI(SECRET_HASH)}`;
      // Would be nice to somehow do this in a build file or something
      const isSet = await bot.telegram.setWebhook(webhookUrl);
    }

    if (query.secret_hash == SECRET_HASH) {
      await bot.handleUpdate(body);
    } else {
      console.warn('Wrong secret hash. Got', query.secret_hash, 'should be', SECRET_HASH, query.secret_hash == SECRET_HASH);
    }
  } catch (error) {
    // If there was an error sending our message then we
    // can log it into the Vercel console
    console.error('Error sending message');
    console.log(error.toString());
  }

  // Acknowledge the message with Telegram
  // by sending a 200 HTTP status code
  // The message here doesn't matter.
  res.status(200).send('OK');
};
