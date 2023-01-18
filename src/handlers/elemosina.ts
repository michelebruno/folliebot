import {Context, Markup, Telegraf} from 'telegraf'
import {addTicket, getLastTicket, getNextToken, getTicketsCount} from '../utils/tickets'
import {canUserSpend, doWeStillHaveTickets} from '../utils/limits'
import path from 'path'
import Jimp from 'jimp'
import {broadcast} from "../utils/users";

export const BOT_TOKEN = process.env.BOT_TOKEN || ''

const laureati = [
  'Ripo',
  'Leti',
  'Bort',
  'Cram',
  'Ele Buttolo'
]

const bot = new Telegraf(BOT_TOKEN)

export default async function handleElemosina(ctx: Context) {
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

export async function handleElemosinaCallback(ctx: Context) {
  const {update: {callback_query}} = ctx
  const {message, from} = callback_query

  await bot.telegram.deleteMessage(message.chat.id, message.message_id)

  if (await canUserSpend(ctx, from)) {
    await ctx.sendChatAction('upload_photo')

    const nextToken = await getNextToken((await getLastTicket())[0])

    const image = await Jimp.read(path.join(process.cwd(), 'files', 'ticket.jpg'))

    try {
      // console.log(fs.readdirSync(process.cwd()))
      // console.log(fs.readdirSync(path.join(process.cwd(), 'files')))
      //console.log(fs.readdirSync(path.join(process.cwd(), 'files', 'fonts')))
      path.resolve(process.cwd(), 'files', 'open-sans-32-black.png')
      path.resolve(Jimp.FONT_SANS_128_WHITE)
      path.resolve(Jimp.FONT_SANS_32_BLACK)

      const font128 = path.resolve(process.cwd(), 'files', 'PPFuji-Bold.fnt')
      const font32 = path.resolve(process.cwd(), 'files', 'PPFuji-Bold-30.fnt')


      if (process?.env?.VERCEL) {
        path.resolve(process.cwd(), 'files', 'PPFuji-Bold-30.png')
        path.resolve(process.cwd(), 'files', 'PPFuji-Bold.png')
      }

      const font = await Jimp.loadFont(font128)
      const fontSm = await Jimp.loadFont(font32)

      const maxW = 300
      const tW = Jimp.measureText(font, nextToken.toUpperCase())

      image.print(font, (image.getWidth() - tW) / 2, (image.getHeight() - 80) / 2,
        nextToken.toUpperCase())

      image.print(fontSm, 460, 682,
        {
          text: ' #' + (await getTicketsCount() + 35 + 1).toString(),
          //  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          // alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        })

      // image.write('./test.jpg')

      await ctx.replyWithPhoto({source: await image.getBufferAsync(Jimp.MIME_JPEG)}, {caption: `Ecco il tuo buono, mostralo in cassa e giudica responsabilmente.`})

      await addTicket(nextToken, from.id, from?.username || `${from?.first_name} ${from?.last_name}`)


      await broadcast(async (user) => {
        await bot.telegram.sendMessage(user.chatId, `${(from?.first_name && from?.last_name) ? from?.first_name + " " + from?.last_name : from?.username} ha scroccato un caffè.`)
      }, from?.id)
    } catch (e) {
      return await ctx.reply('error:' + e.toString())
    }
  }
}
