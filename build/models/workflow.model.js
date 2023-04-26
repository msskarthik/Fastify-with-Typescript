"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const workFlowSchema = new mongoose_1.Schema({
    workFlowName: {
        type: String,
        required: true
    },
    graphJSONData: {
        type: Object,
    },
    createdDate: {
        type: Date,
        required: true
    },
    updatedDate: {
        type: Date,
    },
    jobsCount: {
        type: Number
    },
    successfulRuns: {
        type: Number
    },
    failedJobs: {
        type: Array
    }
});
exports.default = (0, mongoose_1.model)('WorkFlows', workFlowSchema);
