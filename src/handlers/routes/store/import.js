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
const http_status_codes_1 = require("http-status-codes");
const crud_modules_1 = require("../../modules/crud.modules");
const db_modules_1 = require("../../modules/db.modules");
const validator_modules_1 = require("../../modules/validator.modules");
// Import the string extensions
require('../../extensions/stringExtensions');
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
const formData = require('express-form-data');
const os = require("os");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
app.use(cors());
app.use(formData.parse({
    uploadDir: os.tmpdir(),
    autoClean: true
}));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());
const ApiAuth = require("../../lib/auth");
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
require('events').EventEmitter.defaultMaxListeners = 15;
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});
const streamToPromise = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
});
// Import Store Items Directly From s3 Bucket - Start
app.get("/", (req, res) => {
    let User = req.body.user;
    let ObjectKey = req.query.object_key;
    let Store = '';
    let StoreId = "";
    let Lang = '';
    let TotalRecords = 0;
    let TotalInserted = 0;
    let TotalUpdated = 0;
    let storeAisle = [];
    let StoreSkuArr = [];
    const ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Object key', value: ObjectKey, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        else {
            ObjectKey = ObjectKey.split('/');
            if (typeof ObjectKey[2] === 'undefined') {
                // does not exist
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid object key');
            }
            else {
                if (ObjectKey[2].includes('_') && ObjectKey[2].includes('.json')) {
                    Store = ObjectKey[2].substring(0, ObjectKey[2].indexOf('_'));
                    Lang = ObjectKey[2].substring((ObjectKey[2].indexOf('_') + 1), ObjectKey[2].indexOf('.'));
                }
                else {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid object key');
                }
                FetchStoreData();
            }
        }
    });
    const FetchStoreData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'stores', '*', `name = '${Store}'`, null, null, null);
        if (data.status) {
            if (data.data.length > 0) {
                StoreId = data.data[0].id;
                FetchStoreAisleData();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid Store Name');
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    const FetchStoreAisleData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles', '*', null, null, null, null);
        if (data.status) {
            storeAisle = data.data;
            GetStoreSku();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    const GetStoreSku = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Get All Store SKUs */
        let table = `${Store}_items`;
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `${table}`, 'sku', null, null, null, null);
        if (data.status) {
            for (let i = 0; i < data.data.length; i++) {
                StoreSkuArr.push(data.data[i].sku);
            }
            MainProcess();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    const MainProcess = () => __awaiter(void 0, void 0, void 0, function* () {
        const params = {
            Bucket: process.env.AWS_BUCKET,
            Key: `${ObjectKey[0]}/${ObjectKey[1]}/${ObjectKey[2]}`,
        };
        const data = yield s3Client.send(new GetObjectCommand(params));
        const body = yield streamToPromise(data.Body).then((data) => data.toString('utf-8'));
        const _JSONData = JSON.parse(body);
        TotalRecords = _JSONData.length;
        for (let CurrentIndex = 0; CurrentIndex < _JSONData.length; CurrentIndex++) {
            if (StoreSkuArr.indexOf(_JSONData[CurrentIndex]['Sku']) !== -1) {
                // Update
                TotalUpdated++;
                Update(_JSONData[CurrentIndex], _JSONData[CurrentIndex]['Sku']);
                if (CurrentIndex === _JSONData.length - 1) {
                    Response(_JSONData);
                }
            }
            else {
                // Insert
                TotalInserted++;
                yield Insert(_JSONData[CurrentIndex]);
                if (CurrentIndex === _JSONData.length - 1) {
                    Response(_JSONData);
                }
            }
        }
    });
    const Insert = (Values) => __awaiter(void 0, void 0, void 0, function* () {
        let Category = Values['Category'] ? Values['Category'].removeSpecialCharactersFromNormalString() : null;
        let Aisle = Values['Aisle'] ? Values['Aisle'].removeSpecialCharactersFromNormalString() : null;
        let SubCategory = Values['Sub Category'] ? Values['Sub Category'].removeSpecialCharactersFromNormalString() : null;
        let Brand = Values['Brand'] ? Values['Brand'].removeSpecialCharactersFromNormalString() : null;
        let Url = Values['Url'] ? Values['Url'].removeSpecialCharactersFromURL() : null;
        let Image = Values['Image'] ? Values['Image'].removeSpecialCharactersFromURL() : null;
        let SizeLabel = Values['Size Label'] ? Values['Size Label'].removeSpecialCharactersFromNormalString() : null;
        let Size = Values['Size'] ? Values['Size'].toString().removeSpecialCharactersFromNormalString() : null;
        let RegularPrice = (Values['Regular Price'] == '' || Values['Regular Price'] == 'None' || Values['Regular Price'] == null || Values['Regular Price'] == 'NaN') ? 0 : parseFloat(Values['Regular Price']);
        let SalePrice = (Values['Sale Price'] == '' || Values['Sale Price'] == 'None' || Values['Sale Price'] == null || Values['Sale Price'] == 'NaN') ? 0 : parseFloat(Values['Sale Price']);
        let NameTitle = '';
        let NameValue = '';
        if (Lang == "en") {
            NameTitle = "name";
            NameValue = Values['Name'] ? Values['Name'] : Values['English Name'];
        }
        else {
            NameTitle = "french_name";
            NameValue = Values['Name'] ? Values['Name'] : Values['French Name'];
        }
        NameValue = NameValue ? NameValue.removeSpecialCharactersFromNormalString() : "";
        let sql = `INSERT INTO ${Store}_items (sku, category, aisle, subCategory, regular_price, sale_price, brand, url, image, size_label, size, ${NameTitle}, created_at, updated_at) VALUE (IF("${Values['Sku']}" = "null", null, "${Values['Sku']}"), IF("${Category}" = "null", null, "${Category}"), IF("${Aisle}" = "null", null, "${Aisle}"), IF("${SubCategory}" = "null", null, "${SubCategory}"), IF("${RegularPrice}" = "null", null, ${RegularPrice}), IF("${SalePrice}" = "null", null, ${SalePrice}), IF("${Brand}" = "null", null, "${Brand}"), IF("${Url}" = "null", null, "${Url}"), IF("${Image}" = "null", null, "${Image}"), IF("${SizeLabel}" = "null", null, "${SizeLabel}"), IF("${Size}" = "null", null, "${Size}"), IF("${NameValue}" = "null", null, "${NameValue}"), "${(0, common_modules_1.DBDateFormatModule)()}", "${(0, common_modules_1.DBDateFormatModule)()}")`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            StoreSkuArr.push(Values['Sku']);
            // Create New Eezly Item From Store Item
            let EezlyAisleId = yield FindEezlyAisleId(Aisle);
            yield InsertEezlyItem(data.data.insertId, Store, Values['Sku'], NameTitle, NameValue, Image, Brand, Size, EezlyAisleId);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    const FindEezlyAisleId = (Aisle) => {
        let EezlyAisleId = null;
        for (let aisle_index = 0; aisle_index < storeAisle.length; aisle_index++) {
            if ((Aisle == storeAisle[aisle_index].name) && (StoreId == storeAisle[aisle_index].store_id)) {
                EezlyAisleId = storeAisle[aisle_index].eezly_aisle_id;
                break;
            }
        }
        return EezlyAisleId;
    };
    const InsertEezlyItem = (StoreId, Store, Sku, NameTitle, Name, Thumbnail, Brand, Size, EezlyAisleId) => __awaiter(void 0, void 0, void 0, function* () {
        let groceryItemListArray = [{
                store_id: StoreId,
                store_name: Store,
                store_item: Sku,
            }];
        NameTitle = (NameTitle == 'name') ? 'name' : 'name_fr';
        let sql = `INSERT INTO eezly_items (${NameTitle}, thumbnail, brand, size, eezly_aisle_id, grocery_items) VALUE ("${Name}", "${Thumbnail}", IF("${Brand}" = "null", null, "${Brand}"), IF("${Size}" = "null", null, "${Size}"), IF("${EezlyAisleId}" = "null", null, "${EezlyAisleId}"), '${JSON.stringify(groceryItemListArray)}')`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (!data.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    const Update = (Values, Sku) => __awaiter(void 0, void 0, void 0, function* () {
        let Category = Values['Category'] ? Values['Category'].removeSpecialCharactersFromNormalString() : null;
        let Aisle = Values['Aisle'] ? Values['Aisle'].removeSpecialCharactersFromNormalString() : null;
        let SubCategory = Values['Sub Category'] ? Values['Sub Category'].removeSpecialCharactersFromNormalString() : null;
        let Brand = Values['Brand'] ? Values['Brand'].removeSpecialCharactersFromNormalString() : null;
        let Url = Values['Url'] ? Values['Url'].removeSpecialCharactersFromURL() : null;
        let Image = Values['Image'] ? Values['Image'].removeSpecialCharactersFromURL() : null;
        let SizeLabel = Values['Size Label'] ? Values['Size Label'].removeSpecialCharactersFromNormalString() : null;
        let Size = Values['Size'] ? Values['Size'].toString().removeSpecialCharactersFromNormalString() : null;
        let RegularPrice = (Values['Regular Price'] == '' || Values['Regular Price'] == 'None' || Values['Regular Price'] == null || Values['Regular Price'] == 'NaN') ? 0 : parseFloat(Values['Regular Price']);
        let SalePrice = (Values['Sale Price'] == '' || Values['Sale Price'] == 'None' || Values['Sale Price'] == null || Values['Sale Price'] == 'NaN') ? 0 : parseFloat(Values['Sale Price']);
        let NameTitle = "";
        let NameValue = "";
        if (Lang == "en") {
            NameTitle = "name";
            NameValue = Values['Name'] ? Values['Name'] : Values['English Name'];
        }
        else {
            NameTitle = "french_name";
            NameValue = Values['Name'] ? Values['Name'] : Values['French Name'];
        }
        NameValue = NameValue ? NameValue.removeSpecialCharactersFromNormalString() : "";
        let sql = `UPDATE ${Store}_items SET category = IF("${Category}" = "null", null, "${Category}"), aisle = IF("${Aisle}" = "null", null, "${Aisle}"), subCategory = IF("${SubCategory}" = "null", null, "${SubCategory}"), regular_price = IF("${RegularPrice}" = "null", null, ${RegularPrice}), sale_price = IF("${SalePrice}" = "null", null, ${SalePrice}), brand = IF("${Brand}" = "null", null, "${Brand}"), url = IF("${Url}" = "null", null, "${Url}"), image = IF("${Image}" = "null", null, "${Image}"), size_label = IF("${SizeLabel}" = "null", null, "${SizeLabel}"), size = IF("${Size}" = "null", null, "${Size}"), ${NameTitle} = IF("${NameValue}" = "null", null, "${NameValue}"), updated_at = "${(0, common_modules_1.DBDateFormatModule)()}" WHERE sku = "${Sku}"`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (!data.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    const Response = (JSONData) => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            total_records: TotalRecords,
            total_inserted: TotalInserted,
            total_updated: TotalUpdated,
        });
    };
    /* Start */
    ValidationStep1();
});
// Import Store Items Directly From s3 Bucket - End
// Migrate Store Data - Start
app.post("/migrate-store-data", ApiAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let User = req.body.user;
    let StoreId = req.body.store_id;
    /* Check for user role permission */
    let permission = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_eezly_item');
    if (permission.status) {
        let validation = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Store id', value: StoreId, type: 'Empty' }]);
        if (!validation.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, validation.message);
        }
        let store = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'stores', 'name', `id = ${StoreId}`, null, null, null);
        if (store.status) {
            if (store.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Store not found');
            }
            else {
                let insertData = yield (0, crud_modules_1.RunAnyQuery)(`INSERT INTO stores_items (storeId, sku , category, aisle, subCategory, regular_price, sale_price, brand, url, image, size_label, size, name, french_name, created_at, updated_at) SELECT "${StoreId}", sku , category, aisle, subCategory, regular_price, sale_price, brand, url, image, size_label, size, name, french_name, created_at, updated_at from ${store.data[0].name}_items`);
                if (insertData.status) {
                    return (0, common_modules_1.GenerateSuccessResponse)(res, 'Data inserted successfully');
                }
                else {
                    return (0, common_modules_1.GenerateErrorResponse)(res, insertData.message);
                }
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, store.message);
        }
    }
    else {
        return (0, common_modules_1.GenerateUnauthorizedResponse)(res, 'Permissions denied');
    }
}));
// Migrate Store Data - End
module.exports = app;
