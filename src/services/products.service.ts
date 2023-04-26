import neo4j, { Driver, Session } from 'neo4j-driver';
import envConfig from '../config/env.config';
import { pino, Logger } from 'pino';
import PinoPretty from 'pino-pretty';
import { v4 as uuidv4 } from 'uuid';
import * as papaparse from 'papaparse';
import * as XLSX from 'xlsx';
import * as fs from 'fs-extra';
import * as path from 'path';

const logger: Logger = pino(PinoPretty({
    colorize: true,
    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
    mkdir: true
}));

const driver: Driver = neo4j.driver(envConfig.Neo4j_URI, neo4j.auth.basic(envConfig.UserName, envConfig.Password));

export const ImportProductsToGraph = async (filename: string, workflowname: string): Promise<any> => {
    try {
        let file: string = filename.split('.csv')[0];
        let RelationArray: any[] = [];
        let parentArray: string[] = ['source', 'target'];
        for (let index: number = 0; index < parentArray.length; index++) {
            let result: any = await GetChildRecords(parentArray[index], workflowname);
            RelationArray.push(...result);
        }
        let Conditions: any = await GetConditionRecords(workflowname);
        let Dependencies: any = await GetDependencyRecords(workflowname);
        if (Dependencies.length > 0) {
            let finalResult: any = await ImportProducts(filename, Conditions, Dependencies);
            let dataToSave: any = await ConvertProducts(finalResult);
            if (dataToSave == 'Data Empty') {
                return 'No single product passed the validation'
            } else {
                let savedproducts: string = await SaveProductsInGraph(dataToSave, file);
                return savedproducts;
            }
        } else {
            return 'No Mapping available to import';
        }
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        let path: string = `./uploads/${filename}`;
        fs.unlinkSync(path);
    }
}

export const downloadProducts = async (flow: any): Promise<any> => {
    try {
        let name: string = flow.name.replaceAll(" ","");
        const keymapping: any = {
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
        }
        let depends: any = await GetExportDependency(name);
        let keyobject: any = {};
        depends.forEach((obj: any) => {
            let item: any = obj._fields[0];
            keyobject[item.start.properties.name] = item.end.properties.name;
        });
        let products: any[] = await getAllProducts();
        let finalProductArr: any[] = [];
        for (let proIndex: number = 0; proIndex < products.length; proIndex++) {
            let object: any = {};
            let product: any = products[proIndex]._fields[0];
            let skus: any[] = await getAllSkus(product.properties);
            let categories: any[] = await getProductCategories(product.properties);
            let productcategories: any[] = await Setcategories(categories);
            for (let categIndex: number = 0; categIndex < productcategories.length; categIndex++) {
                let index: number = categIndex + 1;
                object['CategoryName_' + index] = productcategories[categIndex];
            }
            for (let skuIndex: number = 0; skuIndex < skus.length; skuIndex++) {
                object = { ...object, ...product.properties };
                let sku: any = skus[skuIndex]._fields[0];
                let keys: any[] = Object.keys(sku.properties);
                keys.forEach((key) => {
                    if (key != 'Code') {
                        if (key == 'Name') {
                            object['SupplierSKUID'] = sku.properties['Name'];
                        } else if (key == 'SKUCode') {
                            object['ManufacturerSKUID'] = sku.properties['SKUCode'];
                        } else {
                            object[key] = sku.properties[key];
                        }
                    }
                })
                let options: any[] = await getAllOptions(sku.properties);
                for (let optionIndex: number = 0; optionIndex < options.length; optionIndex++) {
                    let option: any = options[optionIndex]._fields[0];
                    let keys: any[] = Object.keys(option.properties);
                    object[option.properties['Name']] = option.properties['Value'];
                    keys.forEach((key) => {
                        if (key == 'SwatchImage') {
                            object['SwatchImage'] = option.properties[key];
                        }
                    })
                }
                finalProductArr.push(object);
            }
        }
        let allArr: any[] = [];
        finalProductArr.forEach(obj => {
            const convertedObj = Object.keys(obj).reduce((acc, key) => {
                const newKey = keymapping[key] || key;
                return Object.assign(acc, { [newKey]: obj[key] });
            }, {});
            allArr.push(convertedObj);
        })
        let finalArr: any[] = [];
        allArr.forEach(item => {
            const convertedObj = Object.keys(item).reduce((acc, key) => {
                const newKey = keyobject[key] || key;
                return Object.assign(acc, { [newKey]: item[key] });
            }, {});
            finalArr.push(convertedObj);
        })

        let findType: any = await findFormat(name);
        if (findType[0]._fields[0].properties.name === 'CSV') {
            let csv: any = papaparse.unparse(finalArr);
            let obj: any = {
                type:'csv',
                data: csv
            }
            return obj;
        } else {
            const worksheet: any = XLSX.utils.json_to_sheet(finalArr);
            const workbook: any = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            const filePath: string = './uploads/data.xlsx';
            XLSX.writeFile(workbook, filePath);
            const fileSync: any = fs.readFileSync(filePath);
            let obj: any = {
                type:'xlsx',
                data:fileSync
            }
            return obj;
        }
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        if (fs.existsSync('./uploads/data.xlsx')) {
            fs.unlinkSync('./uploads/data.xlsx')
        }
    }
}

const findFormat = async (name: string) => {
    const session: Session = driver.session();
    try {
        let query: any = `MATCH (n:Node) WHERE n.title STARTS WITH '${name}' AND n.type = 'end' RETURN n`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const getAllSkus = async (product: any): Promise<any> => {
    const session: Session = driver.session();
    try {
        let query: any = `MATCH (n:Product)-[r:SKU_Of]->(m:Sku) WHERE n.Code = '${product.Code}' RETURN m`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const Setcategories = async (categories: any[]): Promise<any> => {
    try {
        let catArr: any[] = [];
        for (let indexCat: number = 0; indexCat < categories.length; indexCat++) {
            let category: any = categories[indexCat];
            let catString: any[] = [];
            let item: any[] = await getCategory(category, catString);
            item = item.reverse();
            let string: string = item.join('>');
            catArr.push(string);
        }
        return catArr;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const getCategory = async (category: any, array: any[]) => {
    try {
        let name: string = category._fields[0].properties.Name;
        let code: string = category._fields[0].properties.Code;
        array.push(name);
        let parentCat: any = await getParentCat(code);
        if (parentCat.length > 0) {
            await getCategory(parentCat[0], array);
        }
        return array;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const getParentCat = async (code: string): Promise<any> => {
    const session: Session = driver.session();
    try {
        let query: any = `MATCH (n:Category)-[r:Child_Of]->(m:Category) WHERE n.Code = '${code}'  RETURN m`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const getAllOptions = async (product: any): Promise<any> => {
    const session: Session = driver.session();
    try {
        let query: any = `MATCH (n:Sku)-[r:Option_Of]->(m:Option) WHERE m.Code = '${product.Code + '_' + product.Name}' RETURN m`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const getProductCategories = async (product: any): Promise<any> => {
    const session: Session = driver.session();
    try {
        let query: any = `MATCH (n:Category)-[r:Category_Of]->(m:Product) WHERE m.Code = '${product.Code}' RETURN n`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const getAllProducts = async (): Promise<any> => {
    const session: Session = driver.session();
    try {
        let query: string = `MATCH (n:Product) RETURN n`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
    } finally {
        await session.close();
    }
}

const GetExportDependency = async (name: string): Promise<any> => {
    const session: Session = driver.session();
    try {
        let query: string = `MATCH p=(n:Node)-[r:DEPENDS_ON]->()
        WHERE n.title STARTS WITH '${name}' AND (n.type = 'targetMap' OR n.type = 'exportMap')
        RETURN p`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const GetChildRecords = async (parent: string, name: string): Promise<any> => {
    const session: Session = driver.session();
    try {
        let nametoQuery: string = name + '_' + parent;
        let query: string = `MATCH (n:Node)-[r:PARENT_OF]->(m:Node)
            WHERE n.title = '${nametoQuery}'
            RETURN m`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const GetConditionRecords = async (name: string): Promise<any> => {
    const session: Session = driver.session();
    try {
        let queryname: string = name + '_';
        let query: string = `MATCH p=(n:Node)-[:CONDITION_OF]->(m:Condition) WHERE n.title STARTS WITH '${queryname}' RETURN p`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const GetDependencyRecords = async (name: string): Promise<any> => {
    const session: Session = driver.session();
    try {
        let queryname: string = name + '_';
        let query: string = `MATCH p=(n:Node)-[r:DEPENDS_ON]->()
            WHERE n.title STARTS WITH '${queryname}' AND (n.type = 'dataMap' OR n.type = 'condition')
            RETURN p`;
        let result: any = await session.run(query);
        return result.records;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const checkConditionValid = (condition: boolean, product: any, value: string, option: string): Promise<any> => {
    try {
        let finalValue: any = true;
        if (typeof product !== 'string') {
            value = JSON.parse(value)
        }
        switch (option) {
            case 'Equal To':
                let final1: boolean = product === value;
                if (condition) {
                    finalValue = finalValue && final1;
                } else {
                    finalValue = finalValue || final1;
                }
                break;
            case 'Not Equal To':
                let final2: boolean = product !== value;
                if (condition) {
                    finalValue = finalValue && final2;
                } else {
                    finalValue = finalValue || final2;
                }
                break;
            case 'Includes':
                let final3: boolean = product.includes(value);
                if (condition) {
                    finalValue = finalValue && final3;
                } else {
                    finalValue = finalValue || final3;
                }
                break;
            case 'Does Not Includes':
                let final4: boolean = !product.includes(value);
                if (condition) {
                    finalValue = finalValue && final4;
                } else {
                    finalValue = finalValue || final4;
                }
                break;
            case 'Starts With':
                let final5: boolean = product.startsWith(value);
                if (condition) {
                    finalValue = finalValue && final5;
                } else {
                    finalValue = finalValue || final5;
                }
                break;
            case 'Does Not Starts With':
                let final6: boolean = !product.startsWith(value);
                if (condition) {
                    finalValue = finalValue && final6;
                } else {
                    finalValue = finalValue || final6;
                }
                break;
            case 'Ends With':
                let final7: boolean = product.endsWith(value);
                if (condition) {
                    finalValue = finalValue && final7;
                } else {
                    finalValue = finalValue || final7;
                }
                break;
            case 'Does Not Ends With':
                let final8: boolean = !product.endsWith(value);
                if (condition) {
                    finalValue = finalValue && final8;
                } else {
                    finalValue = finalValue || final8;
                }
                break;
            case 'Empty':
                let final9: boolean = product === '';
                if (condition) {
                    finalValue = finalValue && final9;
                } else {
                    finalValue = finalValue || final9;
                }
                break;
            case 'Not Empty':
                let final10: boolean = product !== '';
                if (condition) {
                    finalValue = finalValue && final10;
                } else {
                    finalValue = finalValue || final10;
                }
                break;
            default:
                break;
        }

        return finalValue;

    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const ImportProducts = async (filename: string, condition: any[], dependecies: any[]): Promise<any> => {
    try {
        const filePath: string = `./uploads/${filename}`;
        let jsonData: any[] = [];
        if (filename.includes(".csv")) {
            const csvData: any = await fs.readFile(filePath, 'utf-8');
            jsonData = papaparse.parse(csvData, { header: true, dynamicTyping: true }).data;
        } else if (filename.includes('xlsx')) {
            const workbook: any = XLSX.readFile(filePath);
            const sheetName: any = workbook.SheetNames[0];
            const worksheet: any = workbook.Sheets[sheetName];

            // Convert the worksheet to a JSON object with key-value pairs of headers and values
            const options: any = { header: 1, defval: null, raw: false };
            const rows: any[] = XLSX.utils.sheet_to_json(worksheet, options);

            // Get the header row
            const headerRow: any[] = rows.shift();

            // Map each row to an object with key-value pairs of headers and values
            const data: any[] = rows.map((row) => {
                const rowData: any = {};
                headerRow.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });
            jsonData = data;
        }

        const newprodArr: any[] = [];
        jsonData.forEach((product) => {
            let object: any = {};
            let conditionType: boolean = true;
            let conditionPass: any[] = [];
            dependecies.forEach((depend) => {
                let item = depend._fields[0];
                if (item.start.properties.parent == 'source') {
                    if (item.end.properties.parent == 'target') {
                        if (!item.start.properties.name.startsWith('Category')) {
                            object[item.end.properties.name] = product[item.start.properties.name];
                        } else {
                            if (object[item.end.properties.name] == undefined) {
                                object[item.end.properties.name] = [product[item.start.properties.name]];
                            } else {
                                object[item.end.properties.name].push(product[item.start.properties.name]);
                            }
                        }
                    } else if (item.end.properties.type == 'condition') {
                        condition.forEach((obj) => {
                            let condObj = obj._fields[0];
                            conditionType = condObj.start.properties.name === 'ALL' ? true : false;
                            if (item.start.properties.name === condObj.end.properties.name) {
                                let inputCheck: any = product[item.start.properties.name];
                                let conditionSatisfies: any = checkConditionValid(conditionType, inputCheck, condObj.end.properties.value, condObj.end.properties.option);
                                conditionPass.push(conditionSatisfies);
                                if (conditionSatisfies) {
                                    let codIndex: any[] = dependecies.filter((obj) => obj._fields[0].start.properties.name === condObj.start.properties.name);
                                    let index: number = codIndex.findIndex((obj) => obj._fields[0].start.elementId === condObj.start.elementId);
                                    let itemToAdd: any = codIndex[index];
                                    object[itemToAdd._fields[0].end.properties.name] = product[item.start.properties.name];
                                }
                            }
                        })
                    }
                }
            })
            if (conditionPass.length > 0) {
                let finalValidtion: boolean = conditionPass.reduce((acc = conditionPass[0], i) => acc && i);
                if (finalValidtion) {
                    newprodArr.push(object);
                }
            } else {
                newprodArr.push(object);
            }
        })

        return newprodArr;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const ConvertProducts = async (products: any[]): Promise<any> => {
    try {
        let productsList: any[] = [];
        if (products.length != 0) {
            products.forEach((product) => {
                let obj: object = {
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
                }

                productsList.push(obj);
            })
            const groupByProductCode = (key: string, productArr: any[]) =>
                productArr.reduce((accumulator, product) => ({
                    ...accumulator,
                    [product[key]]:
                        product[key] in accumulator
                            ? accumulator[product[key]].concat(product.ProductSKUs)
                            : [product],
                }), {});

            const productsByCode: any[] = groupByProductCode('code', productsList);
            let productArr = [];
            for (let key in productsByCode) {
                let sku: any[] = productsByCode[key];
                for (let i: number = 1; i < sku.length; i++) {
                    let skucount: number = 0;
                    sku[0].ProductSKUs.forEach((obj: any) => {
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
        } else {
            return 'Data Empty';
        }
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const CheckProduct = async (products: any[]): Promise<any> => {
    try {
        for (let index: number = 0; index < products.length; index++) {
            let product: any = products[index];
            let query: string = `MATCH (n:Product) WHERE n.Code = '${product.code}' RETURN n`;
            const session: Session = driver.session();
            let result: any = await session.run(query);
            await session.close();
            if (result.records.length > 0) {
                let deleteQuery: string = `MATCH (n:Product)-[r]-(m:Sku)-[r2]-(p:Option) MATCH (n:Product)-[r3]-(c:Category)
                WHERE n.Code = '${product.code}'
                DETACH DELETE n,r,m,r2,p,r3`;
                const sess: Session = driver.session();
                await sess.run(deleteQuery);
                await sess.close();
            }
        }
        return 'Empty';
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const SaveProductsInGraph = async (products: any[], fileName: string): Promise<any> => {
    try {
        let check: any = await CheckProduct(products);
        if (check == 'Empty') {
            for (let productindex: number = 0; productindex < products.length; productindex++) {
                let allQuerys: string[] = [];
                let product: any = products[productindex];
                let skuQueries: string[] = [];
                let optionQueries: string[] = [];
                if (product.code != undefined) {
                    let productId: any = uuidv4();
                    productId = 'Pd' + productId.replaceAll('-', '_');
                    let query: string = `CREATE (${productId}:Product {Code:'${product.code}',Name:'${product.name}',Brand:'${product.brand}', Description: '${product.description.replaceAll("'", "\\'")}'})`;
                    allQuerys.push(query);
                    for (let skuIndex: number = 0; skuIndex < product.ProductSKUs.length; skuIndex++) {
                        let SKU: any = product.ProductSKUs[skuIndex];
                        let skuId: any = uuidv4();
                        skuId = 'Sk' + skuId.replaceAll('-', '_');
                        let skuQuery: string = `CREATE (${skuId}:Sku {Name:'${SKU.Supplier_SKU_ID}', Code: '${product.code}', SKUCode:'${SKU.Manufacturer_SKU_ID}',MSRP:'${SKU.MSRP}',MAP:'${SKU.MAP}',CostPrice:'${SKU.costPrice}',LargeImage:'${SKU.largeImage}',ThumbnailImage:'${SKU.thumbnailImage}'})`;
                        allQuerys.push(skuQuery);
                        let relationSKU: string = `(${productId})-[:SKU_Of]->(${skuId})`;
                        skuQueries.push(relationSKU);
                        for (let optionIndex: number = 0; optionIndex < SKU.SKUOptions.length; optionIndex++) {
                            let option: any = SKU.SKUOptions[optionIndex];
                            let optionId: any = uuidv4();
                            optionId = 'Op' + optionId.replaceAll('-', '_');
                            let optionQuery: string = '';
                            let optionRelation: string = '';
                            if (option.optionName == 'Color') {
                                optionQuery = `CREATE (${optionId}:Option {Name: '${option.optionName}', Code: '${product.code + '_' + SKU.Supplier_SKU_ID}', Value: '${option.optionValue}',SwatchImage: '${option.swatchImage}'})`;
                            } else {
                                optionQuery = `CREATE (${optionId}:Option {Name: '${option.optionName}', Code: '${product.code + '_' + SKU.Supplier_SKU_ID}', Value: '${option.optionvalue}'})`;
                            }
                            optionRelation = `(${skuId})-[:Option_Of]->(${optionId})`;
                            optionQueries.push(optionRelation);
                            allQuerys.push(optionQuery);
                        }
                    }
                    if (skuQueries.length > 0) {
                        let skuQ: string = 'CREATE ' + skuQueries.join(',\n');
                        allQuerys.push(skuQ);
                    }
                    if (optionQueries.length > 0) {
                        let optionQ: string = 'CREATE ' + optionQueries.join(',\n');
                        allQuerys.push(optionQ);
                    }

                    let catGrp: any = await SaveCategoriesInGraph(product, productId, allQuerys, fileName);
                    allQuerys.push(...catGrp.cateArr);
                    let done: any = await saveProductQuery(allQuerys);
                    for (let q: number = 0; q < catGrp.querys.length; q++) {
                        let finalQ: any = await savecategoryRelation(catGrp.querys[q], product.code)
                    }
                }
            }
        }
        return 'Products added';
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const SaveCategoriesInGraph = async (product: any, proId: string, querys: any[], fileName: string) => {
    try {
        let catObj: any = {};
        let catArr: any[] = [];
        let relArr: any[] = [];
        let finalQuery: any[] = [];
        let cat: any[] = product.categories;
        for (let catIndex: number = 0; catIndex < cat.length; catIndex++) {
            let obj: any = cat[catIndex];
            if (obj != null) {
                let item: any[] = obj.split('>');
                let mergeRequired: boolean = false;
                for (let subCatIndex: number = 0; subCatIndex < item.length; subCatIndex++) {
                    let category: any = item[subCatIndex];
                    let id: any = uuidv4();
                    id = 'Ct' + id.replaceAll("-", "_");
                    let result: any = await checkCategoryAvailable(category, item[subCatIndex - 1], fileName);
                    if (catObj[category] == undefined) {
                        if (result == 'Empty') {
                            catObj[category] = id;
                            let query: string = `CREATE (${id}:Category {Name: '${category}', Code:'${id}',File:'${fileName}'})`;
                            if (subCatIndex == 0) {
                                catArr.push(query);
                                // let query2: string = `(${id})-[:Category_Of]->(${proId})`;
                                // relArr.push(query2);
                            } else {
                                if (mergeRequired) {
                                    let mergeCat: string = `MERGE (${catObj[item[subCatIndex]]}:Category {Name: '${category}', Code:'${catObj[item[subCatIndex]]}', File:'${fileName}'}) WITH ${catObj[item[subCatIndex]]}
                                    MATCH (${catObj[item[subCatIndex - 1]]}:Category {Code:'${catObj[item[subCatIndex - 1]]}'})
                                    CREATE (${catObj[item[subCatIndex]]})-[:Child_Of]->(${catObj[item[subCatIndex - 1]]})`;
                                    let check: any = await checkingParentExists(mergeCat);
                                } else {
                                    catArr.push(query);
                                    let parentId1: string = catObj[item[subCatIndex - 1]];
                                    let condQuery: string = `(${id})-[:Child_Of]->(${parentId1})`;
                                    relArr.push(condQuery);
                                }
                            }
                        } else {
                            if (subCatIndex == 0) {
                                let oldId: any = result[0].properties.Code;
                                catObj[result[0].properties.Name] = result[0].properties.Code;
                                let mergeQuery: string = `MERGE (${oldId}:Category {Name:'${category}', Code:'${oldId}', File: '${fileName}'})`;
                                let index: number = querys.findIndex((obj) => obj === mergeQuery);
                                if (index == -1) {
                                    catArr.push(mergeQuery);
                                }
                                // let query: string = `(${oldId})-[:Category_Of]->(${proId})`;
                                // relArr.push(query);
                            } else {
                                if (result.length === 3) {
                                    catObj[result[2].properties.Name] = result[2].properties.Code;
                                    catObj[result[0].properties.Name] = result[0].properties.Code;
                                    mergeRequired = true;
                                }
                            }
                        }
                    }

                    if (subCatIndex == item.length - 1) {
                        let index: number = finalQuery.findIndex((ind) => ind === catObj[item[subCatIndex]]);
                        if (index == -1) {
                            finalQuery.push(catObj[item[subCatIndex]])
                        }
                    }
                }
            }
        }

        if (relArr.length > 0) {
            let skuQ: string = 'CREATE ' + relArr.join(',\n');
            catArr.push(skuQ);
        }
        let objFinal: any = {
            cateArr: catArr,
            querys: finalQuery
        }
        return objFinal;
    } catch (err: any) {
        logger.error(err.message);
        return err;
    }
}

const saveProductQuery = async (allQuerys: any[]) => {
    const session: Session = driver.session();
    try {
        let finalArray: any[] = [...new Set(allQuerys)];

        let query: string = finalArray.join('\n').concat('\n');
        await session.run(query);
        return 'Done';
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const savecategoryRelation = async (category: string, code: string) => {
    const session: Session = driver.session();
    try {
        let query: string = `MATCH (n1:Category {Code: '${category}'}), (n2: Product {Code:'${code}'})
        CREATE (n1)-[:Category_Of]->(n2)`;
        await session.run(query);
        return 'Done';
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const checkingParentExists = async (name: string) => {
    const session: Session = driver.session();
    try {
        let result: any = await session.run(name);
        if (result.records.length > 0) {
            return 'Exists';
        } else {
            return 'Empty';
        }
    } catch (err: any) {
        logger.error(err.message);
        return err;
    } finally {
        await session.close();
    }
}

const checkCategoryAvailable = async (name: string, parent: string, file: string) => {
    const session: Session = driver.session();
    try {
        let query: string = '';
        if (parent == undefined) {
            query = `MATCH (n:Category) WHERE n.Name = '${name}' AND n.File = '${file}' RETURN n`;
        } else {
            query = `MATCH (n:Category)-[r]-(m:Category) WHERE n.Name = '${name}' AND n.File = '${file}' AND m.File = '${file}' AND m.Name = '${parent}' RETURN n,r,m`;
        }
        let result: any = await session.run(query);
        if (result.records.length > 0) {
            let final: any = result.records[0]._fields;
            return final;
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
