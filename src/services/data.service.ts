import { pino, Logger } from 'pino';
import PinoPretty from 'pino-pretty';
import * as papaparse from 'papaparse';
import * as XLSX from 'xlsx';
import * as fs from 'fs-extra';

const logger: Logger = pino(PinoPretty({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));

export const convertCSVToJSON = async (name: any): Promise<any[]> => {
    try {
        let jsonData: any[] = []
        if (name.includes('.csv')) {
            const filePath: string = `./uploads/${name}`;
            const csvData: any = await fs.readFile(filePath, 'utf-8');
            jsonData = papaparse.parse(csvData, { header: true }).data;
        } else if (name.includes('.xlsx')) {
            const filePath: string = `./uploads/${name}`;
            const workbook: any = XLSX.readFile(filePath);
            const sheetName: any = workbook.SheetNames[0];
            const worksheet: any = workbook.Sheets[sheetName];

            // Convert the worksheet to a JSON object with key-value pairs of headers and values
            const options: any = { header: 1, defval: null, raw: false };
            const rows: any[] = XLSX.utils.sheet_to_json(worksheet, options);

            // Get the header row
            const headerRow: any[] = rows.shift();

            // Map each row to an object with key-value pairs of headers and values
            const data: any[] = rows.map((row) => {
                const rowData: any = {};
                headerRow.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });
            jsonData = data;
        }
        let data: any[] = Object.keys(jsonData[0]);
        return data;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}