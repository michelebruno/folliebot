import {ExecuteStatementCommand, GetCommand} from "@aws-sdk/lib-dynamodb";
import {Context} from "telegraf";
import {validateAndTransformDate, validateAndTransformTime, validateAndTransformUrl} from "../validators";
import {ddbDocClient} from "../ddbClient";

interface EventOrExhibition {
  type: 'event' | 'exhibition',
  sharingTo: 'event' | 'exhibition',
  title: String,
  description: String | null,
  startDate: string,
  link: string
  tags: string[]
}

interface Event extends EventOrExhibition {
  time: string
}

interface Exhibition extends EventOrExhibition {
  endDate: string
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
  const params = {
    Statement: "INSERT INTO " + process.env.AWS_DYNAMODB_TABLE_CHANNEL_ITEMS + "  value  {'type': 'exhibition', 'title':?, 'startDate':?, 'endDate':?, 'tags':?}",
    Parameters: [
      {S: e.title},
      {S: e.startDate},
      {S: e.endDate},
      {A: e.tags}
    ]
  };
  try {
    await ddbDocClient.send(new ExecuteStatementCommand(params));
    console.log("Success. Item added.");
    return "Run successfully"; // For unit tests.
  } catch (err) {
    console.error(err);
  }
}

export async function handleEventSession(ctx: Context) {
  const {session} = ctx;

  const {message} = ctx;


  if (!session.url) {
    try {
      const url = new URL(validateAndTransformUrl(message?.text));

      session.url = url.toString()

      await ctx.reply("Che giorno sarà?");


    } catch (e) {
      if (e.code === 'ERR_INVALID_URL') {
        await ctx.reply("Questo url non è valido. Riprova o digita /cancel")
      }
    }

  } else if (!session.time) {

    const time = validateAndTransformTime(message.text)
    if (time) {
      session.time = time
      await ctx.reply("A che ora?");
    } else {
      await ctx.reply("Questa data non è valida, riprova in un formato com DD/MM/YYYY")
    }

  } else if (!session.description) {

    console.log(message)

    ctx.session.description = message

    await ctx.reply("Usa almeno tre parole, separate da virgola, per descriverlo.")

  } else if (!session.tags) {

    const tags = message.text.split(',')

    if (tags.length < 3) {
      await ctx.reply(`Hai usato ${tags.length}, ma devi specificare almeno 3 tags. Riprova o digita /cancel per annullare.`)

    }
    session.tags = tags.map(t => '#' + t.trim().toLowerCase())

    ctx.telegram.sendMessage(-1001640910905, `NOME
${session.url}\n
${session.description.text}\n
      
${session.tags.join(' ')}
      
      
      Inserito da @${ctx?.from?.username}.
      `)
    await ctx.reply("Ok, mando subito l'evento sul canale che hai scelto.")


    // TODO salvarlo nel dynamodb.


    ctx.session = null;
  }
}

export async function handleExihibitionSession(ctx: Context) {

  const {session} = ctx;

  const {message} = ctx;


  if (!session.url) {
    try {
      const url = new URL(validateAndTransformUrl(message?.text));

      session.url = url.toString()

      console.log("URL valido", session.url)
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
      await ctx.reply("Quando finisce la mostra?");
    } else {
      await ctx.reply("Questa data non è valida, riprova in un formato com DD/MM/YYYY")
    }

  } else if (!session.endDate) {

    const date = validateAndTransformDate(message.text)

    if (date) {
      session.endDate = date
      await ctx.reply("Come lo descriveresti?")
    } else {
      await ctx.reply("Questa data non è valida, riprova in un formato com DD/MM/YYYY")
    }

  } else if (!session.description) {

    console.log(message)

    ctx.session.description = message

    await ctx.reply("Usa almeno tre parole, separate da virgola, per descriverlo.")

  } else if (!session.tags) {

    const tags = message.text.split(',')

    if (tags.length < 3) {
      await ctx.reply(`Hai usato ${tags.length}, ma devi specificare almeno 3 tags. Riprova o digita /cancel per annullare.`)

    }
    session.tags = tags.map(t => '#' + t.trim().toLowerCase())

    ctx.telegram.sendMessage(-1001640910905, `NOME
${session.url}\n
${session.description.text}\n
      
${session.tags.join(' ')}
      
      
      Inserito da @${ctx?.from?.username}.
      `)
    await ctx.reply("Ok, mando subito l'evento sul canale che hai scelto.")


    // TODO salvarlo nel dynamodb.


    ctx.session = null;

  }

}