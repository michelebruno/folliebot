import { Context as TelegrafContext } from 'telegraf/typings/context';

interface Session {
  startDate: number;
  description: {
    text:string,
    entities?: object
  },
  hour: number;
  link:string;
  sharing_to: 'events' | 'exhibitions' | 'projects'
}

export default interface Context extends TelegrafContext {
  session: Session
}
