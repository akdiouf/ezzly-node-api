import express, { Request, Response, Application } from 'express';
import {
    CheckPermissionModule, DBDateFormatModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponse, GetGeneralSettings, StoreIdObject, StoreNameObject
} from "../../modules/common.modules";
import { CheckRequiredValidation } from "../../modules/validator.modules";
import { RunAnyQuery, SelectQueryModule } from "../../modules/crud.modules";
import { dbCon } from "../../modules/db.modules";
import { StatusCodes } from 'http-status-codes';
import {compareSync} from "bcrypt";

require('dotenv').config({ path: './.env' });
const app: Application = express();
const formData = require('express-form-data');
const os = require("os");
const cors = require('cors');
const mysql = require('mysql');
const algoliasearch = require('algoliasearch');

app.use(cors());
app.use(formData.parse({
    uploadDir: os.tmpdir(),
    autoClean: true
}));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());
const ApiAuth = require("./../../../lib/auth");

// Import Eezly Items Script - Start
app.post("/importEezlyItems", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let Store: any = req.body.store;
    let Start: number = req.body.start;
    let Limit: number = 5000;
    let StoreId: number = StoreIdObject[Store];
    let EezlyAisleId: any = null;
    let storeAisle: any = null;
    let StoreItems: any = null;
    let EezlyItems: any = null;
    let eezly_items_array: any = [];
    let values: any = [];
    let Status: any = 0;

    let Step1 = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'create_eezly_item');
        if (!data.status) {
            return GenerateBadRequestResponse(res, 'Permission denied');
        } else {
            /* Get Eezly Items Data */
            let eezlyItemsData: any = await SelectQueryModule(dbCon, 'eezly_items', '*', null, null, null, null, []);
            if (!eezlyItemsData.status) {
                return GenerateErrorResponse(res, eezlyItemsData.message);
            } else {
                EezlyItems = eezlyItemsData.data;
                /* Get Store Aisles Data */
                let storeAisleData: any = await SelectQueryModule(dbCon, 'store_aisles', '*', null, null, null, null, []);
                if (!storeAisleData.status) {
                    return GenerateErrorResponse(res, storeAisleData.message);
                } else {
                    storeAisle = storeAisleData.data;
                    /* Get Store Items Data */
                    let storeItemsData: any = await SelectQueryModule(dbCon, 'stores_items', '*', `storeId = ?`, null, null, ` LIMIT ? OFFSET ${Start}`, [StoreId, Limit]);
                    if (!storeItemsData.status) {
                        return GenerateErrorResponse(res, storeItemsData.message);
                    }
                    StoreItems = storeItemsData.data;
                    GenerateEezlyItemsArray();
                }
            }
        }
    };

    let GenerateEezlyItemsArray = (): any => {
        for (let store_item = 0; store_item < StoreItems.length; store_item++) {
            Status = 0;
            // check if store item eezly item already exists or not
            for (let eezly_item = 0; eezly_item < EezlyItems.length; eezly_item++) {
                let EGroceryItems = JSON.parse(EezlyItems[eezly_item].grocery_items);
                for (let i = 0; i < EGroceryItems.length; i++) {
                    if (EGroceryItems[i].store_id == StoreId && EGroceryItems[i].store_name == Store && EGroceryItems[i].store_item == StoreItems[store_item].sku) {
                        // eezly item exists
                        Status = 1;
                        break;
                    }
                }
                if (Status === 1) {
                    break;
                }
            }
            // If store item eezly item not found then create new eezly item
            if (Status === 0) {
                let groceryItemListArray: any = [];
                let groceryItemListSubArray: any = {
                    store_id: StoreId,
                    store_name: Store,
                    store_item: StoreItems[store_item].sku,
                };
                groceryItemListArray.push(groceryItemListSubArray);
                EezlyAisleId = null;
                // Get Eezly Aisle Id
                for (let aisle_index = 0; aisle_index < storeAisle.length; aisle_index++) {
                    if ((StoreItems[store_item].aisle === storeAisle[aisle_index].name) && (StoreId === storeAisle[aisle_index].store_id)) {
                        EezlyAisleId = storeAisle[aisle_index].eezly_aisle_id;
                        break;
                    }
                }
                let sub_array: any = {
                    name: StoreItems[store_item].name,
                    name_fr: (StoreItems[store_item].french_name !== '' && StoreItems[store_item].french_name !== null) ? StoreItems[store_item].french_name.normalize("NFD").removeAccents().removeSpecialCharactersFromNormalString() : null,
                    thumbnail: StoreItems[store_item].image,
                    brand: StoreItems[store_item].brand,
                    size: StoreItems[store_item].size,
                    eezly_aisle_id: EezlyAisleId,
                    grocery_items: JSON.stringify(groceryItemListArray),
                    created_by: 1
                };
                eezly_items_array.push(sub_array);
            }
        }
        ConvertArray();
    };

    let ConvertArray = (): any => {
        values = eezly_items_array.reduce((o: any, a: any) => {
            let ini = [];
            ini.push(a.name);
            ini.push(a.name_fr);
            ini.push(a.thumbnail);
            ini.push(a.brand);
            ini.push(a.size);
            ini.push(a.eezly_aisle_id);
            ini.push(a.grocery_items);
            ini.push(a.created_by);
            o.push(ini);
            return o
        }, []);
        StoreData();
    };
    let StoreData = (): any => {
        if (values.length > 0) {
            let sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id , grocery_items, created_by) VALUE ?`;
            dbCon.query(sql, [values], async (err: Error, result: any) => {
                if (err) {
                    return GenerateErrorResponse(res, err.message);
                }
                Response();
            });
        } else {
            Response();
        }
    };
    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            message: 'Record added successfully',
            totalRecordInserted: values.length
        });
    };

    /* Start */
    Step1();
});

// Import Eezly Items Script - End

// Update Eezly Items Script - Start
app.post("/updateImportEezlyItems", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let Store: any = req.body.store;
    let Start: number = req.body.start;
    let Limit: number = 2000;
    let StoreId: number = StoreIdObject[Store];
    let StoreItems: any = null;
    let EezlyItems: any = null;
    let eezly_items_array: any = [];
    let SettingsData: any = null;
    let Status: any = 0;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'modify_eezly_items');
        if (!data.status) {
            return GenerateBadRequestResponse(res, 'Permission denied');
        } else {
            /* Get Settings */
            let setting:any = await GetGeneralSettings();
            if (!setting.status) {
                return GenerateErrorResponse(res, setting.message);
            } else {
                SettingsData = setting.data;
                /* Get Eezly Items */
                let eezlyItemsData: any = await SelectQueryModule(dbCon, 'eezly_items', '*', null, null, null, null, []);
                if (!eezlyItemsData.status) {
                    return GenerateErrorResponse(res, eezlyItemsData.message);
                } else {
                    EezlyItems = eezlyItemsData.data;
                    /* Get Store Items */
                    let storeItemsData: any = await SelectQueryModule(dbCon, 'stores_items', '*', `storeId = ?`, null, null, ` LIMIT ? OFFSET ${Start}`, [StoreId, Limit]);
                    if (!storeItemsData.status) {
                        return GenerateErrorResponse(res, storeItemsData.message);
                    }
                    StoreItems = storeItemsData.data;
                    FindEezlyItem();
                }
            }
        }
    };

    let FindEezlyItem = async (): Promise<any> => {
        for (let store_item = 0; store_item < StoreItems.length; store_item++) {
            Status = 0;
            for (let eezly_item = 0; eezly_item < EezlyItems.length; eezly_item++) {
                let EGroceryItems = JSON.parse(EezlyItems[eezly_item].grocery_items);
                for (let i = 0; i < EGroceryItems.length; i++) {
                    if (EGroceryItems[i].store_id == StoreId && EGroceryItems[i].store_name == Store && EGroceryItems[i].store_item == StoreItems[store_item].sku) {
                        if (StoreItems[store_item].french_name !== '' && StoreItems[store_item].french_name != null && (StoreItems[store_item].name === EezlyItems[eezly_item].name)) {
                            let sub_array: any = {
                                id: EezlyItems[eezly_item].id,
                                name_fr: StoreItems[store_item].french_name.normalize("NFD").removeAccents().removeSpecialCharactersFromNormalString(),
                                brand: EezlyItems[eezly_item].brand,
                                listed: EezlyItems[eezly_item].listed,
                                size: EezlyItems[eezly_item].size,
                                thumbnail: EezlyItems[eezly_item].thumbnail
                            };
                            eezly_items_array.push(sub_array);
                        }
                        Status = 1;
                        break;
                    }
                }
                if (Status === 1) {
                    break;
                }
            }
        }
        /* Update Record */
        for (let i = 0; i < eezly_items_array.length; i++) {
            await Update(i);
        }
        Response();
    };

    let Update = (counter: any): any => {
        let sql = `UPDATE eezly_items SET name_fr = "${eezly_items_array[counter].name_fr}", updated_at = '${DBDateFormatModule()}' WHERE id = '${eezly_items_array[counter].id}'`;
        dbCon.query(sql, async (err: Error, result: any) => {
            if (err) {
                // return GenerateErrorResponse(res, err.message);
                console.log(err.message);
            }
            // Add record in algolia if listed = true
            if (eezly_items_array[counter].listed === 'true') {
                let algoliaData = {
                    "id": `${eezly_items_array[counter].id}`,
                    "name": eezly_items_array[counter].name_fr,
                    "brand": eezly_items_array[counter].brand,
                    "listed": "false",
                    "size": eezly_items_array[counter].size,
                    "thumbnail": eezly_items_array[counter].thumbnail,
                };
                await addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
            }
        });
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Record updated successfully');
    };

    /* Start */
    CheckRolePermission();
});

// Update Eezly Items Script - End

// Update Eezly Items Aisle - Start
app.post("/updateEezlyItemsAisle", ApiAuth, (req: Request, res: Response): any => {

    let User = req.body.user;
    let Start: number = req.body.start;
    let Limit: number = 10000;
    let EezlyItems: any = [];
    let GroceryItems: any = [];
    let StoreSkuList: any = [];
    let StoresItems: any = [];
    let whereCondition: any = '';

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'modify_eezly_items');
        if (!data.status) {
            return GenerateBadRequestResponse(res, 'Permission denied');
        } else {
            // Get Eezly Items
            let itemsData: any = await SelectQueryModule(dbCon, "eezly_items", "*", null, null, null, ` LIMIT ? OFFSET ${Start}`, [Limit]);
            if (!itemsData.status) {
                return GenerateBadRequestResponse(res, itemsData.message);
            }
            EezlyItems = itemsData.data;
            FindRelavantStoreRecords();
        }
    };

    let FindRelavantStoreRecords = (): any => {
        for (let i = 0; i < EezlyItems.length; i++) {
            GroceryItems = JSON.parse(EezlyItems[i].grocery_items);
            StoreSkuList.push(GroceryItems[0].store_item);
        }
        FetchData();
    };

    let FetchData = async (): Promise<any> => {
        let condition:string = "'" + StoreSkuList.join("','") + "'";
        let Data: any = await SelectQueryModule(dbCon, "stores_items AS A JOIN store_aisles AS B ON A.aisle = B.name", "A.sku, B.eezly_aisle_id AS aisle_id", `A.sku IN (${condition})`, null, null, null, []);
        if (Data.status) {
            StoresItems = Data.data;
            UpdateEezlyAisle();
        } else {
            return GenerateBadRequestResponse(res, Data.message);
        }
    };

    let UpdateEezlyAisle = async (): Promise<any> => {
        let data:any = [];
        for (let i = 0; i < EezlyItems.length; i++) {
            GroceryItems = JSON.parse(EezlyItems[i].grocery_items);
            for (let z = 0; z < StoresItems.length; z++) {
                if (GroceryItems[0].store_item === StoresItems[z].sku) {
                    data = await UpdateRecord(EezlyItems[i].id, StoresItems[z].aisle_id);
                    if (!data.status) {
                        return GenerateErrorResponse(res, data.message);
                    }
                    break;
                }
            }
        }
        Response();
    };

    // Update Database Record
    let UpdateRecord = async (EezlyItemId: any, EezlyAisleId: any): Promise<any> => {
        return await RunAnyQuery(`UPDATE eezly_items SET eezly_aisle_id = ?, updated_at = ? WHERE id = ?`, [EezlyAisleId, DBDateFormatModule(), EezlyItemId]);
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Record updated successfully');
    };

    /* Start */
    CheckRolePermission();
});

// Update Eezly Items Aisle - End

// Remove Store Eezly Items Script - Start
app.post("/removeStoreEezlyItems", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let Store: any = req.body.store;
    let EezlyItems: any = [];
    let GroceryItems: any = [];

    let CheckPermissionAndGetEezlyItems = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'create_eezly_item');
        if (!data.status) {
            return GenerateBadRequestResponse(res, 'Permission denied');
        } else {
            let validationData: any = await CheckRequiredValidation([
                { field: 'Store name', value: Store, type: 'Empty' }
            ]);
            if (!validationData.status) {
                return GenerateBadRequestResponse(res, validationData.message);
            }
            /* Get Eezly Items Data */
            let eezlyItemData: any = await SelectQueryModule(dbCon, 'eezly_items', '*', null, null, null, null, []);
            if (!eezlyItemData.status) {
                return GenerateErrorResponse(res, eezlyItemData.message);
            }
            EezlyItems = eezlyItemData.data;
            RemoveStoreEezlyItems();
        }
    };

    let RemoveStoreEezlyItems = async (): Promise<any> => {
        let deleteResult:any = [];
        let updateResult:any = [];
        for (let i = 0; i < EezlyItems.length; i++) {
            GroceryItems = JSON.parse(EezlyItems[i].grocery_items);
            if (GroceryItems.length === 1 && GroceryItems[0].store_name === Store) {
                deleteResult = await DeleteRecord(EezlyItems[i].id);
                if (!deleteResult.status) {
                    return GenerateErrorResponse(res, deleteResult.message);
                }
            } else if (GroceryItems.length > 1) {
                // remove store from grocery item list
                let UpdatedGroceryItemList: any = [];
                for (let z = 0; z < GroceryItems.length; z++) {
                    if (GroceryItems[z].store_name !== Store) {
                        let sub_array: any = {
                            store_id: GroceryItems[z].store_id,
                            store_name: GroceryItems[z].store_name,
                            store_item: GroceryItems[z].store_item
                        };
                        UpdatedGroceryItemList.push(sub_array);
                    }
                }
                updateResult = await UpdateRecord(EezlyItems[i].id, UpdatedGroceryItemList);
                if (!updateResult.status) {
                    return GenerateErrorResponse(res, updateResult.message);
                }
            }
        }
        Response();
    };

    // Update Database Record
    let UpdateRecord = async (EezlyItemId: any, GroceryItemList: any): Promise<any> => {
        return await RunAnyQuery(`UPDATE eezly_items SET grocery_items = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(GroceryItemList), DBDateFormatModule(), EezlyItemId]);
    };

    // Delete Database Record
    let DeleteRecord = async (EezlyItemId: any): Promise<any> => {
        return await RunAnyQuery(`DELETE FROM eezly_items WHERE id = ?`, [EezlyItemId]);
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Record updated successfully');
    };

    /* Step 1 */
    CheckPermissionAndGetEezlyItems();
});

// Clean Store Eezly Items Script
app.post("/cleanEezlyItemsGroceryItemsList", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let Store: any = req.body.store;
    let EezlyItems: any = [];
    let GroceryItems: any = [];
    let Start:any = Number(req.body.start);
    let Limit:number = 10000;
    let End:number = Start + Limit;
    let StoreIdObject: any = {
        iga: 1,
        superc: 2,
        maxi: 3,
        metro: 4,
        provigo: 5,
        walmart: 6
    };

    let CheckPermissionAndGetEezlyItems = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'modify_eezly_items');
        if (!data.status) {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
        /* Get Eezly Items Data */
        let eezlyItemData: any = await SelectQueryModule(dbCon, 'eezly_items', '*', null, null, null, ` LIMIT ${Limit} OFFSET ${Start}`, []);
        if (!eezlyItemData.status) {
            return GenerateErrorResponse(res, eezlyItemData.message);
        }
        EezlyItems = eezlyItemData.data;
        CleanEezlyItems();
    };

    let CleanEezlyItems = async (): Promise<any> => {
        for (const cleanItem of EezlyItems) {
            const eezlyItemGroceryItemsList = cleanItem.grocery_items ? JSON.parse(cleanItem.grocery_items) : [];
            for (let i=0; i < eezlyItemGroceryItemsList.length; i++) {
                if (Number(eezlyItemGroceryItemsList[i].store_id) > 6) {
                    eezlyItemGroceryItemsList[i].store_id = StoreIdObject[eezlyItemGroceryItemsList[i].store_name];
                }
            }
            const data:any = await UpdateRecord(cleanItem.id, eezlyItemGroceryItemsList);
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
        }
        Response();
    };

    // Update Database Record
    let UpdateRecord = async (EezlyItemId: any, GroceryItemList: any): Promise<any> => {
        return await RunAnyQuery(`UPDATE eezly_items SET grocery_items = '${JSON.stringify(GroceryItemList)}', updated_at = '${DBDateFormatModule()}' WHERE id = '${EezlyItemId}'`, []);
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Record updated successfully');
    };

    /* Step 1 */
    CheckPermissionAndGetEezlyItems();
});

// Remove Store Eezly Items Script - End

// Add Eezly Item In Algolia
function addInAlgolia(addData: any, lang: string, environment: string) {
    const indexval = environment + "_eezly_" + lang;
    const clientIn = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
    const index = clientIn.initIndex(`${indexval}`);
    var obj = index.saveObjects([addData], {
        autoGenerateObjectIDIfNotExist: true
    }).then((d: any) => {
        console.log(d);
    }).catch((err: any) => {
        console.error(err);
    });
}

module.exports = app;
