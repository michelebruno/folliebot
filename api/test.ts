import {Telegraf} from "telegraf";
import {VercelRequest, VercelResponse} from '@vercel/node'
import {bot} from "../src/bot";

export default async (req: VercelRequest, res: VercelResponse) => {
  if (process?.env?.VERCEL_ENV === "production") {
    return res.status(400).send("Can't use this hook on production")
  }


  await bot.telegram.sendMessage(850859747, "Ciao 👋\n\nCi sono novità! Da questa settimana ci saranno molti più caffè al giorno, ma ciascuno ne può prenderne solo uno alla settimana.\n\nGiudicate responsabilmente! ☕️☕️")

  res.status(200).send('Ok')
}
