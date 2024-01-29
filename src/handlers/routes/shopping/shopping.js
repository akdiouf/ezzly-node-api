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
const http_status_codes_1 = require("http-status-codes");
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
app.post('/createShoppingList', ApiAuth, (req, res) => {
    let User = req.body.user;
    let CartId = req.body.cart_id;
    let Lang = req.body.lang ? req.body.lang : 'en';
    let CartData = null;
    let CartItemDetail = [];
    let EezlyItemIdsArr = [];
    let EezlyItemsDetail = [];
    let Stores = [];
    // Get the current week number
    const currentWeekNumber = moment().isoWeek();
    /* Stores */
    let IgaItems = [];
    let SupercItems = [];
    let MaxiItems = [];
    let MetroItems = [];
    let ProvigoItems = [];
    let WalmartItems = [];
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Cart id', value: CartId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for valid Cart Id */
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `carts A`, "A.*", `A.id = ${CartId} AND A.status = 1`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected cart id is invalid.');
                }
                CartData = Data.data;
                UpdateCartStatusToValidated();
                FetchCartDetails();
            }
            else {
                return (0, common_modules_1.GenerateErrorResponse)(res, Data.message);
            }
        });
    });
    let UpdateCartStatusToValidated = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `UPDATE carts SET verification_date = '${app.get("DBDateFormat")()}', updated_at = '${app.get("DBDateFormat")()}', status = 3 WHERE id = '${CartId}'`;
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((data) => {
            if (!data.status) {
                return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
            }
        });
    });
    let FetchCartDetails = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `cart_details A`, "A.*", `A.cart_id = ${CartId}`, null, null, null).then((Data) => {
            if (Data.status) {
                CartItemDetail = Data.data;
                for (let i = 0; i < CartItemDetail.length; i++) {
                    EezlyItemIdsArr.push(CartItemDetail[i].eezly_item_id);
                }
                FetchEezlyItemsDetails();
            }
            else {
                return (0, common_modules_1.GenerateErrorResponse)(res, Data.message);
            }
        });
    });
    let FetchEezlyItemsDetails = () => __awaiter(void 0, void 0, void 0, function* () {
        let whereCondition = EezlyItemIdsArr.length > 0 ? `A.id IN (${EezlyItemIdsArr.join(",")})` : `A.id IN ('')`;
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `eezly_items A`, "A.*", `${whereCondition}`, null, null, null).then((Data) => {
            if (Data.status) {
                EezlyItemsDetail = Data.data;
                FetchData();
            }
            else {
                return (0, common_modules_1.GenerateErrorResponse)(res, Data.message);
            }
        });
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        var typeArrayNew = { 'iga': new Array(), 'superc': new Array(), 'maxi': new Array(), 'metro': new Array(), 'provigo': new Array(), 'walmart': new Array() };
        var temp;
        var e;
        EezlyItemsDetail.forEach((row, i) => {
            temp = JSON.parse(row.grocery_items);
            for (e = 0; e < temp.length; e++) {
                switch (temp[e].store_name) {
                    case common_modules_1.StoreNameObject.iga:
                        typeArrayNew.iga.push(temp[e].store_item);
                        break;
                    case common_modules_1.StoreNameObject.superc:
                        typeArrayNew.superc.push(temp[e].store_item);
                        break;
                    case common_modules_1.StoreNameObject.maxi:
                        typeArrayNew.maxi.push(temp[e].store_item);
                        break;
                    case common_modules_1.StoreNameObject.metro:
                        typeArrayNew.metro.push(temp[e].store_item);
                        break;
                    case common_modules_1.StoreNameObject.provigo:
                        typeArrayNew.provigo.push(temp[e].store_item);
                        break;
                    case common_modules_1.StoreNameObject.walmart:
                        typeArrayNew.walmart.push(temp[e].store_item);
                        break;
                    default:
                        break;
                }
            }
        });
        var typeArray = (0, common_modules_1.StoreNamesArray)();
        const newPromises = typeArray.map((row, index, arr) => __awaiter(void 0, void 0, void 0, function* () {
            var condition = "";
            switch (row) {
                case common_modules_1.StoreTableNameObject.iga:
                    condition = "'" + typeArrayNew.iga.join("','") + "'";
                    break;
                case common_modules_1.StoreTableNameObject.superc:
                    condition = "'" + typeArrayNew.superc.join("','") + "'";
                    break;
                case common_modules_1.StoreTableNameObject.maxi:
                    condition = "'" + typeArrayNew.maxi.join("','") + "'";
                    break;
                case common_modules_1.StoreTableNameObject.metro:
                    condition = "'" + typeArrayNew.metro.join("','") + "'";
                    break;
                case common_modules_1.StoreTableNameObject.provigo:
                    condition = "'" + typeArrayNew.provigo.join("','") + "'";
                    break;
                case common_modules_1.StoreTableNameObject.walmart:
                    condition = "'" + typeArrayNew.walmart.join("','") + "'";
                    break;
                default:
                    break;
            }
            let sql = `SELECT A.sku, B.eezly_aisle_id AS aisle_id, A.regular_price, A.sale_price, A.image FROM ${row} AS A JOIN store_aisles AS B ON A.aisle = B.name WHERE A.sku IN (${condition})`;
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
                            storeName: row,
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
                switch (row.storeName) {
                    case common_modules_1.StoreTableNameObject.iga:
                        if (row.status) {
                            IgaItems = row.data;
                        }
                        else {
                            return (0, common_modules_1.GenerateBadRequestResponse)(res, row.message + " " + row.storeName);
                        }
                        break;
                    case common_modules_1.StoreTableNameObject.superc:
                        if (row.status) {
                            SupercItems = row.data;
                        }
                        else {
                            return (0, common_modules_1.GenerateBadRequestResponse)(res, row.message + " " + row.storeName);
                        }
                        break;
                    case common_modules_1.StoreTableNameObject.maxi:
                        if (row.status) {
                            MaxiItems = row.data;
                        }
                        else {
                            return (0, common_modules_1.GenerateBadRequestResponse)(res, row.message + " " + row.storeName);
                        }
                        break;
                    case common_modules_1.StoreTableNameObject.metro:
                        if (row.status) {
                            MetroItems = row.data;
                        }
                        else {
                            return (0, common_modules_1.GenerateBadRequestResponse)(res, row.message + " " + row.storeName);
                        }
                        break;
                    case common_modules_1.StoreTableNameObject.provigo:
                        if (row.status) {
                            ProvigoItems = row.data;
                        }
                        else {
                            return (0, common_modules_1.GenerateBadRequestResponse)(res, row.message + " " + row.storeName);
                        }
                        break;
                    case common_modules_1.StoreTableNameObject.walmart:
                        if (row.status) {
                            WalmartItems = row.data;
                        }
                        else {
                            return (0, common_modules_1.GenerateBadRequestResponse)(res, row.message + " " + row.storeName);
                        }
                        break;
                    default:
                        break;
                }
            });
        }).then((data) => {
            InsertData();
        });
    });
    let InsertData = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Create Cart Details */
        let ShoppingTitle = Lang === 'en' ? `Shopping List Week ${currentWeekNumber}` : `Liste de Course Semaine ${currentWeekNumber}`;
        let sql = `INSERT INTO shopping_lists (name, customer_id, stores_to_compare) VALUES ('${ShoppingTitle}', ${CartData[0].customer_id}, '${CartData[0].stores_to_compare}')`;
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((result) => __awaiter(void 0, void 0, void 0, function* () {
            if (!result.status) {
                return (0, common_modules_1.GenerateErrorResponse)(res, result.message);
            }
            // Insert Shopping List
            let shopping_lists_id = yield result.data.insertId;
            Stores = CartData[0].stores_to_compare ? CartData[0].stores_to_compare.split(',') : [];
            for (let i = 0; i < CartItemDetail.length; i++) {
                let GroceryItem = [];
                let StoreItemsAttached = [];
                let Thumbnail = '';
                let RegularPrice = '';
                let SalePrice = '';
                // Create StoreItems List
                for (let j = 0; j < EezlyItemsDetail.length; j++) {
                    if (CartItemDetail[i].eezly_item_id === EezlyItemsDetail[j].id) {
                        GroceryItem = JSON.parse(EezlyItemsDetail[j].grocery_items);
                        for (let s = 0; s < Stores.length; s++) {
                            for (let g = 0; g < GroceryItem.length; g++) {
                                if (GroceryItem[g].store_id == Stores[s]) {
                                    if (GroceryItem[g].store_id === 1) {
                                        for (let z = 0; z < IgaItems.length; z++) {
                                            if (GroceryItem[g].store_item === IgaItems[z].sku) {
                                                Thumbnail = IgaItems[z].image;
                                                RegularPrice = IgaItems[z].regular_price;
                                                SalePrice = IgaItems[z].sale_price;
                                                break;
                                            }
                                        }
                                    }
                                    else if (GroceryItem[g].store_id === 2) {
                                        for (let z = 0; z < SupercItems.length; z++) {
                                            if (GroceryItem[g].store_item === SupercItems[z].sku) {
                                                Thumbnail = SupercItems[z].image;
                                                RegularPrice = SupercItems[z].regular_price;
                                                SalePrice = SupercItems[z].sale_price;
                                                break;
                                            }
                                        }
                                    }
                                    else if (GroceryItem[g].store_id === 3) {
                                        for (let z = 0; z < MaxiItems.length; z++) {
                                            if (GroceryItem[g].store_item === MaxiItems[z].sku) {
                                                Thumbnail = MaxiItems[z].image;
                                                RegularPrice = MaxiItems[z].regular_price;
                                                SalePrice = MaxiItems[z].sale_price;
                                                break;
                                            }
                                        }
                                    }
                                    else if (GroceryItem[g].store_id === 4) {
                                        for (let z = 0; z < MetroItems.length; z++) {
                                            if (GroceryItem[g].store_item === MetroItems[z].sku) {
                                                Thumbnail = MetroItems[z].image;
                                                RegularPrice = MetroItems[z].regular_price;
                                                SalePrice = MetroItems[z].sale_price;
                                                break;
                                            }
                                        }
                                    }
                                    else if (GroceryItem[g].store_id === 5) {
                                        for (let z = 0; z < ProvigoItems.length; z++) {
                                            if (GroceryItem[g].store_item === ProvigoItems[z].sku) {
                                                Thumbnail = ProvigoItems[z].image;
                                                RegularPrice = ProvigoItems[z].regular_price;
                                                SalePrice = ProvigoItems[z].sale_price;
                                                break;
                                            }
                                        }
                                    }
                                    else if (GroceryItem[g].store_id === 6) {
                                        for (let z = 0; z < WalmartItems.length; z++) {
                                            if (GroceryItem[g].store_item === WalmartItems[z].sku) {
                                                Thumbnail = WalmartItems[z].image;
                                                RegularPrice = WalmartItems[z].regular_price;
                                                SalePrice = WalmartItems[z].sale_price;
                                                break;
                                            }
                                        }
                                    }
                                    let SubArray = {
                                        store_id: GroceryItem[g].store_id,
                                        store_item: GroceryItem[g].store_item,
                                        thumbnail: Thumbnail,
                                        regular_price: RegularPrice,
                                        sale_price: SalePrice
                                    };
                                    StoreItemsAttached.push(SubArray);
                                }
                            }
                        }
                        break;
                    }
                }
                yield InsertShoppingListDetails(CartItemDetail[i], shopping_lists_id, StoreItemsAttached);
            }
            Response();
        }));
    });
    let InsertShoppingListDetails = (data, shoppingListId, storeItemsAttached) => __awaiter(void 0, void 0, void 0, function* () {
        storeItemsAttached = storeItemsAttached.length > 0 ? storeItemsAttached : null;
        let sql = ` INSERT INTO shopping_list_details (shopping_list_id , eezly_item_id, quantity, store_items) VALUE (${shoppingListId} , '${data.eezly_item_id}' , '${data.quantity}', IF('${storeItemsAttached}' = 'null', null, '${JSON.stringify(storeItemsAttached)}'))`;
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((result) => __awaiter(void 0, void 0, void 0, function* () {
            if (!result.status) {
                return (0, common_modules_1.GenerateErrorResponse)(res, result.message);
            }
        }));
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Shopping list created successfully');
    };
    // Start
    ValidationStep1();
});
app.get('/getShoppingLists', ApiAuth, (req, res) => {
    let User = req.body.user;
    let NoOfRecords = req.query.no_of_records;
    let ShoppingListItems = [];
    let ShoppingListItemsDetail = [];
    let ShoppingListItemsIdsArr = [];
    let TotalNumberOfItems = 0;
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'The no of records field', value: NoOfRecords, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        Paginate();
    });
    let Paginate = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `shopping_lists A`, 'COUNT(*) AS Total', `A.customer_id = ${User.user_id} AND deleted_at IS NULL`, null, null, null);
        if (data.status) {
            Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/shopping/getShoppingLists", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `shopping_lists A`, `A.id, A.name, A.stores_to_compare, DATE_FORMAT(A.created_at, '%d/%m/%Y') AS created_at`, `A.customer_id = ${User.user_id} AND deleted_at IS NULL`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`);
        if (data.status) {
            ShoppingListItems = data.data;
            for (let i = 0; i < ShoppingListItems.length; i++) {
                ShoppingListItemsIdsArr.push(ShoppingListItems[i].id);
            }
            FetchShoppingListItemsDetails();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let FetchShoppingListItemsDetails = () => __awaiter(void 0, void 0, void 0, function* () {
        let whereCondition = ShoppingListItemsIdsArr.length > 0 ? `A.shopping_list_id IN (${ShoppingListItemsIdsArr.join(",")})` : `A.shopping_list_id IN ('')`;
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'shopping_list_details A', 'A.*', `${whereCondition}`, null, null, null);
        if (data.status) {
            ShoppingListItemsDetail = data.data;
            MainProcess();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let MainProcess = () => {
        for (let a = 0; a < ShoppingListItems.length; a++) {
            TotalNumberOfItems = 0;
            for (let b = 0; b < ShoppingListItemsDetail.length; b++) {
                if (ShoppingListItems[a].id == ShoppingListItemsDetail[b].shopping_list_id) {
                    TotalNumberOfItems += 1;
                }
            }
            ShoppingListItems[a].stores_to_compare = ShoppingListItems[a].stores_to_compare !== '' ? ShoppingListItems[a].stores_to_compare.split(',') : [];
            ShoppingListItems[a].number_of_items = TotalNumberOfItems;
        }
        Response();
    };
    let Response = () => {
        Pagination.status = true;
        Pagination.data = ShoppingListItems;
        return res.status(http_status_codes_1.StatusCodes.OK).json(Pagination);
    };
    // Start
    ValidationStep1();
});
app.get('/getShoppingListDetails', ApiAuth, (req, res) => {
    let User = req.body.user;
    let Lang = req.body.lang ? req.body.lang : 'en';
    let ShoppingListId = req.query.shopping_list_id;
    let ShoppingListDetail = null;
    let ShoppingListItemsDetail = [];
    let ShoppingListItemsArr = [];
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Shopping list id', value: ShoppingListId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        CheckShoppingListId();
    });
    let CheckShoppingListId = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'shopping_lists A', `A.id, A.name, A.stores_to_compare, DATE_FORMAT(A.created_at, '%d/%m/%Y') AS created_at`, `A.id = ${ShoppingListId} AND A.customer_id = ${User.user_id} AND deleted_at IS NULL`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected shopping list id is invalid');
            }
            else {
                ShoppingListDetail = data.data[0];
                FetchShoppingListItems();
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let FetchShoppingListItems = () => __awaiter(void 0, void 0, void 0, function* () {
        const tables = `shopping_list_details A INNER JOIN eezly_items B ON A.eezly_item_id = B.id LEFT JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`;
        const columns = `A.*, C.id AS aisle_id,
                        CASE
                            WHEN '${Lang}' = 'en' THEN C.name
                            WHEN '${Lang}' = 'fr' THEN COALESCE(C.name_fr, C.name)
                        END AS aisle_name, B.size as eezly_item_size,
                        CASE
                            WHEN '${Lang}' = 'en' THEN B.name
                            WHEN '${Lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                        END AS eezly_item_name`;
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, tables, columns, `A.shopping_list_id = ${ShoppingListId}`, null, null, null);
        if (data.status) {
            ShoppingListItemsDetail = data.data;
            MainProcess();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let MainProcess = () => {
        for (let i = 0; i < ShoppingListItemsDetail.length; i++) {
            let sub_array = {
                id: ShoppingListItemsDetail[i].id,
                shopping_list_id: ShoppingListItemsDetail[i].shopping_list_id,
                eezly_item_id: ShoppingListItemsDetail[i].eezly_item_id,
                eezly_item_name: ShoppingListItemsDetail[i].eezly_item_name,
                eezly_item_size: ShoppingListItemsDetail[i].eezly_item_size,
                eezly_aisle_id: ShoppingListItemsDetail[i].aisle_id,
                eezly_aisle_name: ShoppingListItemsDetail[i].aisle_name,
                quantity: ShoppingListItemsDetail[i].quantity,
                store_items: (ShoppingListItemsDetail[i].store_items !== '' && ShoppingListItemsDetail[i].store_items != null) ? JSON.parse(ShoppingListItemsDetail[i].store_items) : []
            };
            ShoppingListItemsArr.push(sub_array);
        }
        Response();
    };
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            id: ShoppingListId,
            name: ShoppingListDetail.name,
            stores_to_compare: ShoppingListDetail.stores_to_compare !== '' ? ShoppingListDetail.stores_to_compare.split(',') : [],
            created_at: ShoppingListDetail.created_at,
            number_of_items: ShoppingListItemsDetail.length,
            shopping_list_items: ShoppingListItemsArr
        });
    };
    /* Start */
    ValidationStep1();
});
app.delete('/deleteShoppingList', ApiAuth, (req, res) => {
    let User = req.body.user;
    let shoppingListId = req.query.shopping_list_id;
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Shopping list id', value: shoppingListId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for valid shopping list Id */
        let checkValidId = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'shopping_lists', '*', `id = ${shoppingListId} AND customer_id = ${User.user_id}`, null, null, null);
        if (checkValidId.status) {
            if (checkValidId.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected shopping list id is invalid');
            }
            DeleteShoppingList();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, checkValidId.message);
        }
    });
    let DeleteShoppingList = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE shopping_lists SET deleted_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = ${shoppingListId}`);
        if (!data.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
        Response();
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Shopping list deleted successfully');
    };
    /* Start */
    ValidationStep1();
});
app.get("/reorder", ApiAuth, (req, res) => {
    let Lang = req.body.lang ? req.body.lang : 'en';
    let User = req.body.user;
    let EezlyItemsArr = [];
    let GetMostLikedLatestEezlyItems = () => __awaiter(void 0, void 0, void 0, function* () {
        const tables = `shopping_lists sl
                    INNER JOIN shopping_list_details sld ON sl.id = sld.shopping_list_id
                    INNER JOIN eezly_items ei ON sld.eezly_item_id = ei.id`;
        const columns = `COUNT(sld.eezly_item_id) AS TotalLiked, sld.eezly_item_id`;
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, tables, columns, `sl.customer_id = ${User.user_id}`, ` GROUP BY sld.eezly_item_id`, ` ORDER BY TotalLiked DESC`, ` LIMIT 50`);
        if (data.status) {
            for (let i = 0; i < data.data.length; i++) {
                EezlyItemsArr.push(data.data[i].eezly_item_id);
            }
            GetItemsDetail();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetItemsDetail = () => __awaiter(void 0, void 0, void 0, function* () {
        const escapedStringArray = EezlyItemsArr.map((value) => mysql.escape(value));
        const whereCondition = escapedStringArray.length > 0 ? `ei.id IN (${escapedStringArray.join(",")})` : `ei.id IN ('')`;
        const tables = `eezly_items ei`;
        const columns = `ei.id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN ei.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(ei.name_fr, ei.name)
                    END AS name, ei.thumbnail, ei.brand, ei.size, ei.eezly_aisle_id, IF((SELECT COUNT(*) FROM favorites F WHERE F.customer_id = ${User.user_id} AND F.eezly_item_id = ei.id) > 0, true, false) AS isFavorite`;
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, tables, columns, whereCondition, null, null, null);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (data) => {
        return (0, common_modules_1.GenerateSuccessResponseWithData)(res, data);
    };
    /* Start */
    GetMostLikedLatestEezlyItems();
});
module.exports = app;
