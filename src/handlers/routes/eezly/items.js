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
const crud_modules_1 = require("../../modules/crud.modules");
const db_modules_1 = require("../../modules/db.modules");
const common_modules_1 = require("../../modules/common.modules");
const crud_modules_2 = require("../../modules/crud.modules");
const http_status_codes_1 = require("http-status-codes");
const validator_modules_1 = require("../../modules/validator.modules");
require('dotenv').config({ path: './.env' });
const jwt = require("jsonwebtoken");
const app = (0, express_1.default)();
const formData = require('express-form-data');
const os = require("os");
const cors = require('cors');
const algoliasearch = require('algoliasearch');
const mysql = require('mysql');
const moment = require("moment");
app.use(cors());
app.use(formData.parse({
    uploadDir: os.tmpdir(),
    autoClean: true
}));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());
const ApiAuth = require("../../lib/auth");
// Get Eezly Items
app.get("/", ApiAuth, (req, res) => {
    let User = req.body.user;
    let SettingsData = null;
    let SettingsThumbnailStores = null;
    let EezlyItems = null;
    let NoOfRecords = req.query.no_of_records;
    let Status = 0;
    let skus = [];
    /* For Listed Items */
    let Listed = "";
    let ListedCondition = "";
    let OrderByCondition = ` ORDER BY A.id DESC`;
    if (req.query.listed) {
        Listed = req.query.listed;
        ListedCondition = ` AND A.listed = '${Listed}'`;
    }
    else {
        // ListedCondition = ` AND A.listed = 'true'`;
    }
    /* Search Conditions */
    /* 1 - By Id */
    let SearchById = "";
    let SearchByIdCondition = "";
    if (req.query.search_by_id) {
        SearchById = parseInt(req.query.search_by_id);
        SearchByIdCondition = ` AND A.id = ${SearchById}`;
    }
    /* 2 - By Name */
    let SearchByName = "";
    let SearchByNameCondition = "";
    if (req.query.search_by_name) {
        SearchByName = req.query.search_by_name;
        if (SearchByName !== "") {
            let NameValues = SearchByName.split(" ");
            SearchByNameCondition += ` AND (`;
            for (let i = 0; i < NameValues.length; i++) {
                SearchByNameCondition += `(A.name LIKE '%${NameValues[i]}%' OR A.brand LIKE '%${NameValues[i]}%')`;
                if ((i + 1) !== NameValues.length) {
                    SearchByNameCondition += ` OR `;
                }
            }
            SearchByNameCondition += `)`;
        }
    }
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let GroceryItems = [];
    let ValidationStep1 = () => {
        if (NoOfRecords === '' || NoOfRecords == null) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Number of records is required'
            });
        }
        GetSettings();
    };
    let GetSettings = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.RunAnyQuery)("select * from settings where id = 1").then((Data) => {
            if (Data.status) {
                SettingsData = Data.data;
                SettingsThumbnailStores = (SettingsData[0].priority_stores_thumbnail !== '' || SettingsData[0].priority_stores_thumbnail != null) ? SettingsData[0].priority_stores_thumbnail.split(',') : [];
                FetchData();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        });
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A", "COUNT(*) AS Total", `A.deleted_at IS NULL ${ListedCondition} ${SearchByIdCondition} ${SearchByNameCondition} ${OrderByCondition}`, null, null, null).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
            if (Data.status) {
                Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/eezly_items", Page, NoOfRecords, parseInt(Data.data[0].Total));
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.OK).json({
                    status: false,
                    message: Data.message
                });
            }
        }));
        if (Pagination) {
            yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, `eezly_items A`, `A.*, A.grocery_items AS raw_grocery_items, (SELECT B.name FROM eezly_aisles B WHERE B.id = A.eezly_aisle_id) AS aisle_name, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.grocery_items IS NOT NULL AND A.deleted_at IS NULL ${ListedCondition} ${SearchByIdCondition} ${SearchByNameCondition} ${OrderByCondition}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`).then((Data) => {
                if (Data.status) {
                    return { data: Data.data, status: true };
                }
                else {
                    return (0, common_modules_1.GenerateErrorResponse)(res, Data.message);
                }
            }).then((d) => __awaiter(void 0, void 0, void 0, function* () {
                if (d.status && d.data.length > 0) {
                    EezlyItems = d.data;
                    var temp;
                    var e;
                    EezlyItems.forEach((row, i) => {
                        temp = JSON.parse(row.raw_grocery_items);
                        for (e = 0; e < temp.length; e++) {
                            skus.push(temp[e].store_item);
                        }
                    });
                    let condition = "'" + skus.join("','") + "'";
                    let sqlNew = `select * from stores_items where sku IN (${condition})`;
                    yield (0, crud_modules_1.RunAnyQuery)(sqlNew).then((data) => {
                        if (!data.status) {
                            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
                        }
                        data.data.forEach((element, index) => {
                            for (let a = 0; a < EezlyItems.length; a++) {
                                if (EezlyItems[a].raw_grocery_items !== null && EezlyItems[a].raw_grocery_items !== "") {
                                    let EGroceryItems = JSON.parse(EezlyItems[a].raw_grocery_items);
                                    for (let i = 0; i < EGroceryItems.length; i++) {
                                        //console.log("store=>",EGroceryItems[i]);
                                        let SubArray = {
                                            store_id: EGroceryItems[i].store_id,
                                            store_name: EGroceryItems[i].store_name
                                        };
                                        if (element.sku === EGroceryItems[i].store_item) {
                                            SubArray["item_details"] = {
                                                id: element.id,
                                                category: element.category,
                                                aisle: element.aisle,
                                                subCategory: element.subCategory,
                                                sku: element.sku,
                                                name: element.name,
                                                french_name: element.french_name,
                                                brand: element.brand,
                                                regular_price: element.regular_price,
                                                sale_price: element.sale_price,
                                                image: element.image,
                                                url: element.url,
                                                size_label: element.size_label,
                                                size: element.size
                                            };
                                            if (!Status && !SettingsThumbnailStores.length) {
                                                if (SettingsThumbnailStores.includes(`${index}`)) {
                                                    EezlyItems[a].thumbnail = element.image;
                                                    Status = 1;
                                                }
                                            }
                                            GroceryItems.push(SubArray);
                                        }
                                    }
                                    if (GroceryItems.length > 0) {
                                        EezlyItems[a].grocery_items = GroceryItems;
                                    }
                                    GroceryItems = [];
                                }
                            }
                        });
                    }).then((data) => {
                        Pagination.status = true;
                        Pagination.data = EezlyItems;
                        return res.status(http_status_codes_1.StatusCodes.OK).json(Pagination);
                    });
                }
                else {
                    return (0, common_modules_1.GenerateErrorResponse)(res, "An unhandled error exception");
                }
            }));
        }
    });
    /* Start */
    ValidationStep1();
});
// Search From Eezly Items
app.get("/search", (req, res) => {
    let EezlyItems = null;
    let FilterGroceryItems = [];
    let GroceryItems = [];
    let LastThursday = moment().startOf('week').add(-3, 'days'); //.format("YYYY-MM-DD");
    let NoOfRecords = 1;
    let whereCondition = '';
    let OutDatedStatus = false;
    /* Search Conditions */
    /* 1 - By Id */
    let SearchById = "";
    let SearchByIdCondition = "";
    if (req.query.search_by_id) {
        SearchById = parseInt(req.query.search_by_id);
        SearchByIdCondition = ` AND A.id = ${SearchById}`;
    }
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A", "COUNT(*) AS Total", `A.deleted_at IS NULL ${SearchByIdCondition}`, null, null, null).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
            if (Data.status) {
                Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/eezly_items/search", Page, NoOfRecords, parseInt(Data.data[0].Total));
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.OK).json({
                    status: false,
                    message: Data.message
                });
            }
        }));
        if (Pagination) {
            yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, `eezly_items A`, `A.*, A.grocery_items AS raw_grocery_items, (SELECT B.name FROM eezly_aisles B WHERE B.id = A.eezly_aisle_id) AS aisle_name, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.deleted_at IS NULL ${SearchByIdCondition}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`).then((Data) => {
                if (Data.status) {
                    return { status: true, data: Data.data };
                }
                else {
                    return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        message: Data.message
                    });
                }
            }).then((d) => __awaiter(void 0, void 0, void 0, function* () {
                if (d.status && d.data.length > 0) {
                    EezlyItems = d.data;
                    var typeArrayNew = { 'iga': new Array(), 'superc': new Array(), 'maxi': new Array(), 'metro': new Array(), 'provigo': new Array(), 'walmart': new Array() };
                    var temp;
                    var e;
                    EezlyItems.forEach((row, i) => {
                        temp = JSON.parse(row.raw_grocery_items);
                        for (e = 0; e < temp.length; e++) {
                            switch (temp[e].store_name) {
                                case "iga":
                                    typeArrayNew.iga.push(temp[e].store_item);
                                    break;
                                case "superc":
                                    typeArrayNew.superc.push(temp[e].store_item);
                                    break;
                                case "maxi":
                                    typeArrayNew.maxi.push(temp[e].store_item);
                                    break;
                                case "metro":
                                    typeArrayNew.metro.push(temp[e].store_item);
                                    break;
                                case "provigo":
                                    typeArrayNew.provigo.push(temp[e].store_item);
                                    break;
                                case "walmart":
                                    typeArrayNew.walmart.push(temp[e].store_item);
                                    break;
                                default:
                                    break;
                            }
                        }
                    });
                    var typeArray = ['iga_items', 'superc_items', 'maxi_items', 'metro_items', 'provigo_items', 'walmart_items'];
                    const newPromises = typeArray.map((row, index, arr) => __awaiter(void 0, void 0, void 0, function* () {
                        var condition = "";
                        switch (row) {
                            case "iga_items":
                                condition = "'" + typeArrayNew.iga.join("','") + "'";
                                break;
                            case "superc_items":
                                condition = "'" + typeArrayNew.superc.join("','") + "'";
                                break;
                            case "maxi_items":
                                condition = "'" + typeArrayNew.maxi.join("','") + "'";
                                break;
                            case "metro_items":
                                condition = "'" + typeArrayNew.metro.join("','") + "'";
                                break;
                            case "provigo_items":
                                condition = "'" + typeArrayNew.provigo.join("','") + "'";
                                break;
                            case "walmart_items":
                                condition = "'" + typeArrayNew.walmart.join("','") + "'";
                                break;
                            default:
                                break;
                        }
                        let sql = `select * from ${row} where sku IN (${condition})`;
                        return new Promise((resolve, reject) => {
                            if (condition == "''") {
                                return resolve({
                                    status: true,
                                    data: [],
                                    storeName: row,
                                });
                            }
                            db_modules_1.dbCon.query(sql, (err, data) => {
                                if (err) {
                                    return resolve({
                                        status: false,
                                        message: err.message,
                                    });
                                }
                                if (data.length > 0) {
                                    data.forEach((r, i) => {
                                        data[i]['storename'] = row.slice(0, row.indexOf('_'));
                                    });
                                }
                                return resolve({
                                    status: true,
                                    data: data,
                                    storeName: row,
                                });
                            });
                        });
                    }));
                    let tempCounter = 0;
                    yield Promise.all(newPromises).then((data) => {
                        tempCounter = 0;
                        data.forEach((row, index) => {
                            if (row.data.length > 0) {
                                row.data.forEach((element, i) => {
                                    for (let a = 0; a < EezlyItems.length; a++) {
                                        if (EezlyItems[a].raw_grocery_items !== null && EezlyItems[a].raw_grocery_items !== "") {
                                            let EGroceryItems = JSON.parse(EezlyItems[a].raw_grocery_items);
                                            for (let i = 0; i < EGroceryItems.length; i++) {
                                                OutDatedStatus = false;
                                                let SubArray = {
                                                    store_id: EGroceryItems[i].store_id,
                                                    store_name: EGroceryItems[i].store_name
                                                };
                                                if ((element.sku === EGroceryItems[i].store_item) && (element.storename === EGroceryItems[i].store_name)) {
                                                    if (moment(element.updated_at) < LastThursday) {
                                                        OutDatedStatus = true;
                                                    }
                                                    SubArray["item_details"] = {
                                                        id: element.id,
                                                        category: element.category,
                                                        aisle: element.aisle,
                                                        subCategory: element.subCategory,
                                                        sku: element.sku,
                                                        name: element.name,
                                                        french_name: element.french_name,
                                                        brand: element.brand,
                                                        regular_price: element.regular_price,
                                                        sale_price: element.sale_price,
                                                        image: element.image,
                                                        url: element.url,
                                                        size_label: element.size_label,
                                                        size: element.size
                                                    };
                                                    GroceryItems.push(SubArray);
                                                }
                                            }
                                            if (GroceryItems.length > 0) {
                                                EezlyItems[a].grocery_items = GroceryItems;
                                            }
                                            //GroceryItems = [];
                                        }
                                        if (tempCounter == 0) {
                                            EezlyItems[a].photos = (EezlyItems[a].photos !== '' && EezlyItems[a].photos !== null) ? JSON.parse(EezlyItems[a].photos) : [];
                                            tempCounter++;
                                        }
                                        EezlyItems[a].created_by = EezlyItems[a].createdBy;
                                        EezlyItems[a].updated_by = EezlyItems[a].updatedBy;
                                        delete EezlyItems[a].createdBy;
                                        delete EezlyItems[a].updatedBy;
                                    }
                                });
                            }
                        });
                    }).then((data) => {
                        Pagination.status = true;
                        Pagination.data = EezlyItems;
                        return res.status(http_status_codes_1.StatusCodes.OK).json(Pagination);
                    });
                }
                else {
                    return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({ status: false, message: "An unhandled error exception" });
                }
            }));
        }
    });
    /* Start */
    FetchData();
});
// Create Eezly Item
app.post("/create", ApiAuth, (req, res) => {
    let User = req.body.user;
    let Name = req.body.name ? req.body.name : null;
    let FrenchName = req.body.name_fr ? req.body.name_fr : null;
    let Thumbnail = req.body.thumbnail ? req.body.thumbnail : null;
    let AisleId = req.body.eezly_aisle_id;
    let Brand = req.body.brand;
    let Size = req.body.size;
    let lang = (req.query.lang !== '' && req.query.lang !== null) ? req.query.lang : 'en';
    let environment = (req.query.environment !== '' && req.query.environment !== null) ? req.query.environment : 'dev';
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'modify_eezly_items');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([
            { field: 'Name', value: Name, type: 'Length maximum 255 characters' },
            { field: 'French name', value: FrenchName, type: 'Length maximum 255 characters' },
            { field: 'Eezly aisle id', value: AisleId, type: 'Empty' },
            { field: 'Brand', value: Brand, type: 'Empty' },
            { field: 'Size', value: Size, type: 'Empty' },
        ]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check of Aisle Id Exists */
        let checkAisleId = yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, 'eezly_aisles', '*', `id = '${AisleId}'`, null, null, null);
        if (checkAisleId.status) {
            if (checkAisleId.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid Eezly Aisle');
            }
            StoreData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, checkAisleId.message);
        }
    });
    let StoreData = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id , created_by, updated_by, created_at, updated_at) VALUE (IF('${Name}' = 'null', null, '${Name}'), IF('${FrenchName}' = 'null', null, '${FrenchName}'), IF('${Thumbnail}' = 'null', null, '${Thumbnail}'), '${Brand}', '${Size}', '${AisleId}', '${User.user_id}', '${User.user_id}', '${(0, common_modules_1.DBDateFormatModule)()}', '${(0, common_modules_1.DBDateFormatModule)()}')`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            Response(data.data.insertId);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (Id) => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            message: 'Eezly item added successfully',
            eezly_item_id: Id
        });
    };
    /* Start */
    CheckRolePermission();
});
// Update Eezly Item
app.put("/update", ApiAuth, (req, res) => {
    let User = req.body.user;
    let ItemId = req.body.eezly_item_id;
    let Name = req.body.name ? req.body.name : null;
    let FrenchName = req.body.name_fr ? req.body.name_fr : null;
    let Thumbnail = req.body.thumbnail ? req.body.thumbnail : null;
    let AisleId = req.body.eezly_aisle_id;
    let Brand = req.body.brand ? req.body.brand : null;
    let Size = req.body.size ? req.body.size : null;
    let Listed = req.body.listed;
    let Description = req.body.description ? req.body.description : null;
    let DescriptionFr = req.body.description_fr ? req.body.description_fr : null;
    let Ingredients = req.body.ingredients ? req.body.ingredients : null;
    let IngredientsFr = req.body.ingredients_fr ? req.body.ingredients_fr : null;
    let NutritionalInfo = req.body.nutritional_info ? req.body.nutritional_info : null;
    let NutritionalInfoFr = req.body.nutritional_info_fr ? req.body.nutritional_info_fr : null;
    let EezlyItemData = null;
    let SettingsData = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'modify_eezly_items');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check of Eezly Item Id Exists */
        let data = yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items', '*', `id = '${ItemId}'`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected eezly item id is invalid');
            }
            EezlyItemData = data.data;
            GetSettings();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetSettings = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, common_modules_1.GetGeneralSettings)();
        if (data.status) {
            SettingsData = data.data;
            UpdateData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let UpdateData = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `UPDATE eezly_items SET name = IF('${Name}' = 'null', null, '${Name}'), name_fr = IF('${FrenchName}' = 'null', null, '${FrenchName}'), thumbnail = IF('${FrenchName}' = 'null', null, '${FrenchName}'), brand = IF('${Brand}' = 'null', null, '${Brand}'), size = IF('${Size}' = 'null', null, '${Size}'), eezly_aisle_id = '${AisleId}', listed = '${Listed}', description = IF('${Description}' = 'null', null, '${Description}'), description_fr = IF('${DescriptionFr}' = 'null', null, '${DescriptionFr}'), ingredients = IF('${Ingredients}' = 'null', null, '${Ingredients}'), ingredients_fr = IF('${IngredientsFr}' = 'null', null, '${IngredientsFr}'), nutritional_info = IF('${NutritionalInfo}' = 'null', null, '${NutritionalInfo}'), nutritional_info_fr = IF('${NutritionalInfoFr}' = 'null', null, '${NutritionalInfoFr}'), updated_by = '${User.user_id}', updated_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = '${ItemId}'`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            // If listed is true create algolia other delete from algolia
            if (Listed !== EezlyItemData[0].listed && Listed === 'true') {
                if (Name !== '' && Name != null) {
                    let algoliaData = {
                        "id": `${ItemId}`,
                        "name": Name,
                        "brand": Brand,
                        "listed": "true",
                        "size": Size,
                        "thumbnail": Thumbnail,
                    };
                    yield addInAlgolia(algoliaData, 'en', SettingsData[0].environment);
                }
                if (FrenchName !== '' && FrenchName != null) {
                    let algoliaData = {
                        "id": `${ItemId}`,
                        "name": FrenchName,
                        "brand": Brand,
                        "listed": "true",
                        "size": Size,
                        "thumbnail": Thumbnail,
                    };
                    yield addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
                }
            }
            else if (Listed !== EezlyItemData[0].listed && Listed === 'false') {
                if (Name !== '' && Name != null) {
                    yield deleteFromAlgolia(Name, SettingsData[0].environment, 'en');
                }
                if (FrenchName !== '' && FrenchName != null) {
                    yield deleteFromAlgolia(FrenchName, SettingsData[0].environment, 'fr');
                }
            }
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Eezly item updated successfully');
    };
    /* Start */
    CheckRolePermission();
});
// Search Eezly Items From Algolia
app.get("/algoliaSearch", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Token Handling
    let db = app.get('db');
    let UserId = null;
    let token = req.body.token || req.query.token || req.headers["authorization"];
    if (token != null) {
        token = token.split(' ')[1];
        if (!token) {
            return (0, common_modules_1.GenerateForbiddenErrorResponse)(res, 'A token is required for authentication');
        }
        try {
            let User = jwt.verify(token, process.env.JWT_SECRET_KEY);
            UserId = User.user_id;
        }
        catch (err) {
            return (0, common_modules_1.GenerateUnauthorizedResponse)(res, err.message);
        }
    }
    // Initializing
    const client = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
    let keyword = req.query.keyword;
    let lang = req.query.lang ? req.query.lang : 'en';
    let environment = req.query.environment ? req.query.environment : 'dev';
    let page = req.query.page;
    let brand = req.query.brand;
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Keyword', value: keyword, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        if (req.query.page === '' || req.query.page == null) {
            page = 0;
        }
        if ((lang === 'en' || lang === 'fr') && (environment === 'dev' || environment === 'prod')) {
            searchIndex(`${environment}_eezly_${lang}`);
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid searching parameters');
        }
    });
    let searchIndex = (algoliaIndex) => {
        const index = client.initIndex(algoliaIndex);
        let conditions = {};
        if (brand == null || brand === '') {
            conditions = {
                attributesToRetrieve: ['name', 'brand', 'id', 'size', 'thumbnail', 'listed'],
                hitsPerPage: 50,
                page: parseInt(page),
                getRankingInfo: 1,
                facets: ['brand']
            };
        }
        else {
            if (brand.includes(",")) {
                let newArray = brand.split(",");
                brand = "";
                newArray.forEach((e, i) => {
                    brand += "brand:'" + e + "'";
                    if (i != newArray.length - 1) {
                        brand += " OR ";
                    }
                });
            }
            else {
                brand = `brand:${brand}`;
            }
            conditions = {
                filters: `${brand}`,
                attributesToRetrieve: ['name', 'brand', 'id', 'size', 'thumbnail', 'listed'],
                hitsPerPage: 50,
                page: parseInt(page),
                getRankingInfo: 1,
                facets: ['brand']
            };
        }
        index.search(keyword, conditions).then((hits) => {
            if (hits) {
                if (UserId === '' || UserId == null) {
                    for (let i = 0; i < hits.hits.length; i++) {
                        hits.hits[i].isFavourite = 0;
                    }
                    Response(hits);
                }
                else {
                    let favoriteEezlyItemsArr = [];
                    let promise = new Promise(function (resolve, reject) {
                        db_modules_1.dbCon.query(`SELECT * FROM favorites WHERE customer_id = ${UserId}`, (err, data) => {
                            if (err) {
                                return resolve({
                                    status: false,
                                    message: err.message,
                                });
                            }
                            return resolve({
                                status: true,
                                data: data,
                            });
                        });
                    });
                    promise.then((data) => {
                        if (!data.status) {
                            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
                        }
                        for (let i = 0; i < data.data.length; i++) {
                            favoriteEezlyItemsArr.push(data.data[i].eezly_item_id);
                        }
                        hits.hits.forEach((record, index) => {
                            if (favoriteEezlyItemsArr.indexOf(parseInt(record.id)) !== -1) {
                                hits.hits[index].isFavourite = 1;
                            }
                            else {
                                hits.hits[index].isFavourite = 0;
                            }
                        });
                        Response(hits);
                    });
                }
            }
            else {
                Response("Not Found");
            }
        }).catch((err) => {
            console.error(err);
        });
    };
    let Response = (result) => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            data: result.hits,
            facets: result.facets,
            currentpage: result.page,
            totalpages: result.nbPages
        });
    };
    /* Start */
    ValidationStep1();
}));
// Get Eezly Items Based on Listed Parameter
app.put("/listed", ApiAuth, (req, res) => {
    let User = req.body.user;
    let ItemId = req.query.eezly_item_id;
    let Listed = req.query.listed;
    let EezlyItemData = null;
    let SettingsData = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'list_eezly_items');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for Listed */
        if (!(Listed === 'true' || Listed === 'false')) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Selected listed is invalid');
        }
        /* Check of Eezly Item Id Exists */
        let checkIdExists = yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items', '*', `id = '${ItemId}'`, null, null, null);
        if (checkIdExists.status) {
            if (checkIdExists.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected eezly item id is invalid');
            }
            EezlyItemData = checkIdExists.data;
            GetSettings();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, checkIdExists.message);
        }
    });
    let GetSettings = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, common_modules_1.GetGeneralSettings)();
        if (data.status) {
            SettingsData = data.data;
            UpdateData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let UpdateData = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `UPDATE eezly_items SET listed = '${Listed}', updated_by = '${User.user_id}', updated_at = '${app.get("DBDateFormat")()}' WHERE id = '${ItemId}'`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            // If listed is true create algolia other delete from algolia
            if (Listed !== EezlyItemData[0].listed && Listed === 'true') {
                if (EezlyItemData[0].name !== '' && EezlyItemData[0].name != null) {
                    let algoliaData = {
                        "id": `${ItemId}`,
                        "name": EezlyItemData[0].name,
                        "brand": EezlyItemData[0].brand,
                        "listed": "true",
                        "size": EezlyItemData[0].size,
                        "thumbnail": EezlyItemData[0].thumbnail,
                    };
                    addInAlgolia(algoliaData, 'en', SettingsData[0].environment);
                }
                if (EezlyItemData[0].name_fr !== '' && EezlyItemData[0].name_fr != null) {
                    let algoliaData = {
                        "id": `${ItemId}`,
                        "name": EezlyItemData[0].name_fr,
                        "brand": EezlyItemData[0].brand,
                        "listed": "true",
                        "size": EezlyItemData[0].size,
                        "thumbnail": EezlyItemData[0].thumbnail,
                    };
                    addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
                }
            }
            else if (Listed !== EezlyItemData[0].listed && Listed === 'false') {
                if (EezlyItemData[0].name !== '' && EezlyItemData[0].name != null) {
                    deleteFromAlgolia(EezlyItemData[0].name, SettingsData[0].environment, 'en');
                }
                if (EezlyItemData[0].name_fr !== '' && EezlyItemData[0].name_fr != null) {
                    deleteFromAlgolia(EezlyItemData[0].name_fr, SettingsData[0].environment, 'fr');
                }
            }
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Eezly item updated successfully');
    };
    /* Start */
    CheckRolePermission();
});
// Add/Update Grocery Item List
app.post(["/addGroceryItemList", "/updateGroceryItemList"], ApiAuth, (req, res) => {
    let User = req.body.user;
    let ItemId = req.body.eezly_item_id;
    let GroceryItemList = req.body.groceryItemList;
    let Stores = null;
    /* Stores */
    let IgaItems = null;
    let SupercItems = null;
    let MaxiItems = null;
    let MetroItems = null;
    let ProvigoItems = null;
    let WalmartItems = null;
    let EezlyItemThumbnail = null;
    let FirstGroceryItemThumbnail = null;
    /* Stores */
    let SuccessMessage = "";
    let RequestSubUrl = req.originalUrl.split("/")[2];
    if (RequestSubUrl === "addGroceryItemList") {
        SuccessMessage = "Grocery item list added successfully";
    }
    else {
        SuccessMessage = "Grocery item list updated successfully";
    }
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'grocery item', value: GroceryItemList, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A", "A.*", `A.id = '${ItemId}'`, null, null, null).then((data) => {
            if (!data.status) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
            }
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected eezly item id is invalid');
            }
            EezlyItemThumbnail = data.data.thumbnail;
            getAllStores();
        });
    });
    let getAllStores = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, "stores", "*", "deleted_at IS NULL", null, null, null).then((Data) => {
            if (Data.status) {
                Stores = Data.data;
                FetchData();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        });
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        var typeArrayNew = { 'iga': new Array(), 'superc': new Array(), 'maxi': new Array(), 'metro': new Array(), 'provigo': new Array(), 'walmart': new Array() };
        var temp;
        GroceryItemList = JSON.parse(GroceryItemList);
        for (let i = 0; i < GroceryItemList.length; i++) {
            temp = GroceryItemList[i];
            switch (temp.store_name) {
                case common_modules_1.StoreNameObject.iga:
                    typeArrayNew.iga.push(temp.store_item);
                    break;
                case common_modules_1.StoreNameObject.superc:
                    typeArrayNew.superc.push(temp.store_item);
                    break;
                case common_modules_1.StoreNameObject.maxi:
                    typeArrayNew.maxi.push(temp.store_item);
                    break;
                case common_modules_1.StoreNameObject.metro:
                    typeArrayNew.metro.push(temp.store_item);
                    break;
                case common_modules_1.StoreNameObject.provigo:
                    typeArrayNew.provigo.push(temp.store_item);
                    break;
                case common_modules_1.StoreNameObject.walmart:
                    typeArrayNew.walmart.push(temp.store_item);
                    break;
                default:
                    break;
            }
        }
        ;
        var typeArray = (0, common_modules_1.StoreNamesArray)();
        const newPromises = typeArray.map((row, index, arr) => __awaiter(void 0, void 0, void 0, function* () {
            var condition = "";
            switch (row) {
                case "iga_items":
                    condition = "'" + typeArrayNew.iga.join("','") + "'";
                    break;
                case "superc_items":
                    condition = "'" + typeArrayNew.superc.join("','") + "'";
                    break;
                case "maxi_items":
                    condition = "'" + typeArrayNew.maxi.join("','") + "'";
                    break;
                case "metro_items":
                    condition = "'" + typeArrayNew.metro.join("','") + "'";
                    break;
                case "provigo_items":
                    condition = "'" + typeArrayNew.provigo.join("','") + "'";
                    break;
                case "walmart_items":
                    condition = "'" + typeArrayNew.walmart.join("','") + "'";
                    break;
                default:
                    break;
            }
            let sql = `select * from ${row} where sku IN (${condition})`;
            return new Promise((resolve, reject) => {
                if (condition == "''") {
                    return resolve({
                        status: true,
                        data: [],
                        storeName: row,
                    });
                }
                db_modules_1.dbCon.query(sql, (err, data) => {
                    if (err) {
                        return resolve({
                            status: false,
                            message: err.message,
                        });
                    }
                    return resolve({
                        status: true,
                        data: data,
                        storeName: row,
                    });
                });
            });
        }));
        yield Promise.all(newPromises).then((data) => {
            data.forEach((row) => {
                switch (row.storeName) {
                    case "iga_items":
                        IgaItems = row.data;
                        break;
                    case "superc_items":
                        SupercItems = row.data;
                        break;
                    case "maxi_items":
                        MaxiItems = row.data;
                        break;
                    case "metro_items":
                        MetroItems = row.data;
                        break;
                    case "provigo_items":
                        ProvigoItems = row.data;
                        break;
                    case "walmart_items":
                        WalmartItems = row.data;
                        break;
                    default:
                        break;
                }
            });
        }).then(() => {
            MainProcess();
        });
    });
    let MainProcess = () => __awaiter(void 0, void 0, void 0, function* () {
        let Status = 0;
        for (let i = 0; i < GroceryItemList.length; i++) {
            /* Check for Store Id and Name Exists */
            Status = 0;
            for (let j = 0; j < Stores.length; j++) {
                if ((GroceryItemList[i].store_id === Stores[j].id) && (GroceryItemList[i].store_name === Stores[j].name)) {
                    Status = 1;
                    break;
                }
            }
            if (Status == 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, "Invalid store id and name in grocery item list");
            }
            /* Check for Store with sku */
            if (GroceryItemList[i].store_name === "iga") {
                Status = 0;
                for (let k = 0; k < IgaItems.length; k++) {
                    if (GroceryItemList[i].store_item === IgaItems[k].sku) {
                        Status = 1;
                        if (i === 0) {
                            FirstGroceryItemThumbnail = IgaItems[k].image;
                        }
                        break;
                    }
                }
                if (Status === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, "Invalid store");
                }
            }
            else if (GroceryItemList[i].store_name === "superc") {
                Status = 0;
                for (let l = 0; l < SupercItems.length; l++) {
                    if (GroceryItemList[i].store_item === SupercItems[l].sku) {
                        Status = 1;
                        if (i === 0) {
                            FirstGroceryItemThumbnail = SupercItems[l].image;
                        }
                        break;
                    }
                }
                if (Status === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, "Invalid store");
                }
            }
            else if (GroceryItemList[i].store_name === "maxi") {
                Status = 0;
                for (let l = 0; l < MaxiItems.length; l++) {
                    if (GroceryItemList[i].store_item === MaxiItems[l].sku) {
                        Status = 1;
                        if (i === 0) {
                            FirstGroceryItemThumbnail = MaxiItems[l].image;
                        }
                        break;
                    }
                }
                if (Status === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, "Invalid store");
                }
            }
            else if (GroceryItemList[i].store_name === "metro") {
                Status = 0;
                for (let l = 0; l < MetroItems.length; l++) {
                    if (GroceryItemList[i].store_item === MetroItems[l].sku) {
                        Status = 1;
                        if (i === 0) {
                            FirstGroceryItemThumbnail = MetroItems[l].image;
                        }
                        break;
                    }
                }
                if (Status === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, "Invalid store");
                }
            }
            else if (GroceryItemList[i].store_name === "provigo") {
                Status = 0;
                for (let l = 0; l < ProvigoItems.length; l++) {
                    if (GroceryItemList[i].store_item === ProvigoItems[l].sku) {
                        Status = 1;
                        if (i === 0) {
                            FirstGroceryItemThumbnail = ProvigoItems[l].image;
                        }
                        break;
                    }
                }
                if (Status === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, "Invalid store");
                }
            }
            else if (GroceryItemList[i].store_name === "walmart") {
                Status = 0;
                for (let l = 0; l < WalmartItems.length; l++) {
                    if (GroceryItemList[i].store_item === WalmartItems[l].sku) {
                        Status = 1;
                        if (i === 0) {
                            FirstGroceryItemThumbnail = WalmartItems[l].image;
                        }
                        break;
                    }
                }
                if (Status === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, "Invalid store");
                }
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, "Invalid store");
            }
        }
        /* Updating Record */
        let sql = '';
        if (EezlyItemThumbnail === null) {
            sql = `UPDATE eezly_items SET grocery_items = '${JSON.stringify(GroceryItemList)}', thumbnail = '${FirstGroceryItemThumbnail}', updated_by = '${User.user_id}', updated_at = '${app.get("DBDateFormat")()}' WHERE id = '${ItemId}'`;
        }
        else {
            sql = `UPDATE eezly_items SET grocery_items = '${JSON.stringify(GroceryItemList)}', updated_by = '${User.user_id}', updated_at = '${app.get("DBDateFormat")()}' WHERE id = '${ItemId}'`;
        }
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((data) => {
            if (!data.status) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
            }
            Response();
        });
    });
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            message: SuccessMessage
        });
    };
    /* Start */
    ValidationStep1();
});
// Update Catalog Information
app.post("/updateCatalogInformation", ApiAuth, (req, res) => {
    let User = req.body.user;
    let ItemId = req.body.eezly_item_id;
    let ProductDescription = (req.body.product_description !== '' && req.body.product_description != null) ? req.body.product_description.replace(/[\u0300-\u036f]/g, "") : null;
    let ProductDescriptionFr = (req.body.product_description_fr !== '' && req.body.product_description_fr != null) ? req.body.product_description_fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®".*+?^${}()|[\]\\]/g, "") : null;
    let Ingredients = (req.body.ingredients !== '' && req.body.ingredients != null) ? req.body.ingredients.replace(/[\u0300-\u036f]/g, "") : null;
    let IngredientsFr = (req.body.ingredients_fr !== '' && req.body.ingredients_fr != null) ? req.body.ingredients_fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®".*+?^${}()|[\]\\]/g, "") : null;
    let NutritionalInformation = (req.body.nutritional_information !== '' && req.body.nutritional_information != null) ? req.body.nutritional_information.replace(/[\u0300-\u036f]/g, "") : null;
    let NutritionalInformationFr = (req.body.nutritional_information_fr !== '' && req.body.nutritional_information_fr != null) ? req.body.nutritional_information_fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®".*+?^${}()|[\]\\]/g, "") : null;
    let Photos = (req.body.photos !== '' && req.body.photos != null) ? req.body.photos : null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'modify_eezly_items');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check of Eezly Item Id Exists */
        let data = yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items', '*', `id = '${ItemId}'`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected eezly item id is invalid');
            }
            MainProcess();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let MainProcess = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Updating Record */
        let sql = `UPDATE eezly_items SET description = IF("${ProductDescription}" = "null", null, "${ProductDescription}"), description_fr = IF("${ProductDescriptionFr}" = "null", null, "${ProductDescriptionFr}"), ingredients = IF("${Ingredients}" = "null", null, "${Ingredients}"), ingredients_fr = IF("${IngredientsFr}" = "null", null, "${IngredientsFr}"), nutritional_info = IF("${NutritionalInformation}" = "null", null, "${NutritionalInformation}"), nutritional_info_fr = IF("${NutritionalInformationFr}" = "null", null, "${NutritionalInformationFr}"), photos = IF('${Photos}' = 'null', null, '${Photos}'), updated_by = "${User.user_id}", updated_at = "${(0, common_modules_1.DBDateFormatModule)()}" WHERE id = "${ItemId}"`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Eezly item catalog information updated successfully');
    };
    /* Start */
    CheckRolePermission();
});
// Get Eezly Item By Aisle Id
app.get("/getEezlyItemByAisleId", (req, res) => {
    let eezly_aisle_id = req.query.eezly_aisle_id;
    let User = req.body.user;
    let SettingsData = null;
    let SettingsThumbnailStores = null;
    /* Stores */
    let EezlyItems = null;
    let GroceryItems = [];
    let NoOfRecords = req.query.no_of_records;
    let Status = 0;
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let ValidationStep1 = () => {
        if (NoOfRecords === '' || NoOfRecords == null) {
            return res.status(app.get("BadRequestStatus")).json({
                status: false,
                message: 'Number of records is required'
            });
        }
        if (eezly_aisle_id === '' || eezly_aisle_id === null || eezly_aisle_id === undefined) {
            return res.status(app.get("BadRequestStatus")).json({
                status: false,
                message: 'Eezly aisle id is required'
            });
        }
        GetSettings();
    };
    let GetSettings = () => {
        (0, crud_modules_1.RunAnyQuery)("select * from settings where id = 1").then((Data) => {
            if (Data.status) {
                SettingsData = Data.data;
                SettingsThumbnailStores = (SettingsData[0].priority_stores_thumbnail !== '' || SettingsData[0].priority_stores_thumbnail != null) ? SettingsData[0].priority_stores_thumbnail.split(',') : [];
                FetchData();
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: Data.message
                });
            }
        });
    };
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A", "COUNT(*) AS Total", `A.deleted_at IS NULL AND A.listed = true AND A.eezly_aisle_id = ${eezly_aisle_id}`, null, null, null).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
            if (Data.status) {
                Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/eezly_items", Page, NoOfRecords, parseInt(Data.data[0].Total));
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.OK).json({
                    status: false,
                    message: Data.message
                });
            }
        }));
        if (Pagination) {
            yield (0, crud_modules_2.SelectQueryModule)(db_modules_1.dbCon, `eezly_items A`, `A.*, A.grocery_items AS raw_grocery_items, (SELECT B.name FROM eezly_aisles B WHERE B.id = A.eezly_aisle_id) AS aisle_name, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.deleted_at IS NULL AND A.listed = true AND A.eezly_aisle_id = ${eezly_aisle_id}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`).then((Data) => {
                if (Data.status) {
                    return { status: true, data: Data.data };
                }
                else {
                    return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        message: Data.message
                    });
                }
            }).then((d) => __awaiter(void 0, void 0, void 0, function* () {
                if (d.status && d.data.length > 0) {
                    EezlyItems = d.data;
                    var typeArrayNew = { 'iga': new Array(), 'superc': new Array(), 'maxi': new Array(), 'metro': new Array(), 'provigo': new Array(), 'walmart': new Array() };
                    var temp;
                    var e;
                    EezlyItems.forEach((row, i) => {
                        temp = JSON.parse(row.raw_grocery_items);
                        for (e = 0; e < temp.length; e++) {
                            switch (temp[e].store_name) {
                                case "iga":
                                    typeArrayNew.iga.push(temp[e].store_item);
                                    break;
                                case "superc":
                                    typeArrayNew.superc.push(temp[e].store_item);
                                    break;
                                case "maxi":
                                    typeArrayNew.maxi.push(temp[e].store_item);
                                    break;
                                case "metro":
                                    typeArrayNew.metro.push(temp[e].store_item);
                                    break;
                                case "provigo":
                                    typeArrayNew.provigo.push(temp[e].store_item);
                                    break;
                                case "walmart":
                                    typeArrayNew.walmart.push(temp[e].store_item);
                                    break;
                                default:
                                    break;
                            }
                        }
                    });
                    var typeArray = ['iga_items', 'superc_items', 'maxi_items', 'metro_items', 'provigo_items', 'walmart_items'];
                    const newPromises = typeArray.map((row, index, arr) => __awaiter(void 0, void 0, void 0, function* () {
                        var condition = "";
                        switch (row) {
                            case "iga_items":
                                condition = "'" + typeArrayNew.iga.join("','") + "'";
                                break;
                            case "superc_items":
                                condition = "'" + typeArrayNew.superc.join("','") + "'";
                                break;
                            case "maxi_items":
                                condition = "'" + typeArrayNew.maxi.join("','") + "'";
                                break;
                            case "metro_items":
                                condition = "'" + typeArrayNew.metro.join("','") + "'";
                                break;
                            case "provigo_items":
                                condition = "'" + typeArrayNew.provigo.join("','") + "'";
                                break;
                            case "walmart_items":
                                condition = "'" + typeArrayNew.walmart.join("','") + "'";
                                break;
                            default:
                                break;
                        }
                        let sql = `select * from ${row} where sku IN (${condition})`;
                        return new Promise((resolve, reject) => {
                            if (condition == "''") {
                                return resolve({
                                    status: true,
                                    data: [],
                                    storeName: row,
                                });
                            }
                            db_modules_1.dbCon.query(sql, (err, data) => {
                                if (err) {
                                    return resolve({
                                        status: false,
                                        message: err.message,
                                    });
                                }
                                return resolve({
                                    status: true,
                                    data: data,
                                    storeName: row,
                                });
                            });
                        });
                    }));
                    yield Promise.all(newPromises).then((data) => {
                        data.forEach((row, index) => {
                            if (row.data.length > 0) {
                                row.data.forEach((element, i) => {
                                    for (let a = 0; a < EezlyItems.length; a++) {
                                        if (EezlyItems[a].raw_grocery_items !== null && EezlyItems[a].raw_grocery_items !== "") {
                                            let EGroceryItems = JSON.parse(EezlyItems[a].raw_grocery_items);
                                            for (let i = 0; i < EGroceryItems.length; i++) {
                                                let SubArray = {
                                                    store_id: EGroceryItems[i].store_id,
                                                    store_name: EGroceryItems[i].store_name
                                                };
                                                if (element.sku === EGroceryItems[i].store_item) {
                                                    SubArray["item_details"] = {
                                                        id: element.id,
                                                        category: element.category,
                                                        aisle: element.aisle,
                                                        subCategory: element.subCategory,
                                                        sku: element.sku,
                                                        name: element.name,
                                                        french_name: element.french_name,
                                                        brand: element.brand,
                                                        regular_price: element.regular_price,
                                                        sale_price: element.sale_price,
                                                        image: element.image,
                                                        url: element.url,
                                                        size_label: element.size_label,
                                                        size: element.size
                                                    };
                                                    if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                                        if (SettingsThumbnailStores.includes(`${index}`)) {
                                                            EezlyItems[a].thumbnail = element.image;
                                                            Status = 1;
                                                        }
                                                    }
                                                    GroceryItems.push(SubArray);
                                                }
                                            }
                                            if (GroceryItems.length > 0) {
                                                EezlyItems[a].grocery_items = GroceryItems;
                                            }
                                            GroceryItems = [];
                                        }
                                    }
                                });
                            }
                        });
                    }).then((data) => {
                        Pagination.status = true;
                        Pagination.data = EezlyItems;
                        return res.status(http_status_codes_1.StatusCodes.OK).json(Pagination);
                    });
                }
                else {
                    return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({ status: false, message: "An unhandled error exception" });
                }
            }));
        }
    });
    /* Start */
    ValidationStep1();
});
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
// Delete Eezly Item From Algolia
function deleteFromAlgolia(name, environment, lang) {
    const indexval = environment + "_eezly_" + lang;
    const clientIn = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
    const index = clientIn.initIndex(`${indexval}`);
    // Search for the record with the specified attribute value
    index.search(name).then((response) => {
        if (response.hits.length > 0) {
            const objectIDToDelete = response.hits[0].objectID;
            return index.deleteObject(objectIDToDelete);
        }
        else {
            console.log('Record not found.');
        }
    })
        .then((response) => {
        if (response) {
            console.log('Record deleted successfully:', response);
        }
    })
        .catch((error) => {
        console.error('Error deleting record:', error);
    });
}
module.exports = app;
