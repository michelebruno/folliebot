import {Telegraf} from "telegraf";
import {VercelRequest, VercelResponse} from '@vercel/node'

export default async (req: VercelRequest, res: VercelResponse) => {
  if (process?.env?.VERCEL_ENV === "production") {
    return res.status(400).send("Can't use this hook on production")
  }

  try {
    // Retrieve the POST request body that gets sent from Telegram
    const {body, query} = req

    const response = await fetch('http://127.0.0.1:4040/api/tunnels', {
      headers: {
        'Accept': 'application/json',
      }
    })


    const {tunnels} = await response.json()


    if (!tunnels?.length || !tunnels[0].public_url) {
      return res.status(400).send('Tunnel not found')
    }

    const BASE_PATH = tunnels[0].public_url

    const webhookUrl = `${BASE_PATH}/api/telegram-hook?secret_hash=${process.env.SECRET_HASH}`

    const bot = new Telegraf(process.env.BOT_TOKEN)

    // Would be nice to somehow do this in a build file or something
    const isSet = await bot.telegram.setWebhook(webhookUrl)

    console.log(`Set webhook to ${webhookUrl}: ${isSet}`)

    return res.status(200).send('Webhook set to ' + BASE_PATH)

  } catch (error) {
    // If there was an error sending our message then we
    // can log it into the Vercel console
    console.error('Error sending message')
    console.log(error.toString())
    return res.status(400).send('ERROR: ' + error.toString())

  }
}
