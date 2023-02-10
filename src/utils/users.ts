import { service } from './google';
import { bot } from '../bot';

export function getDisplayName(from) {
  const name = from?.first_name && from?.last_name
    ? `${from?.first_name} ${from?.last_name}`
    : from?.username
      ? from?.username
      : from?.first_name;

  if (!name) {
    bot.telegram.sendMessage(850859747, 'Questo utente è undefined');
    bot.telegram.sendMessage(850859747, JSON.stringify(from));
  }
  return name;
}

export function isAdmin(from: object | string | number) {
  const id = typeof from === 'object'
    ? from.from?.id || from?.id
    : from;

  return [850859747, 'michelebruno'].includes(id);
}

export async function addUser(from, chat) {
  const users = await getUsers();

  if (users.findIndex((u) => u.userId == from?.id) !== -1) return true;

  const values = [
    [chat?.id, from?.id, from?.username, from?.last_name, from?.first_name],
  ];

  await service.spreadsheets.values.append({
    resource: { values },
    valueInputOption: 'USER_ENTERED',
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: 'users!A2:H',
    // valueInputOption,
  });

  await getUsers(true);
}

let _users = [];

export async function getUsers(force = false) {
  if (!force && _users.length) return _users;

  const result = await service.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: 'users!A2:G',
  });

  _users = result?.data?.values?.map((i) => ({
    chatId: Number(i[0]),
    userId: Number(i[1]),
    username: i[2],
    last_name: i[3],
    first_name: i[4],
    is_admin: ['x', 'true', '1', 1].includes(i[5]),
  }));

  return _users;
}

export async function getUser(id: number) {

}

export async function mapUsers(cb: Function, except: number = 0) {
  const users = await getUsers();

  for (const user of users.filter((u) => u.userId != except)) {
    await cb(user);
  }
}

export async function broadcast(fn: Function | string) {
  return mapUsers(async (u) => {
    const message = typeof fn === 'function' ? await fn(u) : fn;

    if (message) {
      await bot.telegram.sendMessage(u.chatId, message);
    }
  });
}
