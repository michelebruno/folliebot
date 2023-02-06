import {VercelRequest, VercelResponse} from '@vercel/node'
import {Telegraf, Context} from 'telegraf'
import handleElemosina, {handleElemosinaCallback} from '../src/handlers/elemosina'
import {getTickets} from '../src/utils/tickets'
import {addUser, mapUsers, getDisplayName, broadcast, isAdmin} from "../src/utils/users";
import {getCurrentStatus} from "../src/utils/limits";


// @ts-ignore
import DynamoDBSession from 'telegraf-session-dynamodb';

import {handleEventSession, handleExihibitionSession} from "../src/utils/channels/events";
import {hasUserName} from "../src/utils/validators";

export const BOT_TOKEN = process.env.BOT_TOKEN
const SECRET_HASH = process.env.SECRET_HASH

// Note: change to false when running locally
const BASE_PATH = 'https://folliebot.vercel.app'

const bot = new Telegraf(BOT_TOKEN)

const dynamoDBSession = new DynamoDBSession({
  dynamoDBConfig: {
    params: {
      TableName: process.env.AWS_DYNAMODB_TABLE_SESSIONS
    },
    region: process.env.AWS_DYNAMODB_REGION || 'eu-south-1'
  }
})


bot.use(dynamoDBSession.middleware())


export async function handleTestCommand(ctx: Context) {
  const COMMAND = '/test'
  const {message} = ctx

  const reply = 'Hello there! Awaiting your service: ' + (process.env?.VERCEL_ENV || process.env.NODE_ENV)

  const didReply = await ctx.reply(reply, {
    reply_to_message_id: message?.message_id
  })

  if (didReply) {
    console.log(`Reply to ${COMMAND} command sent successfully.`)
  } else {
    console.error(
      `Something went wrong with the ${COMMAND} command. Reply not sent.`
    )
  }
}

bot.command('event', async (ctx: Context) => {
  if (await hasUserName(ctx)) {

    ctx.session.sharing_to = 'events';

    await ctx.reply("Mandami un link che descriva l'evento")
  }
})



bot.command('exhibition', async (ctx: Context) => {
  if (await hasUserName(ctx)) {

    ctx.session.sharing_to = 'exhibition';

    await ctx.reply("Mandami un link che descriva la mostra")
  }
})

bot.command('broadcast', async (ctx: Context) => {
  if (await hasUserName(ctx) && isAdmin(ctx)) {

    ctx.session.sharing_to = 'broadcast';

    await ctx.reply("Manda il messaggio da inoltrare a tutti.")
  }
})

bot.command('test', async (ctx) => {
  await handleTestCommand(ctx)
})

bot.start(async (ctx: Context) => {

  const {update: {message: {from, chat}}} = ctx

  await addUser(from, chat);

  await ctx.reply('Ciao, benvenuto!')
})

bot.command('elemosina', handleElemosina)
bot.command('scrocca', handleElemosina)

bot.command('listTickets', async (ctx: Context) => {
  const result = await getTickets()
  return await ctx.sendMessage(`Ecco i biglietti emessi: \n${result?.values?.map(([t, id, username]: string[]) => `${t} da ${username}`).join('\n')}`)
})

bot.command('productionWebhook', async (ctx: Context) => {
  await fetch('https://folliebot.vercel.app/api/telegram-hook?setWebhook=true')

  return await ctx.reply('Hit hook')
})

bot.command('cancel', async (ctx: Context) => {
  ctx.session = null;
  await ctx.reply("Ho annnulato la tua richiesta.")
})


bot.command('status', async (ctx: Context) => {

  const status = await getCurrentStatus();

  await ctx.reply("Globale state:\n" + Object.entries(status).map(([k, v]) => (`${k}: ${v}`)).join('\n'))

  const myStatus = await getCurrentStatus(ctx?.from);

  await ctx.reply("Your state:\n" + Object.entries(myStatus).map(([k, v]) => (`${k}: ${v}`)).join('\n'))

})

bot.command('id', async (ctx: Context) => {
  const {message} = ctx
  await ctx.reply(`Ciao, il tuo id è ${message?.from?.id}. Ti chiami ${message?.from?.first_name} ${message?.from?.last_name}, @${message?.from?.username}.`, {
    reply_to_message_id: message?.message_id
  })
  await ctx.reply(JSON.stringify(message), {
    reply_to_message_id: message?.message_id
  })
})


bot.on('message', async (ctx: Context) => {
  if (ctx.session.sharing_to === 'events') {
    return await handleEventSession(ctx);
  } else if (ctx.session.sharing_to === 'exhibition') {
    return await handleExihibitionSession(ctx);
  } else if (ctx.session.sharing_to === 'broadcast' && isAdmin(ctx)) {
    await mapUsers(async u => {
      await bot.telegram.sendMessage(u.chatId, ctx?.message?.text, {
        entities: ctx?.message?.entities,
        // parse_mode: 'Markdown'  // use the same parse_mode that you used in the original message
      })
    })
  }
})


bot.on('callback_query', async (ctx: Context) => {

  const {update: {callback_query}} = ctx
  const {message, from} = callback_query

  try {

    if (callback_query?.data === 'elemosina_sure') {
      return await handleElemosinaCallback(ctx)
    } else if (callback_query?.data === 'elemosina_delete') {

      await ctx.telegram.deleteMessage(message.chat.id, message.message_id)

      await ctx.reply('Grande, conservalo per un caffé giudizio!')
    }
  } catch (e: any) {
    console.error(e.toString())
    if (e.toString() === '400: Bad Request: message to delete not found') return;
    await ctx.reply("C'è stato un errore. Riprova")
    await bot.telegram.sendMessage(850859747, "⚠️ C'è stato un errore con " + getDisplayName(from))
    await bot.telegram.sendMessage(850859747, e.toString())
    await bot.telegram.sendMessage(850859747, "Context:\n" + JSON.stringify(ctx))
  }
})

// bot.on("message", async (ctx) => {
//     await handleOnMessage(ctx)
// })

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Retrieve the POST request body that gets sent from Telegram
    const {body, query} = req

    if (query.setWebhook === 'true') {
      const webhookUrl = `${BASE_PATH}/api/telegram-hook?secret_hash=${encodeURI(SECRET_HASH)}`

      // Would be nice to somehow do this in a build file or something
      const isSet = await bot.telegram.setWebhook(webhookUrl)

      console.log(`Set webhook to ${webhookUrl}: ${isSet}`)
    }

    if (query.secret_hash == SECRET_HASH) {
      await bot.handleUpdate(body)
    } else {
      console.warn("Wrong secret hash. Got", query.secret_hash, "should be", SECRET_HASH, query.secret_hash == SECRET_HASH)
    }
  } catch (error) {
    // If there was an error sending our message then we
    // can log it into the Vercel console
    console.error('Error sending message')
    console.log(error.toString())
  }

  // Acknowledge the message with Telegram
  // by sending a 200 HTTP status code
  // The message here doesn't matter.
  res.status(200).send('OK')
}
