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
exports.updateUser = exports.getWorkFlows = exports.getWorkFlow = exports.updateWorkFlow = exports.saveWorkFlow = void 0;
const workflow_model_1 = __importDefault(require("../models/workflow.model"));
const pino_1 = require("pino");
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const workflow_service_1 = require("../services/workflow.service");
const logger = (0, pino_1.pino)((0, pino_pretty_1.default)({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));
const saveWorkFlow = (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let data = request.body;
        let createdDate = new Date();
        let graphJSONData = {};
        let jobsCount = 0;
        let successfulRuns = 0;
        let failedJobs = [];
        let workFlowName = data.name;
        let result = new workflow_model_1.default({
            createdDate,
            workFlowName,
            graphJSONData,
            jobsCount,
            successfulRuns,
            failedJobs
        });
        yield result.save();
        logger.info('Success');
        reply.status(200).send('WorkFlow created successfully');
    }
    catch (err) {
        logger.error(err);
        reply.send(err);
    }
});
exports.saveWorkFlow = saveWorkFlow;
const updateWorkFlow = (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let body = request.body;
        let params = request.params;
        let id = params.id;
        let result = yield (0, workflow_service_1.createGraphDBforWorkflow)(body, id);
        if (result == 'Saved Successfully') {
            yield workflow_model_1.default.updateOne({ _id: id }, { $set: Object.assign({}, body) });
        }
        reply.status(200).send('Workflow updated successfully');
    }
    catch (err) {
        logger.error(err);
        reply.send(err);
    }
});
exports.updateWorkFlow = updateWorkFlow;
const getWorkFlow = (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let params = request.params;
        let id = params.id;
        let result = yield workflow_model_1.default.findOne({ _id: id }).lean();
        reply.status(200).send(result);
    }
    catch (err) {
        logger.error(err);
        reply.send(err);
    }
});
exports.getWorkFlow = getWorkFlow;
const getWorkFlows = (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let data = yield workflow_model_1.default.find();
        reply.status(200).send(data);
    }
    catch (err) {
        logger.error(err);
        reply.send(err);
    }
});
exports.getWorkFlows = getWorkFlows;
const updateUser = (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = request.body;
        const params = request.params;
        const name = body.name;
        const id = params.id;
        yield workflow_model_1.default.updateOne({ 'id': id }, { $set: { 'name': name } });
        reply.status(200).send('User Updated Successfully');
    }
    catch (err) {
        logger.error(err);
        reply.send(err);
    }
});
exports.updateUser = updateUser;
