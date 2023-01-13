import {VercelRequest, VercelResponse} from "@vercel/node"
import {addTicket, getLastTicket, getTickets, getNextToken} from "../utils/tickets";


// We only keep this in for testing purposes.
export default async (req: VercelRequest, res: VercelResponse) => {

    const lastTicket = await getLastTicket();

    await addTicket( await getNextToken((await getLastTicket())[0]) , 'dfa', 'ciaso')

    const result = await getTickets()

    return res.send(`Ecco i biglietti emessi: \n ${result?.values?.map(([t, id, username]: string[]) => `${t} da ${username}`).join('\n ')}`)
}