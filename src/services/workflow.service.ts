import { pino, Logger } from 'pino';
import PinoPretty from 'pino-pretty';
import envConfig from '../config/env.config';
import neo4j, { Driver, Session } from 'neo4j-driver';
import workflowModel from '../models/workflow.model';

const logger: Logger = pino(PinoPretty({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));

const driver: Driver = neo4j.driver(envConfig.Neo4j_URI, neo4j.auth.basic(envConfig.UserName, envConfig.Password));

export const createGraphDBforWorkflow = async (data: any, id: string): Promise<any> => {
    try {
        let result: string = await checkGraphDB(id);
        if (result == 'Empty') {
            let saveDb: string = await saveGraphDB(data, id);
            return saveDb;
        }
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const checkGraphDB = async (id: string): Promise<string> => {
    const session: Session = driver.session();
    try {
        const workFlowname: any = await workflowModel.findOne({ _id: id }).lean();
        let nameToQuery: string = await workFlowname.workFlowName.replaceAll(" ", "") + '_';
        let query: string = `MATCH (n:Node) WHERE n.title STARTS WITH '${nameToQuery}' RETURN n`;
        let result: any = await session.run(query);
        if (result.records.length != 0) {
            await clearGraphDB(nameToQuery);
            return 'Empty'
        } else {
            return 'Empty'
        }
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const saveGraphDB = async (data: any, id: string): Promise<string> => {
    const session: Session = driver.session();
    try {
        const workFlowname: any = await workflowModel.findOne({ _id: id }).lean();
        let nodes: any[] = data.graphJSONData.nodes;
        let edges: any[] = data.graphJSONData.edges;
        let allQueryArray: string[] = [];
        nodes.forEach(async (obj: any) => {
            let name: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + obj.id;
            name = name.replace(".", "");
            switch (obj.type) {
                case 'start':
                    let labelstart: string = obj.data.label[1].replace(" ", "");
                    let type: string = obj.type;
                    let query: string = `CREATE (${name}:Node {title:'${name}',type:'${type}',name:'${labelstart}'})`;
                    allQueryArray.push(query)
                    break;
                case 'dataMap':
                    let label: string = ''
                    if (typeof obj.data.label !== 'string') {
                        label = obj.data.label[0]
                    } else {
                        label = obj.data.label;
                    }
                    let Type: string = obj.type;
                    let parent: string = obj.parentNode;
                    let Dataquery: string = `CREATE (${name}:Node {title: '${name}',type:'${Type}',name:'${label}',parent:'${parent}'})`;
                    allQueryArray.push(Dataquery);
                    break;
                case 'exportMap':
                    let labelexp: string = ''
                    if (typeof obj.data.label !== 'string') {
                        labelexp = obj.data.label[0]
                    } else {
                        labelexp = obj.data.label;
                    }
                    let Typeexp: string = obj.type;
                    let parentexp: string = obj.parentNode;
                    let Dataqueryexp: string = `CREATE (${name}:Node {title: '${name}',type:'${Typeexp}',name:'${labelexp}',parent:'${parentexp}'})`;
                    allQueryArray.push(Dataqueryexp);
                    break;
                case 'targetMap':
                    let labelTarget: string = obj.data.label;
                    if (typeof obj.data.label !== 'string') {
                        labelTarget = obj.data.label[0]
                    } else {
                        labelTarget = obj.data.label;
                    }
                    let TypeTarget: string = obj.type;
                    let parentTarget: string = obj.parentNode;
                    let DataqueryTarget: string = `CREATE (${name}:Node {title: '${name}',type:'${TypeTarget}',name:'${labelTarget}',parent:'${parentTarget}'})`;
                    allQueryArray.push(DataqueryTarget);
                    break;
                case 'parentMap':
                    let labelparent: string = obj.data.label;
                    let parenttype: string = obj.type;
                    let parentQuery: string = `CREATE (${name}:Node {title: '${name}',type:'${parenttype}',name:'${labelparent}'})`;
                    allQueryArray.push(parentQuery);
                    break;
                case 'exportParent':
                    let labelparentexp: string = obj.data.label;
                    let parenttypeexp: string = obj.type;
                    let parentQueryexp: string = `CREATE (${name}:Node {title: '${name}',type:'${parenttypeexp}',name:'${labelparentexp}'})`;
                    allQueryArray.push(parentQueryexp);
                    break;
                case 'condition':
                    let condition: string = obj.data.condition === 'All conditions are met' ? 'ALL' : 'ANY';
                    let condtype: string = obj.type;
                    let conditionQuery: string = `CREATE (${name}:Node {title: '${name}', type:'${condtype}',name: '${condition}'})`;
                    allQueryArray.push(conditionQuery);
                    break;
                case 'end':
                    let endtype: string = obj.type;
                    let labelEnd: string = obj.data.label[1].replace(" ", "");
                    let endQuery: string = `CREATE (${name}:Node {title: '${name}',type:'${endtype}',name: '${labelEnd}'})`;
                    allQueryArray.push(endQuery);
                    break;
                default:
                    break;
            }
        });

        nodes.forEach((node: any) => {
            if (node.type == 'condition') {
                let name: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.id;
                name = name.replace(".", "");
                let arrayQuery: any[] = [];
                let finalCondition: any[] = [];
                node.data.actions.forEach((action: any) => {
                    let actionname: string = 'Condition_' + Math.random().toString(36).slice(-10);
                    let queryArr: string = `(${name})-[:CONDITION_OF]->(${actionname})`;
                    finalCondition.push(queryArr);
                    let query: string = `CREATE (${actionname}:Condition {title: '${name}', type: '${node.type}',name: '${action.name}',value: ${action.value},option:'${action.option}'})`;
                    arrayQuery.push(query);
                })
                let finalQueryArray: string = 'CREATE' + finalCondition.join(',\n');
                allQueryArray.push(...arrayQuery);
                allQueryArray.push(finalQueryArray);
            }
        })

        let edgeQueryArr: any[] = [];
        edges.forEach((edge) => {
            let sourceName: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + edge.source;
            sourceName = sourceName.replace(".", "");
            let targetName: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + edge.target;
            targetName = targetName.replace(".", "")
            let edgeQuery = `(${sourceName})-[:DEPENDS_ON]->(${targetName})`;
            edgeQueryArr.push(edgeQuery);
        });

        if (edgeQueryArr.length != 0) {
            const allQuery: string = 'CREATE ' + edgeQueryArr.join(',\n');
            allQueryArray.push(allQuery);

        }
        let edgeQueryArray: any[] = [];
        nodes.forEach((node) => {
            if (node.type == 'dataMap') {
                let name: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.id;
                name = name.replace(".", "");
                let item: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.parentNode;
                item = item.replace(".", "");
                let relationQuery = `(${item})-[:PARENT_OF]->(${name})`;
                edgeQueryArray.push(relationQuery);
            } else if (node.type == 'targetMap') {
                let name: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.id;
                name = name.replace(".", "");
                let item: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.parentNode;
                item = item.replace(".", "");
                let relationQuery = `(${item})-[:PARENT_OF]->(${name})`;
                edgeQueryArray.push(relationQuery);
            } else if (node.type == 'exportMap') {
                let name: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.id;
                name = name.replace(".", "");
                let item: string = workFlowname.workFlowName.replaceAll(" ", "") + '_' + node.parentNode;
                item = item.replace(".", "");
                let relationQuery = `(${item})-[:PARENT_OF]->(${name})`;
                edgeQueryArray.push(relationQuery);
            }
        })
        if (edgeQueryArray.length != 0) {
            const allQuerys: string = 'CREATE ' + edgeQueryArray.join(',\n');
            allQueryArray.push(allQuerys);
        }

        const query: string = allQueryArray.join("\n").concat("\n");
        await session.run(query);
        return 'Saved Successfully';
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const clearGraphDB = async (name: string): Promise<string> => {
    const session: Session = driver.session();
    try {
        let allQuery: any[] = [`MATCH (n:Node) WHERE n.title STARTS WITH '${name}' DETACH DELETE n`, `MATCH (m:Condition) WHERE m.title STARTS WITH '${name}' DETACH DELETE m`];
        const query = allQuery.join(" WITH 1 AS dummy\n").concat("\n");
        await session.run(query);
        return 'Done';
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}
