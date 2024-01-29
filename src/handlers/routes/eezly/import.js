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
const express_1 = __importDefault(require("express"));
const common_modules_1 = require("../../modules/common.modules");
const validator_modules_1 = require("../../modules/validator.modules");
const crud_modules_1 = require("../../modules/crud.modules");
const db_modules_1 = require("../../modules/db.modules");
const http_status_codes_1 = require("http-status-codes");
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
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
const ApiAuth = require("../../lib/auth");
// Import Eezly Items Script - Start
app.post("/importEezlyItems", ApiAuth, (req, res) => {
    let User = req.body.user;
    let Store = req.body.store;
    let Start = req.body.start;
    let Limit = 5000;
    let Table = null;
    let StoreId = 0;
    let StoreName = null;
    let EezlyAisleId = null;
    let storeAisle = null;
    let StoreItems = null;
    let EezlyItems = null;
    let eezly_items_array = [];
    let values = [];
    let Status = 0;
    let Step1 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_eezly_item');
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
        /* Store Validation */
        switch (Store) {
            case common_modules_1.StoreNameObject.iga:
                StoreId = common_modules_1.StoreIdObject.iga;
                StoreName = common_modules_1.StoreNameObject.iga;
                Table = common_modules_1.StoreNameObject.iga + '_items';
                break;
            case common_modules_1.StoreNameObject.superc:
                StoreId = common_modules_1.StoreIdObject.superc;
                StoreName = common_modules_1.StoreNameObject.superc;
                Table = common_modules_1.StoreNameObject.superc + '_items';
                break;
            case common_modules_1.StoreNameObject.maxi:
                StoreId = common_modules_1.StoreIdObject.maxi;
                StoreName = common_modules_1.StoreNameObject.maxi;
                Table = common_modules_1.StoreNameObject.maxi + '_items';
                break;
            case common_modules_1.StoreNameObject.metro:
                StoreId = common_modules_1.StoreIdObject.metro;
                StoreName = common_modules_1.StoreNameObject.metro;
                Table = common_modules_1.StoreNameObject.metro + '_items';
                break;
            case common_modules_1.StoreNameObject.provigo:
                StoreId = common_modules_1.StoreIdObject.provigo;
                StoreName = common_modules_1.StoreNameObject.provigo;
                Table = common_modules_1.StoreNameObject.provigo + '_items';
                break;
            case common_modules_1.StoreNameObject.walmart:
                StoreId = common_modules_1.StoreIdObject.walmart;
                StoreName = common_modules_1.StoreNameObject.walmart;
                Table = common_modules_1.StoreNameObject.walmart + '_items';
                break;
            default:
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid store');
        }
        /* Get Eezly Items Data */
        let eezlyItemsData = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items', '*', null, null, null, null);
        if (!eezlyItemsData.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, eezlyItemsData.message);
        }
        EezlyItems = eezlyItemsData.data;
        /* Get Store Aisles Data */
        let storeAisleData = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles', '*', null, null, null, null);
        if (!storeAisleData.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, storeAisleData.message);
        }
        storeAisle = storeAisleData.data;
        /* Get Store Items Data */
        let storeItemsData = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, Table, '*', null, null, null, ` LIMIT ${Limit} OFFSET ${Start}`);
        if (!storeItemsData.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, storeItemsData.message);
        }
        StoreItems = storeItemsData.data;
        GenerateEezlyItemsArray();
    });
    let GenerateEezlyItemsArray = () => {
        for (let store_item = 0; store_item < StoreItems.length; store_item++) {
            Status = 0;
            // check if store item eezly item already exists or not
            for (let eezly_item = 0; eezly_item < EezlyItems.length; eezly_item++) {
                let EGroceryItems = JSON.parse(EezlyItems[eezly_item].grocery_items);
                for (let i = 0; i < EGroceryItems.length; i++) {
                    if (EGroceryItems[i].store_id == StoreId && EGroceryItems[i].store_name == StoreName && EGroceryItems[i].store_item == StoreItems[store_item].sku) {
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
                let groceryItemListArray = [];
                let groceryItemListSubArray = {
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
                let sub_array = {
                    name: StoreItems[store_item].name,
                    name_fr: (StoreItems[store_item].french_name !== '' && StoreItems[store_item].french_name !== null) ? StoreItems[store_item].french_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[".*+?^${}()|[\]\\]/g, "") : null,
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
    let ConvertArray = () => {
        values = eezly_items_array.reduce((o, a) => {
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
            return o;
        }, []);
        StoreData();
    };
    let StoreData = () => {
        if (values.length > 0) {
            let sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id , grocery_items, created_by) VALUE ?`;
            db_modules_1.dbCon.query(sql, [values], (err, result) => __awaiter(void 0, void 0, void 0, function* () {
                if (err) {
                    return (0, common_modules_1.GenerateErrorResponse)(res, err.message);
                }
                Response();
            }));
        }
        else {
            Response();
        }
    };
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
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
app.post("/updateImportEezlyItems", ApiAuth, (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let Store = req.body.store;
    let Start = req.body.start;
    let Limit = 2000;
    let Table = null;
    let StoreId = 0;
    let StoreName = null;
    let StoreItems = null;
    let EezlyItems = null;
    let eezly_items_array = [];
    let values = [];
    let Status = 0;
    let SettingsData = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'modify_eezly_items');
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
        /* Validation */
        switch (Store) {
            case common_modules_1.StoreNameObject.iga:
                StoreId = common_modules_1.StoreIdObject.iga;
                StoreName = common_modules_1.StoreNameObject.iga;
                Table = common_modules_1.StoreNameObject.iga + '_items';
                break;
            case common_modules_1.StoreNameObject.superc:
                StoreId = common_modules_1.StoreIdObject.superc;
                StoreName = common_modules_1.StoreNameObject.superc;
                Table = common_modules_1.StoreNameObject.superc + '_items';
                break;
            case common_modules_1.StoreNameObject.maxi:
                StoreId = common_modules_1.StoreIdObject.maxi;
                StoreName = common_modules_1.StoreNameObject.maxi;
                Table = common_modules_1.StoreNameObject.maxi + '_items';
                break;
            case common_modules_1.StoreNameObject.metro:
                StoreId = common_modules_1.StoreIdObject.metro;
                StoreName = common_modules_1.StoreNameObject.metro;
                Table = common_modules_1.StoreNameObject.metro + '_items';
                break;
            case common_modules_1.StoreNameObject.provigo:
                StoreId = common_modules_1.StoreIdObject.provigo;
                StoreName = common_modules_1.StoreNameObject.provigo;
                Table = common_modules_1.StoreNameObject.provigo + '_items';
                break;
            case common_modules_1.StoreNameObject.walmart:
                StoreId = common_modules_1.StoreIdObject.walmart;
                StoreName = common_modules_1.StoreNameObject.walmart;
                Table = common_modules_1.StoreNameObject.walmart + '_items';
                break;
            default:
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid store');
        }
        /* Get Settings */
        let setting = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'settings', '*', 'id = 1', null, null, null);
        if (!setting.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, setting.message);
        }
        SettingsData = setting.data;
        /* Get Eezly Items */
        let eezlyItemsData = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items', '*', null, null, null, null);
        if (!eezlyItemsData.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, eezlyItemsData.message);
        }
        EezlyItems = eezlyItemsData.data;
        /* Get Store Items */
        let storeItemsData = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, Table, '*', null, null, null, ` LIMIT ${Limit} OFFSET ${Start}`);
        if (!storeItemsData.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, storeItemsData.message);
        }
        StoreItems = storeItemsData.data;
        FindEezlyItem();
    });
    let FindEezlyItem = () => __awaiter(void 0, void 0, void 0, function* () {
        for (let store_item = 0; store_item < StoreItems.length; store_item++) {
            Status = 0;
            for (let eezly_item = 0; eezly_item < EezlyItems.length; eezly_item++) {
                let EGroceryItems = JSON.parse(EezlyItems[eezly_item].grocery_items);
                for (let i = 0; i < EGroceryItems.length; i++) {
                    if (EGroceryItems[i].store_id == StoreId && EGroceryItems[i].store_name == StoreName && EGroceryItems[i].store_item == StoreItems[store_item].sku) {
                        if (StoreItems[store_item].french_name !== '' && StoreItems[store_item].french_name !== null && (StoreItems[store_item].name === EezlyItems[eezly_item].name)) {
                            let sub_array = {
                                id: EezlyItems[eezly_item].id,
                                name_fr: StoreItems[store_item].french_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®".*+?^${}()|[\]\\]/g, ""),
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
            yield Update(i);
        }
        Response();
    });
    let Update = (counter) => {
        let sql = `UPDATE eezly_items SET name_fr = "${eezly_items_array[counter].name_fr}", updated_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = '${eezly_items_array[counter].id}'`;
        db_modules_1.dbCon.query(sql, (err, result) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                return (0, common_modules_1.GenerateErrorResponse)(res, err.message);
            }
            // Add record in algolia if listed = true
            if (eezly_items_array[counter].listed === 'true') {
                let algoliaData = {
                    "id": `${eezly_items_array[counter].id}`,
                    "name": eezly_items_array[counter].name_fr,
                    "brand": eezly_items_array[counter].brand,
                    "listed": "true",
                    "size": eezly_items_array[counter].size,
                    "thumbnail": eezly_items_array[counter].thumbnail,
                };
                yield addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
            }
        }));
    };
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Record updated successfully');
    };
    /* Start */
    CheckRolePermission();
});
// Update Eezly Items Script - End
// Update Eezly Items Aisle - Start
app.post("/updateEezlyItemsAisle", ApiAuth, (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let Start = req.body.start;
    let Limit = 10000;
    let EezlyItems = [];
    let GroceryItems = [];
    let whereCondition = '';
    let igaStoreSkuList = [];
    let supercStoreSkuList = [];
    let maxiStoreSkuList = [];
    let metroStoreSkuList = [];
    let provigoStoreSkuList = [];
    let walmartStoreSkuList = [];
    /* Stores */
    let IgaItems = [];
    let SupercItems = [];
    let MaxiItems = [];
    let MetroItems = [];
    let ProvigoItems = [];
    let WalmartItems = [];
    let CheckRolePermission = () => {
        /* Check for user role permission */
        app.get("CheckPermission")(db, User.role_id, 'Admins').then((Data) => {
            if (Data.status) {
                FetchEezlyItemsData();
            }
            else {
                return res.status(app.get("BadRequestStatus")).json({
                    status: false,
                    message: 'Permission denied',
                });
            }
        });
    };
    let FetchEezlyItemsData = () => {
        app.get("SelectQuery")(db, "eezly_items", "*", null, null, null, ` LIMIT ${Limit} OFFSET ${Start}`).then((Data) => {
            if (Data.status) {
                EezlyItems = Data.data;
                FindRelavantStoreRecords();
            }
            else {
                return res.status(app.get("BadRequestStatus")).json({
                    status: false,
                    message: Data.message
                });
            }
        });
    };
    let FindRelavantStoreRecords = () => {
        for (let i = 0; i < EezlyItems.length; i++) {
            GroceryItems = JSON.parse(EezlyItems[i].grocery_items);
            if (GroceryItems[0].store_id === 1) {
                igaStoreSkuList.push(GroceryItems[0].store_item);
            }
            else if (GroceryItems[0].store_id === 2) {
                supercStoreSkuList.push(GroceryItems[0].store_item);
            }
            else if (GroceryItems[0].store_id === 3) {
                maxiStoreSkuList.push(GroceryItems[0].store_item);
            }
            else if (GroceryItems[0].store_id === 4) {
                metroStoreSkuList.push(GroceryItems[0].store_item);
            }
            else if (GroceryItems[0].store_id === 5) {
                provigoStoreSkuList.push(GroceryItems[0].store_item);
            }
            else if (GroceryItems[0].store_id === 6) {
                walmartStoreSkuList.push(GroceryItems[0].store_item);
            }
        }
        FetchData("iga_items");
    };
    let FetchData = (Type) => {
        if (Type === "iga_items") {
            const escapedStringArray = igaStoreSkuList.map((value) => mysql.escape(value));
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('') AND B.store_id = 1`;
            app.get("SelectQuery")(db, "iga_items AS A JOIN store_aisles AS B ON A.aisle = B.name", "A.sku, B.eezly_aisle_id AS aisle_id", `${whereCondition}`, null, null, null).then((Data) => {
                if (Data.status) {
                    IgaItems = Data.data;
                    FetchData("superc_items");
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message,
                        table: 'iga'
                    });
                }
            });
        }
        else if (Type === 'superc_items') {
            const escapedStringArray = supercStoreSkuList.map((value) => mysql.escape(value));
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('') AND B.store_id = 2`;
            app.get("SelectQuery")(db, "superc_items AS A JOIN store_aisles AS B ON A.aisle = B.name", "A.sku, B.eezly_aisle_id AS aisle_id", `${whereCondition}`, null, null, null).then((Data) => {
                if (Data.status) {
                    SupercItems = Data.data;
                    FetchData("maxi_items");
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message,
                        table: 'superc'
                    });
                }
            });
        }
        else if (Type === 'maxi_items') {
            const escapedStringArray = maxiStoreSkuList.map((value) => mysql.escape(value));
            whereCondition = escapedStringArray.length > 0 ? `sku IN (${escapedStringArray.join(",")})` : `sku IN ('') AND B.store_id = 3`;
            app.get("SelectQuery")(db, "maxi_items AS A JOIN store_aisles AS B ON A.aisle = B.name", "A.sku, B.eezly_aisle_id AS aisle_id", `${whereCondition}`, null, null, null).then((Data) => {
                if (Data.status) {
                    MaxiItems = Data.data;
                    FetchData("metro_items");
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message,
                        table: 'maxi',
                        condition: whereCondition
                    });
                }
            });
        }
        else if (Type === 'metro_items') {
            const escapedStringArray = metroStoreSkuList.map((value) => mysql.escape(value));
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('') AND B.store_id = 4`;
            app.get("SelectQuery")(db, "metro_items AS A JOIN store_aisles AS B ON A.aisle = B.name", "A.sku, B.eezly_aisle_id AS aisle_id", `${whereCondition}`, null, null, null).then((Data) => {
                if (Data.status) {
                    MetroItems = Data.data;
                    FetchData("provigo_items");
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message,
                        table: 'metro'
                    });
                }
            });
        }
        else if (Type === 'provigo_items') {
            const escapedStringArray = provigoStoreSkuList.map((value) => mysql.escape(value));
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('') AND B.store_id = 5`;
            app.get("SelectQuery")(db, "provigo_items AS A JOIN store_aisles AS B ON A.aisle = B.name", "A.sku, B.eezly_aisle_id AS aisle_id", `${whereCondition}`, null, null, null).then((Data) => {
                if (Data.status) {
                    ProvigoItems = Data.data;
                    FetchData("walmart_items");
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        }
        else if (Type === 'walmart_items') {
            const escapedStringArray = walmartStoreSkuList.map((value) => mysql.escape(value));
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('') AND B.store_id = 6`;
            app.get("SelectQuery")(db, "walmart_items AS A JOIN store_aisles AS B ON A.aisle = B.name", "A.sku, B.eezly_aisle_id AS aisle_id", `${whereCondition}`, null, null, null).then((Data) => {
                if (Data.status) {
                    WalmartItems = Data.data;
                    UpdateEezlyAisle();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        }
    };
    let UpdateEezlyAisle = () => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < EezlyItems.length; i++) {
            console.log("Eezly Item Id: " + EezlyItems[i].id);
            GroceryItems = JSON.parse(EezlyItems[i].grocery_items);
            if (GroceryItems[0].store_id === 1) {
                for (let z = 0; z < IgaItems.length; z++) {
                    if (GroceryItems[0].store_item === IgaItems[z].sku) {
                        yield UpdateRecord(EezlyItems[i].id, IgaItems[z].aisle_id);
                        break;
                    }
                }
            }
            else if (GroceryItems[0].store_id === 2) {
                for (let z = 0; z < SupercItems.length; z++) {
                    if (GroceryItems[0].store_item === SupercItems[z].sku) {
                        yield UpdateRecord(EezlyItems[i].id, SupercItems[z].aisle_id);
                        break;
                    }
                }
            }
            else if (GroceryItems[0].store_id === 3) {
                for (let z = 0; z < MaxiItems.length; z++) {
                    if (GroceryItems[0].store_item === MaxiItems[z].sku) {
                        yield UpdateRecord(EezlyItems[i].id, MaxiItems[z].aisle_id);
                        break;
                    }
                }
            }
            else if (GroceryItems[0].store_id === 4) {
                for (let z = 0; z < MetroItems.length; z++) {
                    if (GroceryItems[0].store_item === MetroItems[z].sku) {
                        yield UpdateRecord(EezlyItems[i].id, MetroItems[z].aisle_id);
                        break;
                    }
                }
            }
            else if (GroceryItems[0].store_id === 5) {
                for (let z = 0; z < ProvigoItems.length; z++) {
                    if (GroceryItems[0].store_item === ProvigoItems[z].sku) {
                        yield UpdateRecord(EezlyItems[i].id, ProvigoItems[z].aisle_id);
                        break;
                    }
                }
            }
            else if (GroceryItems[0].store_id === 6) {
                for (let z = 0; z < WalmartItems.length; z++) {
                    if (GroceryItems[0].store_item === WalmartItems[z].sku) {
                        yield UpdateRecord(EezlyItems[i].id, WalmartItems[z].aisle_id);
                        break;
                    }
                }
            }
        }
        Response();
    });
    // Update Database Record
    let UpdateRecord = (EezlyItemId, EezlyAisleId) => {
        let sql = `UPDATE eezly_items SET eezly_aisle_id = '${EezlyAisleId}', updated_at = '${app.get("DBDateFormat")()}' WHERE id = '${EezlyItemId}'`;
        db.query(sql, (err, result) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                console.log(err);
            }
        }));
    };
    let Response = () => {
        return res.status(app.get("SuccessStatus")).json({
            status: true,
            message: "Record updated successfully",
        });
    };
    /* Start */
    CheckRolePermission();
});
// Update Eezly Items Aisle - End
// Remove Store Eezly Items Script - Start
app.post("/removeStoreEezlyItems", ApiAuth, (req, res) => {
    let User = req.body.user;
    let Store = req.body.store;
    let EezlyItems = [];
    let GroceryItems = [];
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_eezly_item');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([
            { field: 'Store name', value: Store, type: 'Empty' }
        ]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Get Eezly Items Data */
        let eezlyItemData = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items', '*', null, null, null, null);
        if (!eezlyItemData.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, eezlyItemData.message);
        }
        EezlyItems = eezlyItemData.data;
        RemoveStoreEezlyItems();
    });
    let RemoveStoreEezlyItems = () => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < EezlyItems.length; i++) {
            GroceryItems = JSON.parse(EezlyItems[i].grocery_items);
            if (GroceryItems.length === 1 && GroceryItems[0].store_name === Store) {
                yield DeleteRecord(EezlyItems[i].id);
            }
            else if (GroceryItems.length > 1) {
                // remove store from grocery item list
                let UpdatedGroceryItemList = [];
                for (let z = 0; z < GroceryItems.length; z++) {
                    if (GroceryItems[z].store_name !== Store) {
                        let sub_array = {
                            store_id: GroceryItems[z].store_id,
                            store_name: GroceryItems[z].store_name,
                            store_item: GroceryItems[z].store_item
                        };
                        UpdatedGroceryItemList.push(sub_array);
                    }
                }
                yield UpdateRecord(EezlyItems[i].id, UpdatedGroceryItemList);
            }
        }
        Response();
    });
    // Update Database Record
    let UpdateRecord = (EezlyItemId, GroceryItemList) => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `UPDATE eezly_items SET grocery_items = '${JSON.stringify(GroceryItemList)}', updated_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = ${EezlyItemId}`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (!data.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    // Delete Database Record
    let DeleteRecord = (EezlyItemId) => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `DELETE FROM eezly_items WHERE id = ${EezlyItemId}`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (!data.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Record updated successfully');
    };
    /* Step 1 */
    CheckRolePermission();
});
// Remove Store Eezly Items Script - End
// Add Eezly Item In Algolia
function addInAlgolia(addData, lang, environment) {
    const indexval = environment + "_eezly_" + lang;
    const clientIn = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
    const index = clientIn.initIndex(`${indexval}`);
    var obj = index.saveObjects([addData], {
        autoGenerateObjectIDIfNotExist: true
    }).then((d) => {
        console.log(d);
    }).catch((err) => {
        console.error(err);
    });
}
module.exports = app;
