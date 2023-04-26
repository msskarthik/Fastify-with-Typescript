"use strict";
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
exports.readFileHeaders = exports.getDefaultData = void 0;
const pino_1 = require("pino");
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const data_service_1 = require("../services/data.service");
const products_model_1 = __importDefault(require("../models/products.model"));
const logger = (0, pino_1.pino)((0, pino_pretty_1.default)({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));
const getDefaultData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield products_model_1.default.findOne({}).lean();
        return res.status(200).send(result);
    }
    catch (err) {
        logger.error(err);
        res.status(400).send(err);
    }
});
exports.getDefaultData = getDefaultData;
const readFileHeaders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let body = req.body;
        let data = body.filename;
        let result = yield (0, data_service_1.convertCSVToJSON)(data);
        res.status(200).send(result);
    }
    catch (err) {
        logger.error(err);
        res.status(400).send(err);
    }
});
exports.readFileHeaders = readFileHeaders;
