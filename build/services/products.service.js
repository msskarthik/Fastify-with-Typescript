"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.downloadProducts = exports.ImportProductsToGraph = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const env_config_1 = __importDefault(require("../config/env.config"));
const pino_1 = require("pino");
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const uuid_1 = require("uuid");
const papaparse = __importStar(require("papaparse"));
const XLSX = __importStar(require("xlsx"));
const fs = __importStar(require("fs-extra"));
const logger = (0, pino_1.pino)((0, pino_pretty_1.default)({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));
const driver = neo4j_driver_1.default.driver(env_config_1.default.Neo4j_URI, neo4j_driver_1.default.auth.basic(env_config_1.default.UserName, env_config_1.default.Password));
const ImportProductsToGraph = (filename, workflowname) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let file = filename.split('.csv')[0];
        let RelationArray = [];
        let parentArray = ['source', 'target'];
        for (let index = 0; index < parentArray.length; index++) {
            let result = yield GetChildRecords(parentArray[index], workflowname);
            RelationArray.push(...result);
        }
        let Conditions = yield GetConditionRecords(workflowname);
        let Dependencies = yield GetDependencyRecords(workflowname);
        if (Dependencies.length > 0) {
            let finalResult = yield ImportProducts(filename, Conditions, Dependencies);
            let dataToSave = yield ConvertProducts(finalResult);
            if (dataToSave == 'Data Empty') {
                return 'No single product passed the validation';
            }
            else {
                let savedproducts = yield SaveProductsInGraph(dataToSave, file);
                return savedproducts;
            }
        }
        else {
            return 'No Mapping available to import';
        }
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        let path = `./uploads/${filename}`;
        fs.unlinkSync(path);
    }
});
exports.ImportProductsToGraph = ImportProductsToGraph;
const downloadProducts = (flow) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let name = flow.name.replaceAll(" ", "");
        const keymapping = {
            Code: 'Code',
            Color: 'Color',
            CostPrice: 'Cost Price',
            Description: 'Description',
            Fit: 'Fit',
            LargeImage: 'Large Image',
            ManufacturerSKUID: 'Manufacturer SKU ID',
            MAP: 'MAP',
            MSRP: 'MSRP',
            Name: 'Name',
            Size: 'Size',
            SupplierSKUID: 'Supplier SKU ID',
            SwatchImage: 'Swatch Image',
            ThumbnailImage: 'Thumbnail Image'
        };
        let depends = yield GetExportDependency(name);
        let keyobject = {};
        depends.forEach((obj) => {
            let item = obj._fields[0];
            keyobject[item.start.properties.name] = item.end.properties.name;
        });
        let products = yield getAllProducts();
        let finalProductArr = [];
        for (let proIndex = 0; proIndex < products.length; proIndex++) {
            let object = {};
            let product = products[proIndex]._fields[0];
            let skus = yield getAllSkus(product.properties);
            let categories = yield getProductCategories(product.properties);
            let productcategories = yield Setcategories(categories);
            for (let categIndex = 0; categIndex < productcategories.length; categIndex++) {
                let index = categIndex + 1;
                object['CategoryName_' + index] = productcategories[categIndex];
            }
            for (let skuIndex = 0; skuIndex < skus.length; skuIndex++) {
                object = Object.assign(Object.assign({}, object), product.properties);
                let sku = skus[skuIndex]._fields[0];
                let keys = Object.keys(sku.properties);
                keys.forEach((key) => {
                    if (key != 'Code') {
                        if (key == 'Name') {
                            object['SupplierSKUID'] = sku.properties['Name'];
                        }
                        else if (key == 'SKUCode') {
                            object['ManufacturerSKUID'] = sku.properties['SKUCode'];
                        }
                        else {
                            object[key] = sku.properties[key];
                        }
                    }
                });
                let options = yield getAllOptions(sku.properties);
                for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
                    let option = options[optionIndex]._fields[0];
                    let keys = Object.keys(option.properties);
                    object[option.properties['Name']] = option.properties['Value'];
                    keys.forEach((key) => {
                        if (key == 'SwatchImage') {
                            object['SwatchImage'] = option.properties[key];
                        }
                    });
                }
                finalProductArr.push(object);
            }
        }
        let allArr = [];
        finalProductArr.forEach(obj => {
            const convertedObj = Object.keys(obj).reduce((acc, key) => {
                const newKey = keymapping[key] || key;
                return Object.assign(acc, { [newKey]: obj[key] });
            }, {});
            allArr.push(convertedObj);
        });
        let finalArr = [];
        allArr.forEach(item => {
            const convertedObj = Object.keys(item).reduce((acc, key) => {
                const newKey = keyobject[key] || key;
                return Object.assign(acc, { [newKey]: item[key] });
            }, {});
            finalArr.push(convertedObj);
        });
        let findType = yield findFormat(name);
        if (findType[0]._fields[0].properties.name === 'CSV') {
            let csv = papaparse.unparse(finalArr);
            let obj = {
                type: 'csv',
                data: csv
            };
            return obj;
        }
        else {
            const worksheet = XLSX.utils.json_to_sheet(finalArr);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            const filePath = './uploads/data.xlsx';
            XLSX.writeFile(workbook, filePath);
            const fileSync = fs.readFileSync(filePath);
            let obj = {
                type: 'xlsx',
                data: fileSync
            };
            return obj;
        }
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        if (fs.existsSync('./uploads/data.xlsx')) {
            fs.unlinkSync('./uploads/data.xlsx');
        }
    }
});
exports.downloadProducts = downloadProducts;
const findFormat = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = `MATCH (n:Node) WHERE n.title STARTS WITH '${name}' AND n.type = 'end' RETURN n`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const getAllSkus = (product) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = `MATCH (n:Product)-[r:SKU_Of]->(m:Sku) WHERE n.Code = '${product.Code}' RETURN m`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const Setcategories = (categories) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let catArr = [];
        for (let indexCat = 0; indexCat < categories.length; indexCat++) {
            let category = categories[indexCat];
            let catString = [];
            let item = yield getCategory(category, catString);
            item = item.reverse();
            let string = item.join('>');
            catArr.push(string);
        }
        return catArr;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
const getCategory = (category, array) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let name = category._fields[0].properties.Name;
        let code = category._fields[0].properties.Code;
        array.push(name);
        let parentCat = yield getParentCat(code);
        if (parentCat.length > 0) {
            yield getCategory(parentCat[0], array);
        }
        return array;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
const getParentCat = (code) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = `MATCH (n:Category)-[r:Child_Of]->(m:Category) WHERE n.Code = '${code}'  RETURN m`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const getAllOptions = (product) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = `MATCH (n:Sku)-[r:Option_Of]->(m:Option) WHERE m.Code = '${product.Code + '_' + product.Name}' RETURN m`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const getProductCategories = (product) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = `MATCH (n:Category)-[r:Category_Of]->(m:Product) WHERE m.Code = '${product.Code}' RETURN n`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const getAllProducts = () => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = `MATCH (n:Product) RETURN n`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
    }
    finally {
        yield session.close();
    }
});
const GetExportDependency = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = `MATCH p=(n:Node)-[r:DEPENDS_ON]->()
        WHERE n.title STARTS WITH '${name}' AND (n.type = 'targetMap' OR n.type = 'exportMap')
        RETURN p`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const GetChildRecords = (parent, name) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let nametoQuery = name + '_' + parent;
        let query = `MATCH (n:Node)-[r:PARENT_OF]->(m:Node)
            WHERE n.title = '${nametoQuery}'
            RETURN m`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const GetConditionRecords = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let queryname = name + '_';
        let query = `MATCH p=(n:Node)-[:CONDITION_OF]->(m:Condition) WHERE n.title STARTS WITH '${queryname}' RETURN p`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const GetDependencyRecords = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let queryname = name + '_';
        let query = `MATCH p=(n:Node)-[r:DEPENDS_ON]->()
            WHERE n.title STARTS WITH '${queryname}' AND (n.type = 'dataMap' OR n.type = 'condition')
            RETURN p`;
        let result = yield session.run(query);
        return result.records;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const checkConditionValid = (condition, product, value, option) => {
    try {
        let finalValue = true;
        if (typeof product !== 'string') {
            value = JSON.parse(value);
        }
        switch (option) {
            case 'Equal To':
                let final1 = product === value;
                if (condition) {
                    finalValue = finalValue && final1;
                }
                else {
                    finalValue = finalValue || final1;
                }
                break;
            case 'Not Equal To':
                let final2 = product !== value;
                if (condition) {
                    finalValue = finalValue && final2;
                }
                else {
                    finalValue = finalValue || final2;
                }
                break;
            case 'Includes':
                let final3 = product.includes(value);
                if (condition) {
                    finalValue = finalValue && final3;
                }
                else {
                    finalValue = finalValue || final3;
                }
                break;
            case 'Does Not Includes':
                let final4 = !product.includes(value);
                if (condition) {
                    finalValue = finalValue && final4;
                }
                else {
                    finalValue = finalValue || final4;
                }
                break;
            case 'Starts With':
                let final5 = product.startsWith(value);
                if (condition) {
                    finalValue = finalValue && final5;
                }
                else {
                    finalValue = finalValue || final5;
                }
                break;
            case 'Does Not Starts With':
                let final6 = !product.startsWith(value);
                if (condition) {
                    finalValue = finalValue && final6;
                }
                else {
                    finalValue = finalValue || final6;
                }
                break;
            case 'Ends With':
                let final7 = product.endsWith(value);
                if (condition) {
                    finalValue = finalValue && final7;
                }
                else {
                    finalValue = finalValue || final7;
                }
                break;
            case 'Does Not Ends With':
                let final8 = !product.endsWith(value);
                if (condition) {
                    finalValue = finalValue && final8;
                }
                else {
                    finalValue = finalValue || final8;
                }
                break;
            case 'Empty':
                let final9 = product === '';
                if (condition) {
                    finalValue = finalValue && final9;
                }
                else {
                    finalValue = finalValue || final9;
                }
                break;
            case 'Not Empty':
                let final10 = product !== '';
                if (condition) {
                    finalValue = finalValue && final10;
                }
                else {
                    finalValue = finalValue || final10;
                }
                break;
            default:
                break;
        }
        return finalValue;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
};
const ImportProducts = (filename, condition, dependecies) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filePath = `./uploads/${filename}`;
        let jsonData = [];
        if (filename.includes(".csv")) {
            const csvData = yield fs.readFile(filePath, 'utf-8');
            jsonData = papaparse.parse(csvData, { header: true, dynamicTyping: true }).data;
        }
        else if (filename.includes('xlsx')) {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            // Convert the worksheet to a JSON object with key-value pairs of headers and values
            const options = { header: 1, defval: null, raw: false };
            const rows = XLSX.utils.sheet_to_json(worksheet, options);
            // Get the header row
            const headerRow = rows.shift();
            // Map each row to an object with key-value pairs of headers and values
            const data = rows.map((row) => {
                const rowData = {};
                headerRow.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });
            jsonData = data;
        }
        const newprodArr = [];
        jsonData.forEach((product) => {
            let object = {};
            let conditionType = true;
            let conditionPass = [];
            dependecies.forEach((depend) => {
                let item = depend._fields[0];
                if (item.start.properties.parent == 'source') {
                    if (item.end.properties.parent == 'target') {
                        if (!item.start.properties.name.startsWith('Category')) {
                            object[item.end.properties.name] = product[item.start.properties.name];
                        }
                        else {
                            if (object[item.end.properties.name] == undefined) {
                                object[item.end.properties.name] = [product[item.start.properties.name]];
                            }
                            else {
                                object[item.end.properties.name].push(product[item.start.properties.name]);
                            }
                        }
                    }
                    else if (item.end.properties.type == 'condition') {
                        condition.forEach((obj) => {
                            let condObj = obj._fields[0];
                            conditionType = condObj.start.properties.name === 'ALL' ? true : false;
                            if (item.start.properties.name === condObj.end.properties.name) {
                                let inputCheck = product[item.start.properties.name];
                                let conditionSatisfies = checkConditionValid(conditionType, inputCheck, condObj.end.properties.value, condObj.end.properties.option);
                                conditionPass.push(conditionSatisfies);
                                if (conditionSatisfies) {
                                    let codIndex = dependecies.filter((obj) => obj._fields[0].start.properties.name === condObj.start.properties.name);
                                    let index = codIndex.findIndex((obj) => obj._fields[0].start.elementId === condObj.start.elementId);
                                    let itemToAdd = codIndex[index];
                                    object[itemToAdd._fields[0].end.properties.name] = product[item.start.properties.name];
                                }
                            }
                        });
                    }
                }
            });
            if (conditionPass.length > 0) {
                let finalValidtion = conditionPass.reduce((acc = conditionPass[0], i) => acc && i);
                if (finalValidtion) {
                    newprodArr.push(object);
                }
            }
            else {
                newprodArr.push(object);
            }
        });
        return newprodArr;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
const ConvertProducts = (products) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let productsList = [];
        if (products.length != 0) {
            products.forEach((product) => {
                let obj = {
                    name: product.Name,
                    code: product.Code,
                    brand: product.Brand,
                    description: product.Description,
                    categories: product.Categories,
                    ProductSKUs: [{
                            Supplier_SKU_ID: product['Supplier SKU ID'],
                            Manufacturer_SKU_ID: product['Manufacturer SKU ID'],
                            MSRP: product.MSRP,
                            MAP: product.MAP,
                            costPrice: product['Cost Price'],
                            largeImage: product['Large Image'],
                            thumbnailImage: product['Thumbnail Image'],
                            SKUOptions: [{
                                    optionName: 'Color',
                                    optionValue: product['Color'],
                                    swatchImage: product['Swatch Image']
                                }, {
                                    optionName: 'Size',
                                    optionvalue: product['Size']
                                }, {
                                    optionName: 'Fit',
                                    optionvalue: product['Fit']
                                }]
                        }]
                };
                productsList.push(obj);
            });
            const groupByProductCode = (key, productArr) => productArr.reduce((accumulator, product) => (Object.assign(Object.assign({}, accumulator), { [product[key]]: product[key] in accumulator
                    ? accumulator[product[key]].concat(product.ProductSKUs)
                    : [product] })), {});
            const productsByCode = groupByProductCode('code', productsList);
            let productArr = [];
            for (let key in productsByCode) {
                let sku = productsByCode[key];
                for (let i = 1; i < sku.length; i++) {
                    let skucount = 0;
                    sku[0].ProductSKUs.forEach((obj) => {
                        if (obj.Manufacturer_SKU_ID == sku[i].Manufacturer_SKU_ID) {
                            skucount++;
                        }
                    });
                    if (skucount == 0) {
                        sku[0].ProductSKUs.push(sku[i]);
                    }
                }
                productArr.push(sku[0]);
            }
            return productArr;
        }
        else {
            return 'Data Empty';
        }
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
const CheckProduct = (products) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        for (let index = 0; index < products.length; index++) {
            let product = products[index];
            let query = `MATCH (n:Product) WHERE n.Code = '${product.code}' RETURN n`;
            const session = driver.session();
            let result = yield session.run(query);
            yield session.close();
            if (result.records.length > 0) {
                let deleteQuery = `MATCH (n:Product)-[r]-(m:Sku)-[r2]-(p:Option) MATCH (n:Product)-[r3]-(c:Category)
                WHERE n.Code = '${product.code}'
                DETACH DELETE n,r,m,r2,p,r3`;
                const sess = driver.session();
                yield sess.run(deleteQuery);
                yield sess.close();
            }
        }
        return 'Empty';
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
const SaveProductsInGraph = (products, fileName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let check = yield CheckProduct(products);
        if (check == 'Empty') {
            for (let productindex = 0; productindex < products.length; productindex++) {
                let allQuerys = [];
                let product = products[productindex];
                let skuQueries = [];
                let optionQueries = [];
                if (product.code != undefined) {
                    let productId = (0, uuid_1.v4)();
                    productId = 'Pd' + productId.replaceAll('-', '_');
                    let query = `CREATE (${productId}:Product {Code:'${product.code}',Name:'${product.name}',Brand:'${product.brand}', Description: '${product.description.replaceAll("'", "\\'")}'})`;
                    allQuerys.push(query);
                    for (let skuIndex = 0; skuIndex < product.ProductSKUs.length; skuIndex++) {
                        let SKU = product.ProductSKUs[skuIndex];
                        let skuId = (0, uuid_1.v4)();
                        skuId = 'Sk' + skuId.replaceAll('-', '_');
                        let skuQuery = `CREATE (${skuId}:Sku {Name:'${SKU.Supplier_SKU_ID}', Code: '${product.code}', SKUCode:'${SKU.Manufacturer_SKU_ID}',MSRP:'${SKU.MSRP}',MAP:'${SKU.MAP}',CostPrice:'${SKU.costPrice}',LargeImage:'${SKU.largeImage}',ThumbnailImage:'${SKU.thumbnailImage}'})`;
                        allQuerys.push(skuQuery);
                        let relationSKU = `(${productId})-[:SKU_Of]->(${skuId})`;
                        skuQueries.push(relationSKU);
                        for (let optionIndex = 0; optionIndex < SKU.SKUOptions.length; optionIndex++) {
                            let option = SKU.SKUOptions[optionIndex];
                            let optionId = (0, uuid_1.v4)();
                            optionId = 'Op' + optionId.replaceAll('-', '_');
                            let optionQuery = '';
                            let optionRelation = '';
                            if (option.optionName == 'Color') {
                                optionQuery = `CREATE (${optionId}:Option {Name: '${option.optionName}', Code: '${product.code + '_' + SKU.Supplier_SKU_ID}', Value: '${option.optionValue}',SwatchImage: '${option.swatchImage}'})`;
                            }
                            else {
                                optionQuery = `CREATE (${optionId}:Option {Name: '${option.optionName}', Code: '${product.code + '_' + SKU.Supplier_SKU_ID}', Value: '${option.optionvalue}'})`;
                            }
                            optionRelation = `(${skuId})-[:Option_Of]->(${optionId})`;
                            optionQueries.push(optionRelation);
                            allQuerys.push(optionQuery);
                        }
                    }
                    if (skuQueries.length > 0) {
                        let skuQ = 'CREATE ' + skuQueries.join(',\n');
                        allQuerys.push(skuQ);
                    }
                    if (optionQueries.length > 0) {
                        let optionQ = 'CREATE ' + optionQueries.join(',\n');
                        allQuerys.push(optionQ);
                    }
                    let catGrp = yield SaveCategoriesInGraph(product, productId, allQuerys, fileName);
                    allQuerys.push(...catGrp.cateArr);
                    let done = yield saveProductQuery(allQuerys);
                    for (let q = 0; q < catGrp.querys.length; q++) {
                        let finalQ = yield savecategoryRelation(catGrp.querys[q], product.code);
                    }
                }
            }
        }
        return 'Products added';
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
const SaveCategoriesInGraph = (product, proId, querys, fileName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let catObj = {};
        let catArr = [];
        let relArr = [];
        let finalQuery = [];
        let cat = product.categories;
        for (let catIndex = 0; catIndex < cat.length; catIndex++) {
            let obj = cat[catIndex];
            if (obj != null) {
                let item = obj.split('>');
                let mergeRequired = false;
                for (let subCatIndex = 0; subCatIndex < item.length; subCatIndex++) {
                    let category = item[subCatIndex];
                    let id = (0, uuid_1.v4)();
                    id = 'Ct' + id.replaceAll("-", "_");
                    let result = yield checkCategoryAvailable(category, item[subCatIndex - 1], fileName);
                    if (catObj[category] == undefined) {
                        if (result == 'Empty') {
                            catObj[category] = id;
                            let query = `CREATE (${id}:Category {Name: '${category}', Code:'${id}',File:'${fileName}'})`;
                            if (subCatIndex == 0) {
                                catArr.push(query);
                                // let query2: string = `(${id})-[:Category_Of]->(${proId})`;
                                // relArr.push(query2);
                            }
                            else {
                                if (mergeRequired) {
                                    let mergeCat = `MERGE (${catObj[item[subCatIndex]]}:Category {Name: '${category}', Code:'${catObj[item[subCatIndex]]}', File:'${fileName}'}) WITH ${catObj[item[subCatIndex]]}
                                    MATCH (${catObj[item[subCatIndex - 1]]}:Category {Code:'${catObj[item[subCatIndex - 1]]}'})
                                    CREATE (${catObj[item[subCatIndex]]})-[:Child_Of]->(${catObj[item[subCatIndex - 1]]})`;
                                    let check = yield checkingParentExists(mergeCat);
                                }
                                else {
                                    catArr.push(query);
                                    let parentId1 = catObj[item[subCatIndex - 1]];
                                    let condQuery = `(${id})-[:Child_Of]->(${parentId1})`;
                                    relArr.push(condQuery);
                                }
                            }
                        }
                        else {
                            if (subCatIndex == 0) {
                                let oldId = result[0].properties.Code;
                                catObj[result[0].properties.Name] = result[0].properties.Code;
                                let mergeQuery = `MERGE (${oldId}:Category {Name:'${category}', Code:'${oldId}', File: '${fileName}'})`;
                                let index = querys.findIndex((obj) => obj === mergeQuery);
                                if (index == -1) {
                                    catArr.push(mergeQuery);
                                }
                                // let query: string = `(${oldId})-[:Category_Of]->(${proId})`;
                                // relArr.push(query);
                            }
                            else {
                                if (result.length === 3) {
                                    catObj[result[2].properties.Name] = result[2].properties.Code;
                                    catObj[result[0].properties.Name] = result[0].properties.Code;
                                    mergeRequired = true;
                                }
                            }
                        }
                    }
                    if (subCatIndex == item.length - 1) {
                        let index = finalQuery.findIndex((ind) => ind === catObj[item[subCatIndex]]);
                        if (index == -1) {
                            finalQuery.push(catObj[item[subCatIndex]]);
                        }
                    }
                }
            }
        }
        if (relArr.length > 0) {
            let skuQ = 'CREATE ' + relArr.join(',\n');
            catArr.push(skuQ);
        }
        let objFinal = {
            cateArr: catArr,
            querys: finalQuery
        };
        return objFinal;
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
const saveProductQuery = (allQuerys) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let finalArray = [...new Set(allQuerys)];
        let query = finalArray.join('\n').concat('\n');
        yield session.run(query);
        return 'Done';
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const savecategoryRelation = (category, code) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = `MATCH (n1:Category {Code: '${category}'}), (n2: Product {Code:'${code}'})
        CREATE (n1)-[:Category_Of]->(n2)`;
        yield session.run(query);
        return 'Done';
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const checkingParentExists = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let result = yield session.run(name);
        if (result.records.length > 0) {
            return 'Exists';
        }
        else {
            return 'Empty';
        }
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const checkCategoryAvailable = (name, parent, file) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let query = '';
        if (parent == undefined) {
            query = `MATCH (n:Category) WHERE n.Name = '${name}' AND n.File = '${file}' RETURN n`;
        }
        else {
            query = `MATCH (n:Category)-[r]-(m:Category) WHERE n.Name = '${name}' AND n.File = '${file}' AND m.File = '${file}' AND m.Name = '${parent}' RETURN n,r,m`;
        }
        let result = yield session.run(query);
        if (result.records.length > 0) {
            let final = result.records[0]._fields;
            return final;
        }
        else {
            return 'Empty';
        }
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
