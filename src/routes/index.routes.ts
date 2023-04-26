import { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { getWorkFlows, saveWorkFlow, updateWorkFlow, getWorkFlow, getDefaultData, readFileHeaders, RunProducts, ExportProducts } from '../controllers/index.controller';
import fs from 'fs';


const multerMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        let data: any = await request.file();
        let buf: Buffer = await data.toBuffer();
        request.body = data
        await fs.promises.writeFile(`./uploads/${data.filename}`, buf);
    } catch (err) {
        return err;
    }
}

const Routes: FastifyPluginCallback = (fastify, opts, done) => {

    // create the user
    fastify.post('/saveWorkFlow', saveWorkFlow);

    // get the users
    fastify.get('/getWorkFlows', getWorkFlows);

    // update the user
    fastify.put('/updateWorkFlow/:id', updateWorkFlow);

    // get dummy data
    fastify.get("/getDefaultData", getDefaultData);

    // get selected workflow
    fastify.get('/getWorkFlow/:id', getWorkFlow);

    // find Headers of the File
    fastify.post('/sendFile', { preHandler: multerMiddleware }, readFileHeaders);

    // import products
    fastify.post('/runJob/:id', { preHandler: multerMiddleware }, RunProducts);

    // download products
    fastify.post('/downloadProducts', ExportProducts);

    done();
};

export default Routes;