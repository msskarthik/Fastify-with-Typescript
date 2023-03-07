import { FastifyRequest, FastifyReply } from 'fastify';
import usersModel from '../models/users.model';
import { pino } from 'pino';
import PinoPretty from 'pino-pretty';

const logger = pino(PinoPretty({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));

export const saveUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        let data = request.body;
        let result = new usersModel(data);
        await result.save();
        logger.info('Success');
        reply.status(200).send('User created successfully');
    } catch (err) {
        logger.error(err);
        reply.send(err);
    }
}

export const getUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        let data = await usersModel.find();
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
        await usersModel.updateOne({ 'id': id }, { $set: { 'name': name } });
        reply.status(200).send('User Updated Successfully')
    } catch (err) {
        logger.error(err);
        reply.send(err);
    }
}
