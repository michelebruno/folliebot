import {service} from "./google";
import {now} from "lodash";

export async function getTickets() {
    try {
        const result = await service.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: "Tickets!A2:D",
        });
        const numRows = result.data.values ? result.data.values.length : 0;
        return result?.data;
    } catch (err) {
        // TODO (developer) - Handle exception
        throw err;
    }
}

let _tokens: any = []

export async function getTokens() {
    if (_tokens && _tokens.length) return _tokens;
    try {
        const result = await service.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: "Tokens!A:A",
        });
        const numRows = result.data.values ? result.data.values.length : 0;
        _tokens = result?.data;
        return result?.data;
    } catch (err) {
        // TODO (developer) - Handle exception
        throw err;
    }
}

export async function getNextToken(last) {
    const tokens = await getTokens();

    const latestIndex = tokens.values.findIndex(i => i[0] === last)

    return tokens.values[latestIndex + 1][0]


}


export async function getLastTicket() {
    const tickets = await getTickets();

    return tickets?.values ? tickets.values[tickets?.values.length - 1] : []
}

export async function addTicket(ticket: string, uid: string, username: string) {

    try {
        const time = new Date()
        const values = [
            [ticket, uid, username, Date.now(), time.toString()]
        ];

        const result = await service.spreadsheets.values.append({
            resource: {values},
            valueInputOption: 'USER_ENTERED',
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: "A2:E"
            // valueInputOption,
        });
        return result;

    } catch (err) {
        throw err
    }
}