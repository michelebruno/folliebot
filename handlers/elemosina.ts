import {Context} from "telegraf";
import _ from 'lodash'

const laureati = [
    "Ripo",
    "Leti",
    "Bort"
]


export default async function handleElemosina(ctx: Context) {
    const {message} = ctx

    console.log("È arrivata una richiesta di pagamento")

    await ctx.sendChatAction("typing")

    await ctx.reply(`Ciao, ${message?.from?.username}, ${_.sample(laureati)} ti ha offerto un caffè!`, {
        reply_to_message_id: message?.message_id,
    })
}
