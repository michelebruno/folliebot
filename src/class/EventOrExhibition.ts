import {ddbDocClient} from "../utils/ddbClient";
import {PutCommand} from "@aws-sdk/lib-dynamodb";
import Context from "../types/Context";

type question = 'startDate' | 'url' | 'description' | 'tags' | 'endDate' | 'hour'

export abstract class EventOrExhibition {
  protected abstract readonly type: 'event' | 'exhibition';
  protected abstract readonly jsonable: string[]
  public title: string;
  public from: any;
  public startDate: number;
  public apiVersion: number;
  public description: {
    text: string
  };


  public ctx: Context

  public tags: string[];
  public url: string;

  private _id: string;

  protected constructor({
                          title,
                          startDate,
                          url,
                          description,
                          tags,
                          apiVersion = 1.0
                        }: EventOrExhibition, ctx: Context) {

    this.title = title;
    this.from = ctx?.from;
    this.url = url
    this.tags = tags
    this.description = description
    this.startDate = startDate;
    this.apiVersion = apiVersion;

    this.ctx = ctx
  }

  public isWaitingFor(question: question) {
    return this.ctx.session?.waiting_for === question;
  }

  public async ask(question: question, ctx = this.ctx) {

    if (!this.ctx) {
      this.ctx = ctx
    }

    if (!ctx) {
      throw new Error("Context is not defined")
    }

    ctx.session.waiting_for = question;

    switch (question) {
      case "startDate":
        await ctx.reply("Quando inizia?");
        break;

      case "endDate":
        await ctx.reply("Quando finisce la mostra?");
        break;

      case "description":
        await ctx.reply("Come lo descriveresti?")
        break;

      case "url":
        await ctx.reply("Manda un link che parta di " + (this.type === 'event' ? 'questo evento:' : 'questa mostra:'))
        break;

      case "tags":
        await ctx.reply("Usa almeno tre parole, separate da virgola, per descriverlo.")
        break;

      case "hour":
        await ctx.reply("A che ora?");
        break;

    }
  }

  public abstract get displayDate(): string

  public get message() {
    let message = ''

    if (this.title) {
      message += `*${this.title}*\n\n`
    }
    if (this.description) {
      message += this.description.text + "\n\n"
    }

    if (this.startDate) {
      message += `${this.displayDate}\n\n`
    }

    if (this.tags) {
      message += this.tags.join(' ') + "\n\n"
    }

    if (this.from) {
      message += "Consigliato da @" + this.from.username + "\n"
    }


    if (this.url) {
      message += this.url
    }

    return {
      text: message
    }
  }

  public get ItemId() {
    if (this._id) {
      return this._id
    }

    this._id = this.type + ":" + Date.now() + this.startDate

    return this._id
  }


  public set ItemId(id) {
    this._id = id
  }

  public toObject() {
    const o = {}

    for (const key of this.jsonable) {
      // @ts-ignore
      o[key] = this[key]
    }

    return o
  };

  async save() {

    const params = {
      TableName: process.env.AWS_DYNAMODB_TABLE_CHANNEL_ITEMS,
      Item: this.toObject(),
    };

    await ddbDocClient.send(new PutCommand(params));

  }

  abstract handleSession(): Promise<void>;

}