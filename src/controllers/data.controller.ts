import { FastifyRequest, FastifyReply } from 'fastify';
import { pino, Logger } from 'pino';
import PinoPretty from 'pino-pretty';
import { convertCSVToJSON } from '../services/data.service';
import productsModel from '../models/products.model';

const logger: Logger = pino(PinoPretty({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));

export const getDefaultData = async (req: FastifyRequest, res: FastifyReply) => {
    try {
        const result: Object = await productsModel.findOne({}).lean();
        return res.status(200).send(result);
    } catch (err) {
        logger.error(err);
        res.status(400).send(err);
    }
}

export const readFileHeaders = async (req: FastifyRequest, res: FastifyReply) => {
    try {
        let body: any = req.body;
        let data: any = body.filename;
        let result: any[] = await convertCSVToJSON(data);
        res.status(200).send(result);
    } catch (err) {
        logger.error(err);
        res.status(400).send(err);
    }
}