import { FastifyRequest, FastifyReply } from 'fastify';
import workFlowModel from '../models/workflow.model';
import { pino, Logger } from 'pino';
import PinoPretty from 'pino-pretty';
import { createGraphDBforWorkflow } from '../services/workflow.service';

const logger: Logger = pino(PinoPretty({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));

export const saveWorkFlow = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        let data: any = request.body;
        let createdDate: Date = new Date();
        let graphJSONData: Object = {};
        let jobsCount: Number = 0;
        let successfulRuns: Number = 0;
        let failedJobs: any = [];
        let workFlowName: String = data.name;
        let result = new workFlowModel({
            createdDate,
            workFlowName,
            graphJSONData,
            jobsCount,
            successfulRuns,
            failedJobs
        });
        await result.save();
        logger.info('Success');
        reply.status(200).send('WorkFlow created successfully');
    } catch (err) {
        logger.error(err);
        reply.send(err);
    }
}


export const updateWorkFlow = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        let body: any = request.body;
        let params: any = request.params;
        let id: string = params.id;
        let result: any = await createGraphDBforWorkflow(body, id);
        if (result == 'Saved Successfully') {
            await workFlowModel.updateOne({ _id: id }, { $set: { ...body } });
        }
        reply.status(200).send('Workflow updated successfully')
    } catch (err) {
        logger.error(err);
        reply.send(err);
    }
}


export const getWorkFlow = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        let params: any = request.params;
        let id: string = params.id;
        let result = await workFlowModel.findOne({ _id: id }).lean();
        reply.status(200).send(result);
    } catch (err) {
        logger.error(err);
        reply.send(err);
    }
}

export const getWorkFlows = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        let data = await workFlowModel.find();
        reply.status(200).send(data);
    } catch (err) {
        logger.error(err);
        reply.send(err);
    }
}

export const updateUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const body: any = request.body;
        const params: any = request.params;
        const name: string = body.name;
        const id: number = params.id;
        await workFlowModel.updateOne({ 'id': id }, { $set: { 'name': name } });
        reply.status(200).send('User Updated Successfully')
    } catch (err) {
        logger.error(err);
        reply.send(err);
    }
}
