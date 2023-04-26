import { FastifyRequest, FastifyReply } from 'fastify';
import { pino, Logger } from 'pino';
import PinoPretty from 'pino-pretty';
import workflowModel from '../models/workflow.model';
import { ImportProductsToGraph, downloadProducts } from '../services/products.service';

const logger: Logger = pino(PinoPretty({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));

export const RunProducts = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        let body: any = req.body;
        let finalText: string = '';
        let fileName: string = body.filename;
        let params: any = req.params;
        let id: string = params.id;
        let model: any = await workflowModel.findOne({ _id: id }).lean();
        let workflow: string = model.workFlowName.replaceAll(" ","");
        let result: any = await ImportProductsToGraph(fileName, workflow);
        if (result == 'Products added') {
            finalText = 'Success';
            await workflowModel.updateOne({ _id: id }, { $set: { jobsCount: model.jobsCount + 1, successfulRuns: model.successfulRuns + 1 } })
        } else {
            finalText = 'Failed';
            let fail: any[] = model.failedJobs;
            if (typeof result == 'string') {
                await workflowModel.updateOne({ _id: id }, { $set: { jobsCount: model.jobsCount + 1, failedJobs: [...fail, result] } });
            } else {
                await workflowModel.updateOne({ _id: id }, { $set: { jobsCount: model.jobsCount + 1, failedJobs: [...fail, result.message] } });
            }
        }
        let final: any = await workflowModel.find({});
        let sendData: any = {
            data: final,
            status: finalText
        } 
        reply.status(200).send(sendData);
    } catch (err: any) {
        logger.error(err.message);
        reply.status(400).send(err);
    }
}

export const ExportProducts = async (req:FastifyRequest,reply:FastifyReply) => {
    try {
        let body: any = req.body;
        let model: any = await workflowModel.findOne({ _id: body.id }).lean();
        let result: any = await downloadProducts(req.body);
        if (result.type == 'csv' || result.type == 'xlsx') {
            await workflowModel.updateOne({ _id: body.id }, { $set: { jobsCount: model.jobsCount + 1, successfulRuns: model.successfulRuns + 1 } })
        } else {
            let fail: any[] = model.failedJobs;
            await workflowModel.updateOne({ _id: body.id }, { $set: { jobsCount: model.jobsCount + 1, failedJobs: [...fail, result.message] } });
        }
        reply.status(200).send(result);
    } catch (err: any) {
        logger.error(err.message);
        reply.status(400).send(err);
    }
}