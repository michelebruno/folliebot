import { google } from 'googleapis';
import * as path from 'path';

export const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), 'sociologia-service-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const service = google.sheets({ version: 'v4', auth });
