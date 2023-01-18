import {Context} from 'telegraf'
import {getTickets} from './tickets'
import moment = require('moment')

const DAILY_LIMIT = 5
const WEEKLY_LIMIT = 200
const MONTHLY_LIMIT = 80
const DAILY_USER_LIMIT = 1
const WEEKLY_USER_LIMIT = 2
const MONTHLY_USER_LIMIT = 5

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type status = {
  month: Number,
  week: Number,
  day: Number
}

export async function getCurrentStatus(from: null | object = null): Promise<status> {


  const thisMonth = moment().startOf('month')

  const thisWeek = moment().startOf('week')

  const today = moment().startOf('day')

  const tickets = await getTickets()

  const myTickets = ((tickets?.values) != null) ?
    (from !== null ?
      tickets.values?.filter(t => Number(t[1]) === from?.id) : tickets.values)
    : []


  const status: status = {
    month: 0,
    week: 0,
    day: 0
  }

  status.day = myTickets.filter(t => today.isBefore(Number(t[3]))).length
  status.week = myTickets.filter(t => thisWeek.isBefore(Number(t[3]))).length
  status.month = myTickets.filter(t => thisMonth.isBefore(Number(t[3]))).length

  return status
}

export async function canUserSpend(ctx: Context, from: any) {

  const status = await getCurrentStatus(from)

  if (status.day >= DAILY_USER_LIMIT) {
    // if (from?.id === 850859747) return true
    await ctx.reply('Non fare il pezzente, ne hai già scroccato uno oggi!')

    return false
  } else if (status.week >= WEEKLY_USER_LIMIT) {
    await ctx.reply(`Ne hai già scroccati ${WEEKLY_USER_LIMIT} questa settimana!`)
    await sleep(2000)
    await ctx.reply('Che gaffe!')
    return false

    return false
  } else if (status.month >= MONTHLY_USER_LIMIT) {
    await ctx.reply('Non fare il pezzente, ne hai già scroccati troppi questo mese!')

    return false
  }

  return true
}

export async function doWeStillHaveTickets(ctx: Context) {
  // if (ctx?.from?.id === 850859747) return true
  const status = await getCurrentStatus()

  if (status.day >= DAILY_LIMIT) {
    // if (ctx?.from?.id === 850859747) return true

    await ctx.reply('Oggi ci sono stati già troppi caffè giudizio!')
    await ctx.sendChatAction('typing')
    await sleep(2000)

    await ctx.reply('Che clima...')
    return false
  } else if (status.week >= WEEKLY_LIMIT) {
    await ctx.reply('Mi spiace, sono finiti i sospesi di questa settimana!')
    return false
  } else if (status.month >= MONTHLY_LIMIT) {
    await ctx.reply('Mi spiace, sono finiti i sospesi di questo mese!')
    return false
  }

  return true
}
