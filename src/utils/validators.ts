import {Context} from "telegraf";
import moment from "moment";

export function validateAndTransformUrl(url: string | null) {
  if (!url) return false;

  let regex = /^(http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*(:[0-9]{1,5})?(\/.*)?$/;
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

export function validateAndTransformTime(timeString: string) {
  const time = moment(timeString, [
    "HH:mm",
    "HHmm",
    "H:mm",
    "Hmm",
  ]);

  return time.isValid() ? time.format("HH:mm") : false;
}

export function validateAndTransformDate(dateString: string) {

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
  ]);

  return date.isValid() ? date.format("DD/MM/YYYY") : false;
}

export async function hasUserName(ctx: Context) {

  if (!ctx?.from?.username) {
    await ctx.reply("Per usare questo comando devi prima impostare un username nelle impostazione del tuo profilo.")

    return false;

  } else return true;
}