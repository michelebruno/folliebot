import {Context} from "telegraf";
import moment from "moment";

export function validateAndTransformUrl(url: string | null) {
  if (!url) return false;

  let regex = /^(http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;
  if (!regex.test(url)) {
    return false;
  }
  if (!url.startsWith("http")) {
    url = "https://" + url
  }
  if (!url.startsWith("https://")) {
    url = url.replace("http://", "https://");
  }
  return url;
}

export function validateAndTransformTime(timeString: string, startDate: number = 0) {
  let time = moment(timeString, [
    "HH:mm",
    "HHmm",
    "H:mm",
    "Hmm",
  ]);

  if (time.isValid() && startDate) {
    const date = moment(startDate);
    date.set({
      hour: time.get('hour'),
      minute: time.get('minute'),
      second: time.get('second')
    });

    time = date
  }

  return time.isValid() ? time.valueOf() : false;
}

export function validateAndTransformDate(dateString: string) {

  moment.locale('it')
  const date = moment(dateString, [
    "DD-MM-YYYY",
    "DD/MM/YYYY",
    "MM-DD-YYYY",
    "MM/DD/YYYY",
    "YYYY-MM-DD",
    "YYYY/MM/DD",
    "DD-MM-YY",
    "DD/MM/YY",
    "MM-DD-YY",
    "MM/DD/YY",
    "YY-MM-DD",
    "YY/MM/DD",
    "DD MMM YYYY",
    "DD MMMM YYYY",
    "DD MMM YYYY HH:mm",
    "DD MMMM YYYY HH:mm",
  ]);

  return date.isValid() ? date.valueOf() : false;
}

export async function hasUserName(ctx: Context) {

  if (!ctx?.from?.username) {
    await ctx.reply("Per usare questo comando devi prima impostare un username nelle impostazione del tuo profilo.")

    return false;

  } else return true;
}