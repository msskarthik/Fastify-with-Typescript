import { Schema, model } from "mongoose";

const ProductsSchema = new Schema({
    userId: {
        type: Number
    },
    profileId: {
        type: Number
    },
    userType: {
        type: Number
    },
    skuCount: {
        type: Number
    },
    product: {
        type: Object
    },
    productId: {
        type: Number
    },
    importId: {
        type: Number
    },
    uniqueId: {
        type: String
    },
    attributeId: {
        type: Array
    }
})
export default model('Products', ProductsSchema)