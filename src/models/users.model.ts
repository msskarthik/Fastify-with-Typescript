import {Schema,model} from "mongoose";

const userSchema = new Schema({
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required:true
    },
    exist: {
        type: Boolean,
        required: true
    }
});

export default model('FastifyUser',userSchema);
