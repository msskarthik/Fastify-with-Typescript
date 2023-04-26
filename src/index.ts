import Fastify from 'fastify';
import pino from 'pino';
import { fastifySwagger } from '@fastify/swagger';
import PinoPretty from 'pino-pretty';
import config from './config/env.config';
import multipart from '@fastify/multipart';
import mongoose from 'mongoose';
// import fastifyJwt from '@fastify/jwt';
import Routes from './routes/index.routes';
import fastifyCors from '@fastify/cors';

const fastify = Fastify({
    logger: pino(PinoPretty({
        colorize: true,
        translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
        mkdir: true
    }))
});

fastify.register(fastifyCors);

fastify.register(multipart, {
    limits: { fileSize: 52428800 } // maxsize: 50MB
});

fastify.register(fastifySwagger);


// fastify.register(fastifyJwt, {
//     secret: envConfig.SecretKey
// })

// fastify.addHook('onRequest', async (request, reply) => {
//     try {
//         await request.jwtVerify();
//     } catch (error) {
//         fastify.log.error('UnAuthorized')
//         reply.send(error);
//     }
// })

fastify.register(Routes);

fastify.get('/', async (request, reply) => {
    return 'Welcome to Fastify!'
})
try {
    mongoose.set('strictQuery', true);
    mongoose.connect(config.MongoDB);
    fastify.log.info('MongoDB Connected');
} catch (err) {
    fastify.log.error(err);
}

const start = async () => {
    try {
        await fastify.listen({ port: config.Port });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();