import express, { Request, Response, Application } from 'express';
import {
    CheckPermissionModule,
    DBDateFormatModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponse, GenerateUnauthorizedResponse, StoreIdObject
} from "../../modules/common.modules";
import { StatusCodes } from 'http-status-codes';
import { RunAnyQuery, SelectQueryModule } from "../../modules/crud.modules";
import { dbCon } from "../../modules/db.modules";
import { CheckRequiredValidation } from "../../modules/validator.modules";

// Import the string extensions
require('../../extensions/stringExtensions');
require('dotenv').config({ path: './.env' });
const app: Application = express();
const formData = require('express-form-data');
const os = require("os");
const cors = require('cors');
app.use(cors());
app.use(formData.parse({
    uploadDir: os.tmpdir(),
    autoClean: true
}));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());
const ApiAuth = require("../../../lib/auth");
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
require('events').EventEmitter.defaultMaxListeners = 15;

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});
const streamToPromise = (stream: any) =>
    new Promise((resolve, reject) => {
        const chunks: any = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });

// Import Store Items Directly From s3 Bucket - Start
app.get("/", (req: Request, res: Response): any => {
    let User = req.body.user;
    let ObjectKey: any = req.query.object_key as string;
    let Store: any = '';
    let StoreId: any = "";
    let Lang: string = '';
    // let TotalRecords: number = 0;
    // let TotalInserted: number = 0;
    // let TotalUpdated: number = 0;
    let storeAisle: any = [];
    let StoreSkuArr: string[] = [];

    const ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Object key', value: ObjectKey, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        } else {
            ObjectKey = ObjectKey.split('/');
            if (typeof ObjectKey[2] === 'undefined') {
                // does not exist
                return GenerateBadRequestResponse(res, 'Invalid object key');
            } else {
                if (ObjectKey[2].includes('_') && ObjectKey[2].includes('.json')) {
                    Store = ObjectKey[2].substring(0, ObjectKey[2].indexOf('_'));
                    Lang = ObjectKey[2].substring((ObjectKey[2].indexOf('_') + 1), ObjectKey[2].indexOf('.'));
                    StoreId = StoreIdObject[Store];
                    FetchStoreAisleData();
                } else {
                    return GenerateBadRequestResponse(res, 'Invalid object key');
                }
            }
        }
    };

    const FetchStoreAisleData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'store_aisles', '*', null, null, null, null, []);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        storeAisle = data.data;
        GetStoreSku();
    };

    const GetStoreSku = async (): Promise<any> => {
        /* Get All Store SKUs */
        let data: any = await SelectQueryModule(dbCon, `stores_items`, 'sku', `storeId = ${StoreId}`, null, null, null, []);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        for (let i = 0; i < data.data.length; i++) {
            StoreSkuArr.push(data.data[i].sku);
        }
        MainProcess();
    };

    const MainProcess = async (): Promise<any> => {
        const params = {
            Bucket: process.env.AWS_BUCKET,
            Key: `${ObjectKey[0]}/${ObjectKey[1]}/${ObjectKey[2]}`,
        };
        const data = await s3Client.send(new GetObjectCommand(params));
        const body = await streamToPromise(data.Body).then((data: any) => data.toString('utf-8'));
        const _JSONData = JSON.parse(body);
        let updateResult: any = [];
        let addResult: any = [];
        // TotalRecords = _JSONData.length;
        for (let CurrentIndex = 0; CurrentIndex < _JSONData.length; CurrentIndex++) {
            if (StoreSkuArr.indexOf(_JSONData[CurrentIndex]['Sku']) !== -1) {
                // Update
                // TotalUpdated++;
                updateResult = await Update(_JSONData[CurrentIndex], _JSONData[CurrentIndex]['Sku']);
                if (!updateResult.status) {
                    // return GenerateErrorResponse(res, updateResult.message);
                    console.log(updateResult.message);
                }
            } else {
                // Insert
                // TotalInserted++;
                addResult = await Insert(_JSONData[CurrentIndex]);
            }
        }
        Response();
    };

    const Insert = async (Values: any): Promise<any> => {
        let Category: any = Values['Category'] ? Values['Category'].removeSpecialCharactersFromNormalString() : null;
        let Aisle: any = Values['Aisle'] ? Values['Aisle'].removeSpecialCharactersFromNormalString() : null;
        let SubCategory: any = Values['Sub Category'] ? Values['Sub Category'].removeSpecialCharactersFromNormalString() : null;
        let Brand: any = Values['Brand'] ? Values['Brand'].removeSpecialCharactersFromNormalString() : null;
        let Url: any = Values['Url'] ? Values['Url'].removeSpecialCharactersFromURL() : null;
        let Image: any = Values['Image'] ? Values['Image'].removeSpecialCharactersFromURL() : null;
        let SizeLabel: any = Values['Size Label'] ? Values['Size Label'].removeSpecialCharactersFromNormalString() : null;
        let Size: any = Values['Size'] ? Values['Size'].toString().removeSpecialCharactersFromNormalString() : null;
        let RegularPrice: any = (Values['Regular Price'] == '' || Values['Regular Price'] == 'None' || Values['Regular Price'] == null || Values['Regular Price'] == 'NaN') ? 0 : parseFloat(Values['Regular Price']);
        let SalePrice: any = (Values['Sale Price'] == '' || Values['Sale Price'] == 'None' || Values['Sale Price'] == null || Values['Sale Price'] == 'NaN') ? 0 : parseFloat(Values['Sale Price']);
        let NameTitle: any = '';
        let NameValue: any = '';
        if (Lang == "en") {
            NameTitle = "name";
            NameValue = Values['Name'] ? Values['Name'] : Values['English Name'];
        } else {
            NameTitle = "french_name";
            NameValue = Values['Name'] ? Values['Name'] : Values['French Name'];
        }
        NameValue = NameValue ? NameValue.removeSpecialCharactersFromNormalString() : "";
        let sql = `INSERT INTO stores_items (storeId, aisle, category, subCategory, sku, ${NameTitle}, brand, regular_price, sale_price, image, url, size_label, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        let values = [
            StoreId,
            Aisle,
            Category,
            SubCategory,
            Values['Sku'],
            NameValue !== 'null' ? NameValue : null,
            Brand,
            RegularPrice !== 'null' ? RegularPrice : null,
            SalePrice !== 'null' ? SalePrice : null,
            Image !== 'null' ? Image : null,
            Url !== 'null' ? Url : null,
            SizeLabel !== 'null' ? SizeLabel : null,
            Size !== 'null' ? Size : null,
            DBDateFormatModule(),
            DBDateFormatModule()
        ];
        let data: any = await RunAnyQuery(sql, values);
        if (data.status) {
            StoreSkuArr.push(Values['Sku']);
            // Create New Eezly Item From Store Item
            let EezlyAisleId: any = await FindEezlyAisleId(Aisle);
            let insertEezlyItemResult: any = await InsertEezlyItem(data.data.insertId, Store, Values['Sku'], NameTitle, NameValue, Image, Brand, Size, EezlyAisleId);
            if (!insertEezlyItemResult.status) {
                // return GenerateErrorResponse(res, insertEezlyItemResult.message);
                console.log(insertEezlyItemResult.message);
            }
        } else {
            // return GenerateErrorResponse(res, data.message);
            console.log(data.message);
        }
    };

    const FindEezlyAisleId = (Aisle: any): any => {
        let EezlyAisleId: any = null;
        for (let aisle_index = 0; aisle_index < storeAisle.length; aisle_index++) {
            if ((Aisle == storeAisle[aisle_index].name) && (StoreId == storeAisle[aisle_index].store_id)) {
                EezlyAisleId = storeAisle[aisle_index].eezly_aisle_id;
                break;
            }
        }
        return EezlyAisleId;
    };

    const InsertEezlyItem = async (RecordId: any, Store: any, Sku: any, NameTitle: any, Name: any, Thumbnail: any, Brand: any, Size: any, EezlyAisleId: any): Promise<any> => {
        let groceryItemListArray: any = [{
            store_id: StoreId,
            store_name: Store,
            store_item: Sku,
        }];
        NameTitle = (NameTitle == 'name') ? 'name' : 'name_fr';
        let sql = `INSERT INTO eezly_items (${NameTitle}, thumbnail, brand, size, eezly_aisle_id, grocery_items) VALUES (?, ?, ?, ?, ?, ?)`;
        let values = [
            Name,
            Thumbnail,
            Brand !== 'null' ? Brand : null,
            Size !== 'null' ? Size : null,
            EezlyAisleId !== 'null' ? EezlyAisleId : null,
            JSON.stringify(groceryItemListArray)
        ];
        return await RunAnyQuery(sql, values);
    };

    const Update = async (Values: any, Sku: string): Promise<any> => {
        let Category: any = Values['Category'] ? Values['Category'].removeSpecialCharactersFromNormalString() : null;
        let Aisle: any = Values['Aisle'] ? Values['Aisle'].removeSpecialCharactersFromNormalString() : null;
        let SubCategory: any = Values['Sub Category'] ? Values['Sub Category'].removeSpecialCharactersFromNormalString() : null;
        let Brand: any = Values['Brand'] ? Values['Brand'].removeSpecialCharactersFromNormalString() : null;
        let Url: any = Values['Url'] ? Values['Url'].removeSpecialCharactersFromURL() : null;
        let Image: any = Values['Image'] ? Values['Image'].removeSpecialCharactersFromURL() : null;
        let SizeLabel: any = Values['Size Label'] ? Values['Size Label'].removeSpecialCharactersFromNormalString() : null;
        let Size: any = Values['Size'] ? Values['Size'].toString().removeSpecialCharactersFromNormalString() : null;
        let RegularPrice: any = (Values['Regular Price'] == '' || Values['Regular Price'] == 'None' || Values['Regular Price'] == null || Values['Regular Price'] == 'NaN') ? 0 : parseFloat(Values['Regular Price']);
        let SalePrice: any = (Values['Sale Price'] == '' || Values['Sale Price'] == 'None' || Values['Sale Price'] == null || Values['Sale Price'] == 'NaN') ? 0 : parseFloat(Values['Sale Price']);
        let NameTitle: any = "";
        let NameValue: any = "";
        if (Lang == "en") {
            NameTitle = "name";
            NameValue = Values['Name'] ? Values['Name'] : Values['English Name'];
        } else {
            NameTitle = "french_name";
            NameValue = Values['Name'] ? Values['Name'] : Values['French Name'];
        }
        NameValue = NameValue ? NameValue.removeSpecialCharactersFromNormalString() : "";
        Brand = Brand ? Brand.removeSpecialCharactersFromNormalString() : "";
        let sql = `UPDATE stores_items SET aisle = ?, category = ?, subCategory = ?, ${NameTitle} = ?, brand = ?, regular_price = ?, sale_price = ?, image = ?, url = ?, size_label = ?, size = ?, updated_at = ? WHERE sku = ? AND storeId = ?`;
        let values = [
            Aisle !== 'null' ? Aisle : null,
            Category !== 'null' ? Category : null,
            SubCategory !== 'null' ? SubCategory : null,
            NameValue !== 'null' ? NameValue : null,
            Brand !== 'null' ? Brand : null,
            RegularPrice !== 'null' ? RegularPrice : null,
            SalePrice !== 'null' ? SalePrice : null,
            Image !== 'null' ? Image : null,
            Url !== 'null' ? Url : null,
            SizeLabel !== 'null' ? SizeLabel : null,
            Size !== 'null' ? Size : null,
            DBDateFormatModule(),
            Sku,
            StoreId
        ];
        return await RunAnyQuery(sql, values);
    };

    const Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            message: 'Records updated successfully'
            // total_records: TotalRecords,
            // total_inserted: TotalInserted,
            // total_updated: TotalUpdated,
        });
    };

    /* Start */
    ValidationStep1();
});
// Import Store Items Directly From s3 Bucket - End

// Migrate Store Data - Start
app.post("/migrate-store-data", ApiAuth, async (req: Request, res: Response) => {
    let User: any = req.body.user;
    let StoreId = req.body.store_id;
    /* Check for user role permission */
    let permission: any = await CheckPermissionModule(User.role_id, 'create_eezly_item');
    if (permission.status) {
        let validation: any = await CheckRequiredValidation([{ field: 'Store id', value: StoreId, type: 'Empty' }]);
        if (!validation.status) {
            return GenerateBadRequestResponse(res, validation.message);
        }
        let store: any = await SelectQueryModule(dbCon, 'stores', 'name', `id = ?`, null, null, null, [StoreId]);
        if (store.status) {
            if (store.data.length === 0) {
                return GenerateBadRequestResponse(res, 'Store not found');
            } else {
                let insertData: any = await RunAnyQuery(`INSERT INTO stores_items (storeId, sku , category, aisle, subCategory, regular_price, sale_price, brand, url, image, size_label, size, name, french_name, created_at, updated_at) SELECT ?, sku , category, aisle, subCategory, regular_price, sale_price, brand, url, image, size_label, size, name, french_name, created_at, updated_at from ${store.data[0].name}_items`, [StoreId]);
                if (insertData.status) {
                    return GenerateSuccessResponse(res, 'Data inserted successfully');
                } else {
                    return GenerateErrorResponse(res, insertData.message);
                }
            }
        } else {
            return GenerateErrorResponse(res, store.message);
        }
    } else {
        return GenerateUnauthorizedResponse(res, 'Permissions denied');
    }
});
// Migrate Store Data - End

// Migrate Store Data - Start
app.post("/save-items-store-ids", ApiAuth, async (req: Request, res: Response) => {
    let User: any = req.body.user;
    let startRecord: any = req.body.start ? req.body.start : 0;
    let numberOfRecords: any = req.body.numberOfRecords ? req.body.numberOfRecords : 1000;
    /* Check for user role permission */
    let permission: any = await CheckPermissionModule(User.role_id, 'create_eezly_item');
    if (permission.status) {
        let itemsTableData: any = await SelectQueryModule(dbCon, 'eezly_items', 'id,name,grocery_items', null, null, null, ` limit ${startRecord},${numberOfRecords}`, []);
        if (itemsTableData.status) {
            if (itemsTableData.data.length === 0) {
                return GenerateBadRequestResponse(res, 'Data not found');
            } else {
                const promises = itemsTableData.data.map(async (row: any, index: any, arr: any) => {
                    let temp = JSON.parse(row.grocery_items);
                    let conditions: any = [];
                    for (let index = 0; index < temp.length; index++) {
                        conditions.push(`select id from stores_items where (sku = '${temp[index].store_item}' AND storeId = ${temp[index].store_id})`)
                    }
                    let finalCondition = conditions.join(" ; ")
                    let sql = finalCondition;
                    const d: any = await RunAnyQuery(sql, []).then((data: any) => {
                        if (!data.status) {
                            return new Promise((resolve, reject) => {
                                return resolve({
                                    data: []
                                })
                            });
                        } else {

                            if (data.data.length == 1) {
                                return new Promise((resolve, reject) => {
                                    return resolve({
                                        store_item_id: data.data[0].id,
                                        eezly_item_id: row.id,
                                    });
                                });
                            } else {
                                let dataToSend: any = [];
                                for (let i = 0; i < data.data.length; i++) {
                                    dataToSend.push({
                                        store_item_id: data.data[i][0].id,
                                        eezly_item_id: row.id
                                    });

                                }
                                return new Promise((resolve, reject) => {
                                    return resolve(dataToSend);
                                });

                            }
                        }
                    });
                    return d;

                });
                await Promise.all(promises).then(async (data: any) => {
                    let conditionalValues: any = [];
                    for (let i = 0; i < data.length; i++) {
                        console.log(data[i]);
                        if (Array.isArray(data[i])) {
                            for (let j = 0; j < data[i].length; j++) {
                                conditionalValues.push(`(${data[i][j].eezly_item_id},${data[i][j].store_item_id})`);
                            }
                        } else {
                            conditionalValues.push(`(${data[i].eezly_item_id},${data[i].store_item_id})`);
                        }
                    }
                    let insertCondition = conditionalValues.join(',');
                    let sqlInsert = `Insert into eezly_items_grocery_items_list (eezly_item_id,store_item_id) VALUES ${insertCondition}`;
                    await RunAnyQuery(sqlInsert, []).then((data: any) => {
                        if (data.status) {
                            return GenerateSuccessResponse(res, "Data saved successfully!");
                        } else {
                            return GenerateBadRequestResponse(res, data.message);
                        }
                    })
                });
            }
        } else {
            return GenerateErrorResponse(res, itemsTableData.message);
        }
    } else {
        return GenerateUnauthorizedResponse(res, 'Permissions denied');
    }
});
// Migrate Store Data - End

module.exports = app;
