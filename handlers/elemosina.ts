import {Context} from "telegraf";
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

    const nextToken = await getNextToken((await getLastTicket())[0])

    await addTicket(nextToken, from.id, from?.username || `${from?.first_name} ${from?.last_name}`)

    await ctx.reply(`Ciao, ${message?.from?.username}, ${_.sample(laureati)} ti ha offerto un caffè! Il tuo codice è ${nextToken}`, {
        reply_to_message_id: message?.message_id,
    })
}
