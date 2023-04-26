"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ProductsSchema = new mongoose_1.Schema({
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
});
exports.default = (0, mongoose_1.model)('Products', ProductsSchema);
