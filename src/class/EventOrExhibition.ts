import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { ddbClient, ddbDocClient } from '../utils/ddbClient';
import Context from '../types/Context';

type Question = 'startDate' | 'link' | 'description' | 'tags' | 'endDate' | 'hour';

export abstract class EventOrExhibition {
  protected abstract readonly type: 'event' | 'exhibition';

  static jsonable: string[];

  public title: string;

  public utente: any;

  public startDate: number;

  public apiVersion: number;

  public description: {
    text: string
  };

  public ctx: Context;

  public tags: string[];

  public link: string;

  private _id: string;

  static async getAll() {
    const params: ScanCommandInput = {
      // KeyConditionExpression: 'Episode > :e',
      ProjectionExpression: this.jsonable.join(', '),

      TableName: process.env.AWS_DYNAMODB_TABLE_CHANNEL_ITEMS,
    };
    const data = await ddbClient.send(new ScanCommand(params));

    const Constructor = this;
    return data.Items?.map((i) => (new Constructor(unmarshall(i))));
  }

  protected constructor({
    title,
    startDate,
    link,
    description,
    tags,
    apiVersion = 1.0,
  }: EventOrExhibition, ctx: Context) {
    this.title = title;
    this.utente = ctx?.from;
    this.link = link;
    this.tags = tags;
    this.description = description;
    this.startDate = startDate;
    this.apiVersion = apiVersion;

    this.ctx = ctx;
  }

  public isWaitingFor(question: Question) {
    return this.ctx.session?.waiting_for === question;
  }

  public async ask(question: Question, ctx = this.ctx) {
    if (!this.ctx) {
      this.ctx = ctx;
    }

    if (!ctx) {
      throw new Error('Context is not defined');
    }

    ctx.session.waiting_for = question;

    switch (question) {
      case 'startDate':
        await ctx.reply('Quando inizia?');
        break;

      case 'endDate':
        await ctx.reply('Quando finisce la mostra?');
        break;

      case 'description':
        await ctx.reply('Come lo descriveresti?');
        break;

      case 'link':
        await ctx.reply(`Manda un link che parta di ${this.type === 'event' ? 'questo evento:' : 'questa mostra:'}`);
        break;

      case 'tags':
        await ctx.reply('Usa almeno tre parole, separate da virgola, per descriverlo.');
        break;

      case 'hour':
        await ctx.reply('A che ora?');
        break;
    }
  }

  public abstract get displayDate(): string;

  public get message() {
    let message = '';

    if (this.title) {
      message += `*${this.title}*\n\n`;
    }
    if (this.description) {
      message += `${this.description.text}\n\n`;
    }

    if (this.startDate) {
      message += `${this.displayDate}\n\n`;
    }

    if (this.tags) {
      message += `${this.tags.join(' ')}\n\n`;
    }

    if (this.utente) {
      message += `Consigliato da @${this.utente.username}\n`;
    }

    if (this.link) {
      message += this.link;
    }

    return {
      text: message,
    };
  }

  public get ItemId() {
    if (this._id) {
      return this._id;
    }

    this._id = `${this.type}:${Date.now()}${this.startDate}`;

    return this._id;
  }

  public set ItemId(id) {
    this._id = id;
  }

  public toObject() {
    const o = {};

    for (const key of this.constructor.jsonable) {
      // @ts-ignore
      o[key] = this[key];
    }

    return o;
  }

  async save() {
    const params = {
      TableName: process.env.AWS_DYNAMODB_TABLE_CHANNEL_ITEMS,
      Item: this.toObject(),
    };

    await ddbDocClient.send(new PutCommand(params));
  }

  abstract handleSession(): Promise<void>;
}
