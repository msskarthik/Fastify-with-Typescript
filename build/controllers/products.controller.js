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
exports.ExportProducts = exports.RunProducts = void 0;
const pino_1 = require("pino");
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const workflow_model_1 = __importDefault(require("../models/workflow.model"));
const products_service_1 = require("../services/products.service");
const logger = (0, pino_1.pino)((0, pino_pretty_1.default)({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));
const RunProducts = (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let body = req.body;
        let finalText = '';
        let fileName = body.filename;
        let params = req.params;
        let id = params.id;
        let model = yield workflow_model_1.default.findOne({ _id: id }).lean();
        let workflow = model.workFlowName.replaceAll(" ", "");
        let result = yield (0, products_service_1.ImportProductsToGraph)(fileName, workflow);
        if (result == 'Products added') {
            finalText = 'Success';
            yield workflow_model_1.default.updateOne({ _id: id }, { $set: { jobsCount: model.jobsCount + 1, successfulRuns: model.successfulRuns + 1 } });
        }
        else {
            finalText = 'Failed';
            let fail = model.failedJobs;
            if (typeof result == 'string') {
                yield workflow_model_1.default.updateOne({ _id: id }, { $set: { jobsCount: model.jobsCount + 1, failedJobs: [...fail, result] } });
            }
            else {
                yield workflow_model_1.default.updateOne({ _id: id }, { $set: { jobsCount: model.jobsCount + 1, failedJobs: [...fail, result.message] } });
            }
        }
        let final = yield workflow_model_1.default.find({});
        let sendData = {
            data: final,
            status: finalText
        };
        reply.status(200).send(sendData);
    }
    catch (err) {
        logger.error(err.message);
        reply.status(400).send(err);
    }
});
exports.RunProducts = RunProducts;
const ExportProducts = (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let body = req.body;
        let model = yield workflow_model_1.default.findOne({ _id: body.id }).lean();
        let result = yield (0, products_service_1.downloadProducts)(req.body);
        if (result.type == 'csv' || result.type == 'xlsx') {
            yield workflow_model_1.default.updateOne({ _id: body.id }, { $set: { jobsCount: model.jobsCount + 1, successfulRuns: model.successfulRuns + 1 } });
        }
        else {
            let fail = model.failedJobs;
            yield workflow_model_1.default.updateOne({ _id: body.id }, { $set: { jobsCount: model.jobsCount + 1, failedJobs: [...fail, result.message] } });
        }
        reply.status(200).send(result);
    }
    catch (err) {
        logger.error(err.message);
        reply.status(400).send(err);
    }
});
exports.ExportProducts = ExportProducts;
