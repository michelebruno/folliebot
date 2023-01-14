import {Context, Markup} from "telegraf";
import _ from 'lodash'
import {addTicket, getLastTicket, getNextToken} from "../utils/tickets";

const laureati = [
    "Ripo",
    "Leti",
    "Bort",
    "Cram",
    "Ele Buttolo"
]

export default async function handleElemosina(ctx: Context) {
    const {message} = ctx

    const {from} = message

    await ctx.sendChatAction("typing")

    const conferma = await ctx.reply(
        'Sicuro di volerlo scroccare?',
        Markup.inlineKeyboard([
            Markup.button.callback('Sì', 'elemosina_sure'),
            Markup.button.callback('No dai', 'elemosina_delete'),
        ])
    )

    if (conferma) {


    } else {

        await ctx.reply("Grande, conservalo per un caffé giudizio!", {
            reply_to_message_id: message?.message_id,
        })
    }
}
