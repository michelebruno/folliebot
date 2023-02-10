import {ExecuteStatementCommand, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {Context, Markup} from "telegraf";
import {validateAndTransformDate, validateAndTransformTime, validateAndTransformUrl} from "../validators";
import {ddbDocClient} from "../ddbClient";

interface EventOrExhibition {
  type: 'event' | 'exhibition',
  sharingTo: 'event' | 'exhibition',
  title?: String,
  description?: {
    text: string
  },
  startDate: number,
  link?: string
  tags?: string[]
}

interface Event extends EventOrExhibition {
  time: string
}

interface Exhibition extends EventOrExhibition {
  endDate: string
}

function getPageTitle(html: string) {
  try {
    const $ = require('cheerio').load(html);
    let title = $('title').text();
    if (!title) {
      title = $('meta[property="og:title"]').attr('content');
    }
    return title || false;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Set the parameters.
export const params = {
  TableName: process.env.AWS_DYNAMODB_TABLE_CHANNEL_ITEMS,
  Key: {
    primaryKey: "ItemId",
    // sortKey: "VALUE_2",
  },
};

export const getItem = async () => {
  try {
    const data = await ddbDocClient.send(new GetCommand(params));
    console.log("Success :", data.Item);
  } catch (err) {
    console.log("Error", err);
  }
};


export async function putExihibition(e: Exhibition) {
  const {sharing_to, ...event} = e

  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_CHANNEL_ITEMS,
    Item: {...event, ItemId: "" + Date.now() + e.startDate},
  };
  try {
    await ddbDocClient.send(new PutCommand(params));
  } catch (err) {
    console.error(err);
  }
}

export async function handleExihibitionSession(ctx: Context) {

  const {session} = ctx;

  const {message} = ctx;


  if (!session.link) {
    try {
      const link = new URL(validateAndTransformUrl(message?.text));

      session.link = link.toString()

      console.log("link valido", session.link)
      await ctx.reply("Quando inizia?");


    } catch (e) {
      if (e.code === 'ERR_INVALID_URL') {
        await ctx.reply("Questo url non è valido. Riprova o digita /cancel")
      }
    }


  } else if (!session.startDate) {

    const date = validateAndTransformDate(message.text)
    if (date) {
      session.startDate = date
    } else {
      await ctx.reply("Questa data non è valida, riprova in un formato com DD/MM/YYYY")
    }

  } else if (!session.endDate) {

    const date = validateAndTransformDate(message.text)

    if (date) {
      session.endDate = date
    } else {
      await ctx.reply("Questa data non è valida, riprova in un formato com DD/MM/YYYY")
    }

  } else if (typeof session.description === 'undefined') {

    console.log(message)

    ctx.session.description = {text: message}


  } else if (!session.tags) {

    const event = new Event(session)
    ctx.telegram.sendMessage(-1001640910905, event.message.text)

    await ctx.reply("Ok, mando subito l'evento sul canale che hai scelto.")


    // TODO salvarlo nel dynamodb.


    ctx.session = null;

  }

}