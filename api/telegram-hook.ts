import {VercelRequest, VercelResponse} from '@vercel/node'
import {Telegraf, Context} from 'telegraf'
import handleElemosina, {handleElemosinaCallback} from '../src/handlers/elemosina'
import {getTickets} from '../src/utils/tickets'
import {addUser} from "../src/utils/users";
import {getCurrentStatus} from "../src/utils/limits";


export const BOT_TOKEN = process.env.BOT_TOKEN || ''
const SECRET_HASH = process.env.SECRET_HASH || '32e58fbahey833349df3383dc910e180'

// Note: change to false when running locally
const BASE_PATH =
  process.env.VERCEL_ENV === 'production'
    ? 'https://folliebot.vercel.app'
    : 'https://7092-109-115-153-198.eu.ngrok.io'

const bot = new Telegraf(BOT_TOKEN)

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

bot.command('test', async (ctx) => {
  await handleTestCommand(ctx)
})

bot.start(async (ctx: Context) => {
  console.log(ctx)
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
bot.command('devWebhook', async (ctx: Context) => {
  await fetch('https://50ca-109-115-153-198.eu.ngrok.io/api/telegram-hook?setWebhook=true')

  return await ctx.reply('Hit hook')
})

bot.command('status', async (ctx:Context) => {

  const status = await getCurrentStatus();

  await ctx.reply("Globale state:\n" + Object.entries(status).map(([k,v]) => (`${k}: ${v}`)).join('\n'))

  const myStatus = await getCurrentStatus(ctx?.from);

  await ctx.reply("Your state:\n" + Object.entries(myStatus).map(([k,v]) => (`${k}: ${v}`)).join('\n'))

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
    await ctx.reply("C'è stato un errore. Riprova")
    await bot.telegram.sendMessage(850859747, "⚠️ C'è stato un errore con " + from?.username)
    await bot.telegram.sendMessage(850859747, e.toString())
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
      const webhookUrl = `${BASE_PATH}/api/telegram-hook?secret_hash=${SECRET_HASH}`

      // Would be nice to somehow do this in a build file or something
      const isSet = await bot.telegram.setWebhook(webhookUrl)

      console.log(`Set webhook to ${webhookUrl}: ${isSet}`)
    }

    if (query.secret_hash === SECRET_HASH) {
      await bot.handleUpdate(body)
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
