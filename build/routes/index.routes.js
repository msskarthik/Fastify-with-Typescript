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
const index_controller_1 = require("../controllers/index.controller");
const fs_1 = __importDefault(require("fs"));
const multerMiddleware = (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let data = yield request.file();
        let buf = yield data.toBuffer();
        request.body = data;
        yield fs_1.default.promises.writeFile(`./uploads/${data.filename}`, buf);
    }
    catch (err) {
        return err;
    }
});
const Routes = (fastify, opts, done) => {
    // create the user
    fastify.post('/saveWorkFlow', index_controller_1.saveWorkFlow);
    // get the users
    fastify.get('/getWorkFlows', index_controller_1.getWorkFlows);
    // update the user
    fastify.put('/updateWorkFlow/:id', index_controller_1.updateWorkFlow);
    // get dummy data
    fastify.get("/getDefaultData", index_controller_1.getDefaultData);
    // get selected workflow
    fastify.get('/getWorkFlow/:id', index_controller_1.getWorkFlow);
    // find Headers of the File
    fastify.post('/sendFile', { preHandler: multerMiddleware }, index_controller_1.readFileHeaders);
    // import products
    fastify.post('/runJob/:id', { preHandler: multerMiddleware }, index_controller_1.RunProducts);
    // download products
    fastify.post('/downloadProducts', index_controller_1.ExportProducts);
    done();
};
exports.default = Routes;
