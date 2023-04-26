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
exports.createGraphDBforWorkflow = void 0;
const pino_1 = require("pino");
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const env_config_1 = __importDefault(require("../config/env.config"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const workflow_model_1 = __importDefault(require("../models/workflow.model"));
const logger = (0, pino_1.pino)((0, pino_pretty_1.default)({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));
const driver = neo4j_driver_1.default.driver(env_config_1.default.Neo4j_URI, neo4j_driver_1.default.auth.basic(env_config_1.default.UserName, env_config_1.default.Password));
const createGraphDBforWorkflow = (data, id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let result = yield checkGraphDB(id);
        if (result == 'Empty') {
            let saveDb = yield saveGraphDB(data, id);
            return saveDb;
        }
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
});
exports.createGraphDBforWorkflow = createGraphDBforWorkflow;
const checkGraphDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        const workFlowname = yield workflow_model_1.default.findOne({ _id: id }).lean();
        let nameToQuery = (yield workFlowname.workFlowName.replaceAll(" ", "")) + '_';
        let query = `MATCH (n:Node) WHERE n.title STARTS WITH '${nameToQuery}' RETURN n`;
        let result = yield session.run(query);
        if (result.records.length != 0) {
            yield clearGraphDB(nameToQuery);
            return 'Empty';
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
const saveGraphDB = (data, id) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        const workFlowname = yield workflow_model_1.default.findOne({ _id: id }).lean();
        let nodes = data.graphJSONData.nodes;
        let edges = data.graphJSONData.edges;
        let allQueryArray = [];
        nodes.forEach((obj) => __awaiter(void 0, void 0, void 0, function* () {
            let name = workFlowname.workFlowName.replaceAll(" ", "") + '_' + obj.id;
            name = name.replace(".", "");
            switch (obj.type) {
                case 'start':
                    let labelstart = obj.data.label[1].replace(" ", "");
                    let type = obj.type;
                    let query = `CREATE (${name}:Node {title:'${name}',type:'${type}',name:'${labelstart}'})`;
                    allQueryArray.push(query);
                    break;
                case 'dataMap':
                    let label = '';
                    if (typeof obj.data.label !== 'string') {
                        label = obj.data.label[0];
                    }
                    else {
                        label = obj.data.label;
                    }
                    let Type = obj.type;
                    let parent = obj.parentNode;
                    let Dataquery = `CREATE (${name}:Node {title: '${name}',type:'${Type}',name:'${label}',parent:'${parent}'})`;
                    allQueryArray.push(Dataquery);
                    break;
                case 'exportMap':
                    let labelexp = '';
                    if (typeof obj.data.label !== 'string') {
                        labelexp = obj.data.label[0];
                    }
                    else {
                        labelexp = obj.data.label;
                    }
                    let Typeexp = obj.type;
                    let parentexp = obj.parentNode;
                    let Dataqueryexp = `CREATE (${name}:Node {title: '${name}',type:'${Typeexp}',name:'${labelexp}',parent:'${parentexp}'})`;
                    allQueryArray.push(Dataqueryexp);
                    break;
                case 'targetMap':
                    let labelTarget = obj.data.label;
                    if (typeof obj.data.label !== 'string') {
                        labelTarget = obj.data.label[0];
                    }
                    else {
                        labelTarget = obj.data.label;
                    }
                    let TypeTarget = obj.type;
                    let parentTarget = obj.parentNode;
                    let DataqueryTarget = `CREATE (${name}:Node {title: '${name}',type:'${TypeTarget}',name:'${labelTarget}',parent:'${parentTarget}'})`;
                    allQueryArray.push(DataqueryTarget);
                    break;
                case 'parentMap':
                    let labelparent = obj.data.label;
                    let parenttype = obj.type;
                    let parentQuery = `CREATE (${name}:Node {title: '${name}',type:'${parenttype}',name:'${labelparent}'})`;
                    allQueryArray.push(parentQuery);
                    break;
                case 'exportParent':
                    let labelparentexp = obj.data.label;
                    let parenttypeexp = obj.type;
                    let parentQueryexp = `CREATE (${name}:Node {title: '${name}',type:'${parenttypeexp}',name:'${labelparentexp}'})`;
                    allQueryArray.push(parentQueryexp);
                    break;
                case 'condition':
                    let condition = obj.data.condition === 'All conditions are met' ? 'ALL' : 'ANY';
                    let condtype = obj.type;
                    let conditionQuery = `CREATE (${name}:Node {title: '${name}', type:'${condtype}',name: '${condition}'})`;
                    allQueryArray.push(conditionQuery);
                    break;
                case 'end':
                    let endtype = obj.type;
                    let labelEnd = obj.data.label[1].replace(" ", "");
                    let endQuery = `CREATE (${name}:Node {title: '${name}',type:'${endtype}',name: '${labelEnd}'})`;
                    allQueryArray.push(endQuery);
                    break;
                default:
                    break;
            }
        }));
        nodes.forEach((node) => {
            if (node.type == 'condition') {
                let name = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.id;
                name = name.replace(".", "");
                let arrayQuery = [];
                let finalCondition = [];
                node.data.actions.forEach((action) => {
                    let actionname = 'Condition_' + Math.random().toString(36).slice(-10);
                    let queryArr = `(${name})-[:CONDITION_OF]->(${actionname})`;
                    finalCondition.push(queryArr);
                    let query = `CREATE (${actionname}:Condition {title: '${name}', type: '${node.type}',name: '${action.name}',value: ${action.value},option:'${action.option}'})`;
                    arrayQuery.push(query);
                });
                let finalQueryArray = 'CREATE' + finalCondition.join(',\n');
                allQueryArray.push(...arrayQuery);
                allQueryArray.push(finalQueryArray);
            }
        });
        let edgeQueryArr = [];
        edges.forEach((edge) => {
            let sourceName = workFlowname.workFlowName.replaceAll(" ", "") + '_' + edge.source;
            sourceName = sourceName.replace(".", "");
            let targetName = workFlowname.workFlowName.replaceAll(" ", "") + '_' + edge.target;
            targetName = targetName.replace(".", "");
            let edgeQuery = `(${sourceName})-[:DEPENDS_ON]->(${targetName})`;
            edgeQueryArr.push(edgeQuery);
        });
        if (edgeQueryArr.length != 0) {
            const allQuery = 'CREATE ' + edgeQueryArr.join(',\n');
            allQueryArray.push(allQuery);
        }
        let edgeQueryArray = [];
        nodes.forEach((node) => {
            if (node.type == 'dataMap') {
                let name = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.id;
                name = name.replace(".", "");
                let item = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.parentNode;
                item = item.replace(".", "");
                let relationQuery = `(${item})-[:PARENT_OF]->(${name})`;
                edgeQueryArray.push(relationQuery);
            }
            else if (node.type == 'targetMap') {
                let name = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.id;
                name = name.replace(".", "");
                let item = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.parentNode;
                item = item.replace(".", "");
                let relationQuery = `(${item})-[:PARENT_OF]->(${name})`;
                edgeQueryArray.push(relationQuery);
            }
            else if (node.type == 'exportMap') {
                let name = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.id;
                name = name.replace(".", "");
                let item = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.parentNode;
                item = item.replace(".", "");
                let relationQuery = `(${item})-[:PARENT_OF]->(${name})`;
                edgeQueryArray.push(relationQuery);
            }
        });
        if (edgeQueryArray.length != 0) {
            const allQuerys = 'CREATE ' + edgeQueryArray.join(',\n');
            allQueryArray.push(allQuerys);
        }
        const query = allQueryArray.join("\n").concat("\n");
        yield session.run(query);
        return 'Saved Successfully';
    }
    catch (err) {
        logger.error(err.message);
        return err;
    }
    finally {
        yield session.close();
    }
});
const clearGraphDB = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const session = driver.session();
    try {
        let allQuery = [`MATCH (n:Node) WHERE n.title STARTS WITH '${name}' DETACH DELETE n`, `MATCH (m:Condition) WHERE m.title STARTS WITH '${name}' DETACH DELETE m`];
        const query = allQuery.join(" WITH 1 AS dummy\n").concat("\n");
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
