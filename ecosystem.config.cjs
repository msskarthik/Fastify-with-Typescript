"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
module.exports = {
    apps: [{
            name: 'productflows-fastify-backend',
            script: (0, path_1.resolve)(__dirname, 'src', 'index.ts'),
            instances: '1',
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: 'development',
            },
        }],
};
