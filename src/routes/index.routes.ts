import { FastifyPluginCallback } from "fastify";
import {getUser, saveUser, updateUser} from '../controllers/index.controller';

const Routes: FastifyPluginCallback = (fastify,opts,done) => {

    // create the user
    fastify.post('/saveUser', saveUser);

    // get the users
    fastify.get('/getUser',getUser);

    // update the user
    fastify.put('/updateUser/:id',updateUser);

    done();
};

export default Routes;