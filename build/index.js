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
const fastify_1 = __importDefault(require("fastify"));
const pino_1 = __importDefault(require("pino"));
const swagger_1 = require("@fastify/swagger");
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const env_config_1 = __importDefault(require("./config/env.config"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const mongoose_1 = __importDefault(require("mongoose"));
// import fastifyJwt from '@fastify/jwt';
const index_routes_1 = __importDefault(require("./routes/index.routes"));
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify = (0, fastify_1.default)({
    logger: (0, pino_1.default)((0, pino_pretty_1.default)({
        colorize: true,
        translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
        mkdir: true
    }))
});
fastify.register(cors_1.default);
fastify.register(multipart_1.default, {
    limits: { fileSize: 52428800 } // maxsize: 50MB
});
fastify.register(swagger_1.fastifySwagger);
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
fastify.register(index_routes_1.default);
fastify.get('/', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    return 'Welcome to Fastify!';
}));
try {
    mongoose_1.default.set('strictQuery', true);
    mongoose_1.default.connect(env_config_1.default.MongoDB);
    fastify.log.info('MongoDB Connected');
}
catch (err) {
    fastify.log.error(err);
}
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fastify.listen({ port: env_config_1.default.Port });
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
});
start();
