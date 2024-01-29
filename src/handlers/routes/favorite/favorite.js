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
const validator_modules_1 = require("../../modules/validator.modules");
const common_modules_1 = require("../../modules/common.modules");
const crud_modules_1 = require("../../modules/crud.modules");
const db_modules_1 = require("../../modules/db.modules");
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
const formData = require('express-form-data');
const os = require("os");
const cors = require('cors');
const mysql = require('mysql');
app.use(cors());
app.use(formData.parse({
    uploadDir: os.tmpdir(),
    autoClean: true
}));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());
const moment = require("moment");
const ApiAuth = require("../../lib/auth");
// Favorite/UnFavorite Eezly Item
app.put('/update', ApiAuth, (req, res) => {
    let User = req.body.user;
    let EezlyItemId = req.query.eezly_item_id;
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Eezly item id', value: EezlyItemId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for valid Cart Id */
        let checkValidId = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items', '*', `id = ${EezlyItemId}`, null, null, null);
        if (checkValidId.status) {
            if (checkValidId.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected Eezly item id is invalid');
            }
            CheckFavoriteStatus();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, checkValidId.message);
        }
    });
    let CheckFavoriteStatus = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for item favourite status */
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'favorites', '*', `customer_id = ${User.user_id} AND eezly_item_id = ${EezlyItemId}`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                AddEezlyItemInFavoriteList();
            }
            else {
                RemoveEezlyItemFromFavoriteList();
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let AddEezlyItemInFavoriteList = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `INSERT INTO favorites (customer_id, eezly_item_id) VALUES (${User.user_id}, ${EezlyItemId})`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let RemoveEezlyItemFromFavoriteList = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`DELETE FROM favorites WHERE customer_id = ${User.user_id} AND eezly_item_id = ${EezlyItemId}`);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Favorite list updated successfully');
    };
    /* Start */
    ValidationStep1();
});
// Get Favorite Items List
app.get('/all', ApiAuth, (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let NoOfRecords = req.query.no_of_records;
    let Lang = (req.query.lang === '' || req.query.lang == null) ? 'en' : req.query.lang;
    let FavoriteItems = [];
    let FilterGroceryItems = [];
    let GroceryItems = [];
    let whereCondition = '';
    let SettingsData = null;
    let SettingsThumbnailStores = null;
    let Status = 0;
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
        GetSettings();
    };
    let GetSettings = () => {
        app.get("SelectQuery")(db, "settings", "*", "id = 1", null, null, null).then((Data) => {
            if (Data.status) {
                SettingsData = Data.data;
                SettingsThumbnailStores = (SettingsData[0].priority_stores_thumbnail !== '' || SettingsData[0].priority_stores_thumbnail != null) ? SettingsData[0].priority_stores_thumbnail.split(',') : [];
                GetFavoriteItemsList("favorite_items_count");
            }
            else {
                return res.status(app.get("BadRequestStatus")).json({
                    status: false,
                    message: Data.message
                });
            }
        });
    };
    let GetFavoriteItemsList = (Type) => {
        const tables = `favorites A
                    INNER JOIN eezly_items B ON A.eezly_item_id = B.id
                    LEFT JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`;
        const columns = `B.id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN B.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                    END AS name, B.thumbnail, B.brand, B.size, B.eezly_aisle_id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN C.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(C.name_fr, C.name)
                    END AS eezly_aisle_name, B.grocery_items AS raw_grocery_items,
                    CASE
                        WHEN '${Lang}' = 'en' THEN B.description
                        WHEN '${Lang}' = 'fr' THEN COALESCE(B.description_fr, B.description)
                    END AS description,
                    CASE
                        WHEN '${Lang}' = 'en' THEN B.ingredients
                        WHEN '${Lang}' = 'fr' THEN COALESCE(B.ingredients_fr, B.ingredients)
                    END AS ingredients,
                    CASE
                        WHEN '${Lang}' = 'en' THEN B.nutritional_info
                        WHEN '${Lang}' = 'fr' THEN COALESCE(B.nutritional_info_fr, B.nutritional_info)
                    END AS nutritional_info, B.photos, B.listed, (SELECT C.fullName FROM users C WHERE B.created_by = C.id) AS created_by, (SELECT D.fullName FROM users D WHERE B.updated_by = D.id) AS updated_by, B.created_at, B.updated_at`;
        if (Type === "favorite_items_count") {
            app.get("SelectQuery")(db, tables, `COUNT(*) AS Total`, `A.customer_id = ${User.user_id} AND B.deleted_at IS NULL`, null, null, null).then((Data) => {
                if (Data.status) {
                    Pagination = app.get("Pagination")(req, app.get("BaseUrl") + "/favorite/all", Page, NoOfRecords, parseInt(Data.data[0].Total));
                    GetFavoriteItemsList("favorite_items");
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        }
        else if (Type === "favorite_items") {
            app.get("SelectQuery")(db, tables, columns, `A.customer_id = ${User.user_id} AND B.deleted_at IS NULL`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`).then((Data) => {
                if (Data.status) {
                    FavoriteItems = Data.data;
                    FindRelevantStoreRecords();
                }
                else {
                    return res.status(app.get("ErrorStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        }
    };
    let FindRelevantStoreRecords = () => {
        for (let i = 0; i < FavoriteItems.length; i++) {
            FilterGroceryItems = JSON.parse(FavoriteItems[i].raw_grocery_items);
            for (let j = 0; j < FilterGroceryItems.length; j++) {
                if (FilterGroceryItems[j].store_id === 1) {
                    if (!igaStoreSkuList.includes(FilterGroceryItems[j].store_item)) {
                        igaStoreSkuList.push(FilterGroceryItems[j].store_item);
                    }
                }
                else if (FilterGroceryItems[j].store_id === 2) {
                    if (!supercStoreSkuList.includes(FilterGroceryItems[j].store_item)) {
                        supercStoreSkuList.push(FilterGroceryItems[j].store_item);
                    }
                }
                else if (FilterGroceryItems[j].store_id === 3) {
                    if (!maxiStoreSkuList.includes(FilterGroceryItems[j].store_item)) {
                        maxiStoreSkuList.push(FilterGroceryItems[j].store_item);
                    }
                }
                else if (FilterGroceryItems[j].store_id === 4) {
                    if (!metroStoreSkuList.includes(FilterGroceryItems[j].store_item)) {
                        metroStoreSkuList.push(FilterGroceryItems[j].store_item);
                    }
                }
                else if (FilterGroceryItems[j].store_id === 5) {
                    if (!provigoStoreSkuList.includes(FilterGroceryItems[j].store_item)) {
                        provigoStoreSkuList.push(FilterGroceryItems[j].store_item);
                    }
                }
                else if (FilterGroceryItems[j].store_id === 6) {
                    if (!walmartStoreSkuList.includes(FilterGroceryItems[j].store_item)) {
                        walmartStoreSkuList.push(FilterGroceryItems[j].store_item);
                    }
                }
            }
        }
        FetchData("iga_items");
    };
    let FetchData = (Type) => {
        if (Type === "iga_items") {
            const escapedStringArray = igaStoreSkuList.map((value) => mysql.escape(value));
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('')`;
            app.get("SelectQuery")(db, "iga_items A", "*", `${whereCondition}`, null, null, null).then((Data) => {
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
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('')`;
            app.get("SelectQuery")(db, "superc_items A", "*", `${whereCondition}`, null, null, null).then((Data) => {
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
            whereCondition = escapedStringArray.length > 0 ? `sku IN (${escapedStringArray.join(",")})` : `sku IN ('')`;
            app.get("SelectQuery")(db, "maxi_items A", "*", `${whereCondition}`, null, null, null).then((Data) => {
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
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('')`;
            app.get("SelectQuery")(db, "metro_items A", "*", `${whereCondition}`, null, null, null).then((Data) => {
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
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('')`;
            app.get("SelectQuery")(db, "provigo_items A", "*", `${whereCondition}`, null, null, null).then((Data) => {
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
            whereCondition = escapedStringArray.length > 0 ? `A.sku IN (${escapedStringArray.join(",")})` : `A.sku IN ('')`;
            app.get("SelectQuery")(db, "walmart_items A", "*", `${whereCondition}`, null, null, null).then((Data) => {
                if (Data.status) {
                    WalmartItems = Data.data;
                    MainProcess();
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
    let MainProcess = () => {
        for (let a = 0; a < FavoriteItems.length; a++) {
            Status = 0;
            if (FavoriteItems[a].raw_grocery_items !== null && FavoriteItems[a].raw_grocery_items !== "") {
                let EGroceryItems = JSON.parse(FavoriteItems[a].raw_grocery_items);
                for (let i = 0; i < EGroceryItems.length; i++) {
                    let SubArray = {
                        store_id: EGroceryItems[i].store_id,
                        store_name: EGroceryItems[i].store_name
                    };
                    if (EGroceryItems[i].store_name === 'iga') {
                        for (let j = 0; j < IgaItems.length; j++) {
                            if (IgaItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = {
                                    id: IgaItems[j].id,
                                    category: IgaItems[j].category,
                                    aisle: IgaItems[j].aisle,
                                    subCategory: IgaItems[j].subCategory,
                                    sku: IgaItems[j].sku,
                                    name: IgaItems[j].name,
                                    french_name: IgaItems[j].french_name,
                                    brand: IgaItems[j].brand,
                                    regular_price: IgaItems[j].regular_price,
                                    sale_price: IgaItems[j].sale_price,
                                    image: IgaItems[j].image,
                                    url: IgaItems[j].url,
                                    size_label: IgaItems[j].size_label,
                                    size: IgaItems[j].size
                                };
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("1")) {
                                        FavoriteItems[a].thumbnail = IgaItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    else if (EGroceryItems[i].store_name === 'superc') {
                        for (let j = 0; j < SupercItems.length; j++) {
                            if (SupercItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = {
                                    id: SupercItems[j].id,
                                    category: SupercItems[j].category,
                                    aisle: SupercItems[j].aisle,
                                    subCategory: SupercItems[j].subCategory,
                                    sku: SupercItems[j].sku,
                                    name: SupercItems[j].name,
                                    french_name: SupercItems[j].french_name,
                                    brand: SupercItems[j].brand,
                                    regular_price: SupercItems[j].regular_price,
                                    sale_price: SupercItems[j].sale_price,
                                    image: SupercItems[j].image,
                                    url: SupercItems[j].url,
                                    size_label: SupercItems[j].size_label,
                                    size: SupercItems[j].size
                                };
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("2")) {
                                        FavoriteItems[a].thumbnail = SupercItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    else if (EGroceryItems[i].store_name === 'maxi') {
                        for (let j = 0; j < MaxiItems.length; j++) {
                            if (MaxiItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = {
                                    id: MaxiItems[j].id,
                                    category: MaxiItems[j].category,
                                    aisle: MaxiItems[j].aisle,
                                    subCategory: MaxiItems[j].subCategory,
                                    sku: MaxiItems[j].sku,
                                    name: MaxiItems[j].name,
                                    french_name: MaxiItems[j].french_name,
                                    brand: MaxiItems[j].brand,
                                    regular_price: MaxiItems[j].regular_price,
                                    sale_price: MaxiItems[j].sale_price,
                                    image: MaxiItems[j].image,
                                    url: MaxiItems[j].url,
                                    size_label: MaxiItems[j].size_label,
                                    size: MaxiItems[j].size
                                };
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("3")) {
                                        FavoriteItems[a].thumbnail = MaxiItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    else if (EGroceryItems[i].store_name === 'metro') {
                        for (let j = 0; j < MetroItems.length; j++) {
                            if (MetroItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = {
                                    id: MetroItems[j].id,
                                    category: MetroItems[j].category,
                                    aisle: MetroItems[j].aisle,
                                    subCategory: MetroItems[j].subCategory,
                                    sku: MetroItems[j].sku,
                                    name: MetroItems[j].name,
                                    french_name: MetroItems[j].french_name,
                                    brand: MetroItems[j].brand,
                                    regular_price: MetroItems[j].regular_price,
                                    sale_price: MetroItems[j].sale_price,
                                    image: MetroItems[j].image,
                                    url: MetroItems[j].url,
                                    size_label: MetroItems[j].size_label,
                                    size: MetroItems[j].size
                                };
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("4")) {
                                        FavoriteItems[a].thumbnail = MetroItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    else if (EGroceryItems[i].store_name === 'provigo') {
                        for (let j = 0; j < ProvigoItems.length; j++) {
                            if (ProvigoItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = {
                                    id: ProvigoItems[j].id,
                                    category: ProvigoItems[j].category,
                                    aisle: ProvigoItems[j].aisle,
                                    subCategory: ProvigoItems[j].subCategory,
                                    sku: ProvigoItems[j].sku,
                                    name: ProvigoItems[j].name,
                                    french_name: ProvigoItems[j].french_name,
                                    brand: ProvigoItems[j].brand,
                                    regular_price: ProvigoItems[j].regular_price,
                                    sale_price: ProvigoItems[j].sale_price,
                                    image: ProvigoItems[j].image,
                                    url: ProvigoItems[j].url,
                                    size_label: ProvigoItems[j].size_label,
                                    size: ProvigoItems[j].size
                                };
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("5")) {
                                        FavoriteItems[a].thumbnail = ProvigoItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    else if (EGroceryItems[i].store_name === 'walmart') {
                        for (let j = 0; j < WalmartItems.length; j++) {
                            if (WalmartItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = {
                                    id: WalmartItems[j].id,
                                    category: WalmartItems[j].category,
                                    aisle: WalmartItems[j].aisle,
                                    subCategory: WalmartItems[j].subCategory,
                                    sku: WalmartItems[j].sku,
                                    name: WalmartItems[j].name,
                                    french_name: WalmartItems[j].french_name,
                                    brand: WalmartItems[j].brand,
                                    regular_price: WalmartItems[j].regular_price,
                                    sale_price: WalmartItems[j].sale_price,
                                    image: WalmartItems[j].image,
                                    url: WalmartItems[j].url,
                                    size_label: WalmartItems[j].size_label,
                                    size: WalmartItems[j].size
                                };
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("6")) {
                                        FavoriteItems[a].thumbnail = WalmartItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    GroceryItems.push(SubArray);
                }
                FavoriteItems[a].grocery_items = GroceryItems;
                GroceryItems = [];
            }
        }
        Response();
    };
    let Response = () => {
        Pagination.status = true;
        Pagination.data = FavoriteItems;
        return res.status(app.get("SuccessStatus")).json(Pagination);
    };
    // Start
    ValidationStep1();
});
module.exports = app;
