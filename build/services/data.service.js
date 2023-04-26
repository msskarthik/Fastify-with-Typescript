"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertCSVToJSON = void 0;
const pino_1 = require("pino");
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const papaparse = __importStar(require("papaparse"));
const XLSX = __importStar(require("xlsx"));
const fs = __importStar(require("fs-extra"));
const logger = (0, pino_1.pino)((0, pino_pretty_1.default)({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));
const convertCSVToJSON = (name) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let jsonData = [];
        if (name.includes('.csv')) {
            const filePath = `./uploads/${name}`;
            const csvData = yield fs.readFile(filePath, 'utf-8');
            jsonData = papaparse.parse(csvData, { header: true }).data;
        }
        else if (name.includes('.xlsx')) {
            const filePath = `./uploads/${name}`;
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            // Convert the worksheet to a JSON object with key-value pairs of headers and values
            const options = { header: 1, defval: null, raw: false };
            const rows = XLSX.utils.sheet_to_json(worksheet, options);
            // Get the header row
            const headerRow = rows.shift();
            // Map each row to an object with key-value pairs of headers and values
            const data = rows.map((row) => {
                const rowData = {};
                headerRow.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });
            jsonData = data;
        }
        let data = Object.keys(jsonData[0]);
        return data;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
exports.convertCSVToJSON = convertCSVToJSON;
