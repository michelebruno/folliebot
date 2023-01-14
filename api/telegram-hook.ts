import {VercelRequest, VercelResponse} from "@vercel/node"
import {Telegraf, Context} from "telegraf"
import handleElemosina from "../handlers/elemosina";
import _, {update} from "lodash";
import {addTicket, getLastTicket, getNextToken, getTickets} from "../utils/tickets";

export const BOT_TOKEN = process.env.BOT_TOKEN || ''
const SECRET_HASH = process.env.SECRET_HASH || '32e58fbahey833349df3383dc910e180'

const laureati = [
    "Ripo",
    "Leti",
    "Bort",
    "Cram",
    "Ele Buttolo"
]

// Note: change to false when running locally
const BASE_PATH =
    process.env.VERCEL_ENV === "production"
        ? "https://folliebot.vercel.app"
        : "https://e13f-94-36-120-112.eu.ngrok.io"

const bot = new Telegraf(BOT_TOKEN)

export async function handleTestCommand(ctx: Context) {
    const COMMAND = "/test"
    const {message} = ctx

    let reply = "Hello there! Awaiting your service"

    const didReply = await ctx.reply(reply, {
        reply_to_message_id: message?.message_id,
    })

    if (didReply) {
        console.log(`Reply to ${COMMAND} command sent successfully.`)
    } else {
        console.error(
            `Something went wrong with the ${COMMAND} command. Reply not sent.`
        )
    }
}


bot.command("test", async (ctx) => {
    await handleTestCommand(ctx)
})

bot.command("elemosina", handleElemosina)
bot.command("listTickets", async (ctx: Context) => {

    const result = await getTickets()
    return await ctx.sendMessage(`Ecco i biglietti emessi: \n${result?.values?.map(([t, id, username]: string[]) => `${t} da ${username}`).join('\n')}`)

})
bot.command("id", async (ctx: Context) => {

    const {message} = ctx
    ctx.reply(`Ciao, il tuo id è ${message?.from?.id}. Ti chiami ${message?.from?.first_name} ${message?.from?.last_name}, @${message?.from?.username}.`, {
        reply_to_message_id: message?.message_id,
    })
    ctx.reply(JSON.stringify(message?.from), {
        reply_to_message_id: message?.message_id,
    })
})

bot.on('callback_query', async (ctx: Context) => {

    const {update: {callback_query}} = ctx
    const {message, from} = callback_query

    if (callback_query?.data === 'elemosina_sure') {

        const nextToken = await getNextToken((await getLastTicket())[0])

        await addTicket(nextToken, from.id, from?.username || `${from?.first_name} ${from?.last_name}`)

        await ctx.telegram.deleteMessage(message.chat.id, message.message_id)

        await ctx.reply(`Ciao, ${message?.from?.username}, ${_.sample(laureati)} ti ha offerto un caffè! Il tuo codice è ${nextToken}`)

    }

});

// bot.on("message", async (ctx) => {
//     await handleOnMessage(ctx)
// })

export default async (req: VercelRequest, res: VercelResponse) => {
    try {
        // Retrieve the POST request body that gets sent from Telegram
        const {body, query} = req


        if (query.setWebhook === "true") {
            const webhookUrl = `${BASE_PATH}/api/telegram-hook?secret_hash=${SECRET_HASH}`

            const setCommands = await bot.telegram.setMyCommands([
                {
                    description: "Fatti offrire un caffé sospeso",
                    command: 'elemosina'
                }
            ])

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
        console.error("Error sending message")
        console.log(error.toString())
    }

    // Acknowledge the message with Telegram
    // by sending a 200 HTTP status code
    // The message here doesn't matter.
    res.status(200).send("OK")
}