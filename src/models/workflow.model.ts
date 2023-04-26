import { Schema, model } from "mongoose";

const workFlowSchema = new Schema({
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

export default model('WorkFlows', workFlowSchema);
