import { Context, Markup, Telegraf } from 'telegraf'
import _ from 'lodash'
import { addTicket, getLastTicket, getNextToken } from '../utils/tickets'
import { canUserSpend, doWeStillHaveTickets } from '../utils/limits'
import path from 'path'
import Jimp from 'jimp'
export const BOT_TOKEN = process.env.BOT_TOKEN || ''

const laureati = [
  'Ripo',
  'Leti',
  'Bort',
  'Cram',
  'Ele Buttolo'
]

const bot = new Telegraf(BOT_TOKEN)

export default async function handleElemosina (ctx: Context) {
  await ctx.sendChatAction('typing')

  if (await doWeStillHaveTickets(ctx)) {
    await ctx.reply(
      'Sicuro di volerlo scroccare?',
      Markup.inlineKeyboard([
        Markup.button.callback('Sì', 'elemosina_sure'),
        Markup.button.callback('No dai', 'elemosina_delete')
      ])
    )
  }
}

export async function handleElemosinaCallback (ctx: Context) {
  const { update: { callback_query } } = ctx
  const { message, from } = callback_query

  await bot.telegram.deleteMessage(message.chat.id, message.message_id)

  if (await canUserSpend(ctx, from)) {
    await ctx.sendChatAction('upload_photo')

    const nextToken = await getNextToken((await getLastTicket())[0])

    const image = await Jimp.read(path.join(process.cwd(), 'ticket.jpg'))

    const font = await Jimp.loadFont(path.resolve(process.cwd(), 'src', 'fonts', 'open-sans-32-black.fnt'))

    const tW = Jimp.measureText(font, nextToken.toUpperCase())

    image.print(font, 320 - tW / 2, image.getHeight() * 3 / 4,
      {
        text: nextToken.toUpperCase()
        //  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        // alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      })

    // image.write('./test.jpg')

    await ctx.replyWithPhoto({ source: await image.getBufferAsync(Jimp.MIME_JPEG) }, { caption: `Ciao, ${from?.username}, ${_.sample(laureati)} ti ha offerto un caffè! Il tuo codice è ${nextToken}` })

    return await addTicket(nextToken, from.id, from?.username || `${from?.first_name} ${from?.last_name}`)
  }
}
