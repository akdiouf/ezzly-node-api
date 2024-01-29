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
const common_modules_1 = require("../modules/common.modules");
const crud_modules_1 = require("../modules/crud.modules");
const validator_modules_1 = require("../modules/validator.modules");
const db_modules_1 = require("../modules/db.modules");
const http_status_codes_1 = require("http-status-codes");
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
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
const moment = require("moment");
const ApiAuth = require("../lib/auth");
app.post("/add", ApiAuth, (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let CartItems = req.body.cart_items;
    let FinalCartItems = [];
    let EezlyItemIds = [];
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'The cart items field', value: CartItems, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        GetEezlyItems();
    });
    let GetEezlyItems = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items', 'id', 'deleted_at IS NULL', null, null, null);
        if (data.status) {
            // data.data.forEach((item: any) => {
            //     EezlyItemIds.push(item.id);
            // });
            for (let i = 0; i < data.data.length; i++) {
                EezlyItemIds.push(data.data[i].id);
            }
            CartItems = JSON.parse(CartItems);
            // CartItems.forEach((item: any) => {
            //     if (EezlyItemIds.indexOf(item.eezly_item_id) === -1) {
            //         return GenerateErrorResponse(res, 'Eezly item not found');
            //     }
            // });
            for (let i = 0; i < CartItems.length; i++) {
                if (EezlyItemIds.indexOf(CartItems[i].eezly_item_id) === -1) {
                    return (0, common_modules_1.GenerateErrorResponse)(res, 'Eezly item not found');
                }
            }
            /* Items in the Cart are valid. Now process cart */
            Cart();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Cart = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'carts A', 'A.*', `A.customer_id = ${User.user_id} AND A.status = 1`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                /* Create Cart Entry */
                let sql = `INSERT INTO carts (customer_id, status, created_at, updated_at) VALUE (${User.user_id}, 1, '${(0, common_modules_1.DBDateFormatModule)()}', '${(0, common_modules_1.DBDateFormatModule)()}')`;
                let insertCartData = yield (0, crud_modules_1.RunAnyQuery)(sql);
                if (insertCartData.status) {
                    InsertCartDetails(insertCartData.data.insertId);
                }
                else {
                    return (0, common_modules_1.GenerateErrorResponse)(res, insertCartData.message);
                }
            }
            else {
                /* Deleting old Cart Details */
                let sql = `DELETE FROM cart_details WHERE cart_id = ${data.data[0].id}`;
                let deleteOldCartData = yield (0, crud_modules_1.RunAnyQuery)(sql);
                if (deleteOldCartData.status) {
                    InsertCartDetails(data.data[0].id);
                }
                else {
                    return (0, common_modules_1.GenerateErrorResponse)(res, deleteOldCartData.message);
                }
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let InsertCartDetails = (CartId) => __awaiter(void 0, void 0, void 0, function* () {
        // If duplicate item is available then remove it and sum up quantity of first one
        EezlyItemIds = [];
        // CartItems.forEach((item: any) => {
        //     if (EezlyItemIds.indexOf(item.eezly_item_id) !== -1) {
        //         FinalCartItems.forEach((finalItem: any, f_index: number) => {
        //             if (finalItem.eezly_item_id === item.eezly_item_id) {
        //                 FinalCartItems[f_index].quantity += item.quantity;
        //             }
        //         });
        //     } else {
        //         EezlyItemIds.push(item.eezly_item_id);
        //         FinalCartItems.push(item);
        //     }
        // });
        for (let i = 0; i < CartItems.length; i++) {
            if (EezlyItemIds.indexOf(CartItems[i].eezly_item_id) !== -1) {
                for (let j = 0; j < FinalCartItems.length; j++) {
                    if (FinalCartItems[j].eezly_item_id === CartItems[i].eezly_item_id) {
                        FinalCartItems[j].quantity += CartItems[i].quantity;
                    }
                }
            }
            else {
                EezlyItemIds.push(CartItems[i].eezly_item_id);
                FinalCartItems.push(CartItems[i]);
            }
        }
        /* Creating New Cart Details */
        let sql = `INSERT INTO cart_details (cart_id, eezly_item_id, quantity, created_at, updated_at) VALUE `;
        for (let i = 0; i < FinalCartItems.length; i++) {
            sql += i === 0 ? `` : `, `;
            sql += `(${CartId}, ${FinalCartItems[i].eezly_item_id}, ${FinalCartItems[i].quantity}, '${(0, common_modules_1.DBDateFormatModule)()}', '${(0, common_modules_1.DBDateFormatModule)()}')`;
        }
        // FinalCartItems.forEach((item: any, index: any) => {
        //     sql += index === 0 ? `` : `, `;
        //     sql += `(${CartId}, ${item.eezly_item_id}, ${item.quantity}, '${DBDateFormatModule()}', '${DBDateFormatModule()}')`;
        // });
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            Response(CartId);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (cartId) => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            message: 'Cart updated successfully',
            cart_id: cartId
        });
    };
    /* Start */
    ValidationStep1();
});
app.get('/getCartDetails', ApiAuth, (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let NoOfRecords = req.query.no_of_records;
    let CartId = req.query.cart_id;
    let CartData = null;
    let CartTotalItemsQuantity = 0;
    let TotalCartItems = 0;
    let CartItemsData = null;
    /* Stores */
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        if (NoOfRecords === '' || NoOfRecords == null) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'The no of records field is required.'
            });
        }
        else if (CartId === '' || CartId == null) {
            return res.status(400).json({
                status: false,
                message: 'The cart id field is required.'
            });
        }
        /* Check for valid Cart Id */
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `carts A`, "A.*", `A.id = ${CartId}`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: 'The selected cart id is invalid.'
                    });
                }
                FetchData();
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: Data.message
                });
            }
        });
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `carts A JOIN cart_statuses B ON A.status = B.id JOIN users C ON A.customer_id = C.id`, "A.id, C.fullName as customer_name, A.stores_to_compare, A.no_of_stores, A.no_of_items, A.submission_date, A.verification_date, B.name as status", `A.id = ${CartId}`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: 'Cart is empty'
                    });
                }
                CartData = Data.data;
                GetStoresToCompare();
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: Data.message
                });
            }
        });
    });
    let GetStoresToCompare = () => __awaiter(void 0, void 0, void 0, function* () {
        if (CartData[0].stores_to_compare !== "") {
            yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `stores A`, `A.id, A.name`, `A.id IN (${CartData[0].stores_to_compare})`, null, null, null).then((Data) => {
                if (Data.status) {
                    CartData[0].stores_to_compare = Data.data;
                    GetCartTotalQuantity();
                }
                else {
                    return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        }
        else {
            CartData[0].stores_to_compare = [];
            GetCartTotalQuantity();
        }
    });
    let GetCartTotalQuantity = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `cart_details A`, `COUNT(*) AS TotalItems, SUM(A.quantity) AS Total`, `A.cart_id = ${CartId}`, null, null, null).then((SumData) => __awaiter(void 0, void 0, void 0, function* () {
            if (SumData.status) {
                CartTotalItemsQuantity = parseInt(SumData.data[0].Total);
                TotalCartItems = parseInt(SumData.data[0].TotalItems);
                Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/cart/getCartDetails", Page, NoOfRecords, TotalCartItems);
                GetCartItems();
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: SumData.message
                });
            }
        }));
    });
    let GetCartItems = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db, `cart_details A JOIN eezly_items B ON A.eezly_item_id = B.id JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`, `A.eezly_item_id, B.name, A.quantity, B.thumbnail, B.brand, B.size, B.eezly_aisle_id, C.name as aisle_name, B.grocery_items,B.grocery_items AS raw_grocery_items`, `A.cart_id = ${CartId}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`).then((Data) => {
            if (Data.status) {
                CartItemsData = Data.data;
                FetchStoresData();
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: Data.message
                });
            }
        });
    });
    let FetchStoresData = () => __awaiter(void 0, void 0, void 0, function* () {
        var typeArrayNew = { 'iga': new Array(), 'superc': new Array(), 'maxi': new Array(), 'metro': new Array(), 'provigo': new Array(), 'walmart': new Array() };
        var temp;
        var e;
        for (let i = 0; i < CartItemsData.length; i++) {
            temp = JSON.parse(CartItemsData[i]['grocery_items']);
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
            let GroceryItems = [];
            for (let c = 0; c < data.length; c++) {
                let row = data[c];
                if (row.data.length > 0) {
                    for (let d = 0; d < row.data.length; d++) {
                        let element = row.data[d];
                        for (let a = 0; a < CartItemsData.length; a++) {
                            if (CartItemsData[a]['raw_grocery_items'] !== null && CartItemsData[a]['raw_grocery_items'] !== "") {
                                let EGroceryItems = JSON.parse(CartItemsData[a]['raw_grocery_items']);
                                for (let i = 0; i < EGroceryItems.length; i++) {
                                    let SubArray = {
                                        store_id: EGroceryItems[i]['store_id'],
                                        store_name: EGroceryItems[i]['store_name']
                                    };
                                    if (element.sku === EGroceryItems[i]['store_item']) {
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
                                    CartItemsData[a].grocery_items = GroceryItems;
                                }
                                GroceryItems = [];
                            }
                        }
                    }
                }
            }
        }).then(() => {
            Pagination.data = CartItemsData;
            delete Pagination.status;
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                status: true,
                cart: CartData,
                cartTotalItemsQuantity: CartTotalItemsQuantity,
                cart_items: Pagination
            });
        });
    });
    ValidationStep1();
});
app.get('/getCartsByStatus', ApiAuth, (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let Lang = (req.query.lang === '' || req.query.lang == null) ? 'en' : req.query.lang;
    let NoOfRecords = req.query.no_of_records;
    let Status = req.query.status;
    let CartsData = null;
    let IgaItems = null;
    let SupercItems = null;
    let Stores = null;
    let CartItemsData = null;
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
                message: 'The no of records field is required'
            });
        }
        else if (Status === '' || Status == null) {
            return res.status(app.get("BadRequestStatus")).json({
                status: false,
                message: 'The status field is required'
            });
        }
        if (parseInt(Status) === 1) {
            CurrentCarts();
        }
        else if (parseInt(Status) === 2 || parseInt(Status) === 3) {
            SubmittedVerifiedCarts();
        }
        else {
            return res.status(app.get("BadRequestStatus")).json({
                status: false,
                message: 'The status field value is invalid'
            });
        }
    };
    let CurrentCarts = () => {
        let GetCarts = () => {
            app.get("SelectQuery")(db, `carts A`, `A.*`, `A.status = 1 AND A.customer_id = ${User.user_id}`, null, null, null).then((Data) => {
                if (Data.status) {
                    if (Data.data.length === 0) {
                        return res.status(app.get("BadRequestStatus")).json({
                            status: false,
                            message: 'Cart is empty'
                        });
                    }
                    CartsData = Data.data;
                    GetCartItemsTotal();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        };
        let GetCartItemsTotal = () => {
            app.get("SelectQuery")(db, `cart_details A`, `COUNT(*) AS TotalItems, SUM(A.quantity) AS Total`, `A.cart_id = ${CartsData[0].id}`, null, null, null).then((Data) => {
                if (Data.status) {
                    Pagination = app.get("Pagination")(req, app.get("BaseUrl") + "/cart/getCartDetails", Page, NoOfRecords, Data.data[0].TotalItems);
                    GetCartItems();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        };
        let GetCartItems = () => {
            const tables = `cart_details A JOIN eezly_items B ON A.eezly_item_id = B.id JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`;
            const columns = `A.eezly_item_id,
                        CASE
                            WHEN '${Lang}' = 'en' THEN B.name
                            WHEN '${Lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                        END AS name, A.quantity, B.thumbnail, B.brand, B.size, B.eezly_aisle_id,
                        CASE
                            WHEN '${Lang}' = 'en' THEN C.name
                            WHEN '${Lang}' = 'fr' THEN COALESCE(C.name_fr, C.name)
                        END AS aisle_name , B.grocery_items`;
            app.get("SelectQuery")(db, tables, columns, `A.cart_id = ${CartsData[0].id}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`).then((Data) => {
                if (Data.status) {
                    CartItemsData = Data.data;
                    GetIgaItems();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        };
        let GetIgaItems = () => {
            app.get("SelectQuery")(db, "iga_items", "*", null, null, null, null).then((Data) => {
                if (Data.status) {
                    IgaItems = Data.data;
                    GetSupercItems();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        };
        let GetSupercItems = () => {
            app.get("SelectQuery")(db, "superc_items", "*", null, null, null, null).then((Data) => {
                if (Data.status) {
                    SupercItems = Data.data;
                    ProcessGroceryItems();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        };
        let ProcessGroceryItems = () => {
            let GroceryItems = [];
            for (let a = 0; a < CartItemsData.length; a++) {
                if (CartItemsData[a].grocery_items !== null && CartItemsData[a].grocery_items !== "") {
                    let EGroceryItems = JSON.parse(CartItemsData[a].grocery_items);
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
                                    break;
                                }
                            }
                        }
                        GroceryItems.push(SubArray);
                    }
                    CartItemsData[a].grocery_items = GroceryItems;
                    GroceryItems = [];
                }
            }
            Response();
        };
        GetCarts();
    };
    let SubmittedVerifiedCarts = () => {
        let GetStores = () => {
            app.get("SelectQuery")(db, `stores A`, `A.id, A.name`, null, null, null, null).then((Data) => {
                if (Data.status) {
                    Stores = Data.data;
                    GetCount();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        };
        let GetCount = () => {
            app.get("SelectQuery")(db, `carts A JOIN users B ON A.customer_id = B.id`, `COUNT(*) AS Total`, `A.status = ${parseInt(Status)}${User.role_id !== 1 ? ' AND A.customer_id = ' + User.user_id : ''}`, null, null, null).then((Data) => {
                if (Data.status) {
                    Pagination = app.get("Pagination")(req, app.get("BaseUrl") + "/cart/getCartsByStatus", Page, NoOfRecords, Data.data[0].Total);
                    GetData();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        };
        let GetData = () => {
            app.get("SelectQuery")(db, `carts A JOIN users B ON A.customer_id = B.id`, `A.id, A.stores_to_compare, A.no_of_stores, A.no_of_items, A.submission_date`, `A.status = ${parseInt(Status)}${User.role_id !== 1 ? ' AND A.customer_id = ' + User.user_id : ''}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`).then((Data) => {
                if (Data.status) {
                    CartItemsData = Data.data;
                    for (let i = 0; i < CartItemsData.length; i++) {
                        if (CartItemsData[i].stores_to_compare !== "") {
                            let _StoreIds = CartItemsData[i].stores_to_compare.split(",");
                            let StoresToCompare = [];
                            for (let k = 0; k < Stores.length; k++) {
                                if (_StoreIds.includes(Stores[k].id.toString())) {
                                    StoresToCompare.push(Stores[k]);
                                }
                            }
                            CartItemsData[i].stores_to_compare = StoresToCompare;
                        }
                    }
                    Response();
                }
                else {
                    return res.status(app.get("BadRequestStatus")).json({
                        status: false,
                        message: Data.message
                    });
                }
            });
        };
        GetStores();
    };
    let Response = () => {
        Pagination.status = true;
        Pagination.data = CartItemsData;
        if (parseInt(Status) === 1) {
            delete Pagination.status;
            let ResponseData = {
                status: true,
                cart_id: CartsData[0].id,
                cart_items: Pagination
            };
            return res.status(app.get("SuccessStatus")).json(ResponseData);
        }
        else if (parseInt(Status) === 2 || parseInt(Status) === 3) {
            return res.status(app.get("SuccessStatus")).json(Pagination);
        }
    };
    ValidationStep1();
});
app.put('/removeCartItem', ApiAuth, (req, res) => {
    let User = req.body.user;
    let NoOfRecords = req.query.no_of_records;
    let EezlyItemId = req.query.eezly_item_id;
    let CartData = null;
    let CartItemsData = null;
    let TotalCartItems = null;
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let ValidationStep1 = () => {
        if (NoOfRecords === '' || NoOfRecords == null) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The no of records field is required.');
        }
        else if (EezlyItemId === '' || EezlyItemId == null) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The eezly item id field is required.');
        }
        //TODO: Anmol
        GetCartData();
    };
    let GetCartData = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `carts A`, `A.*`, `A.customer_id = ${User.user_id} AND A.status = 1`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'No current cart available');
                }
                CartData = Data.data;
                GetCartItemWithItemId();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The eezly item id field is required.');
            }
        });
    });
    let GetCartItemWithItemId = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `cart_details A`, `A.*`, `A.cart_id = ${CartData[0].id} AND A.eezly_item_id = ${EezlyItemId}`, null, null, null).then((Data) => {
            if (Data.status) {
                CartItemsData = Data.data;
                if (CartItemsData.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid Eezly Item Id');
                }
                DeleteItemFromCart();
            }
            else {
                return (0, common_modules_1.GenerateBadGatewayResponse)(res, Data.message);
            }
        });
    });
    let DeleteItemFromCart = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `DELETE FROM cart_details WHERE id = ${CartItemsData[0].id}`;
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((data) => {
            if (!data.status) {
                return (0, common_modules_1.GenerateErrorResponse)(res, 'The eezly item id field is required.');
            }
            GetTotalCartItems();
        });
    });
    let GetTotalCartItems = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `cart_details A`, `COUNT(*) AS TotalItems`, `A.cart_id = ${CartData[0].id}`, null, null, null).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
            if (Data.status) {
                TotalCartItems = parseInt(Data.data[0].TotalItems);
                Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/cart/removeCartItem", Page, NoOfRecords, TotalCartItems);
                GetCartItems();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The eezly item id field is required.');
            }
        }));
    });
    let GetCartItems = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `cart_details A JOIN eezly_items B ON A.eezly_item_id = B.id JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`, `A.eezly_item_id, B.name, A.quantity, B.thumbnail, B.brand, B.size, B.eezly_aisle_id, C.name as aisle_name, B.grocery_items,B.grocery_items as raw_grocery_items`, `A.cart_id = ${CartData[0].id}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`).then((Data) => {
            if (Data.status) {
                CartItemsData = Data.data;
                FetchStoresData();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The eezly item id field is required.');
            }
        });
    });
    let FetchStoresData = () => __awaiter(void 0, void 0, void 0, function* () {
        var typeArrayNew = { 'iga': new Array(), 'superc': new Array(), 'maxi': new Array(), 'metro': new Array(), 'provigo': new Array(), 'walmart': new Array() };
        var temp;
        var e;
        for (let i = 0; i < CartItemsData.length; i++) {
            temp = JSON.parse(CartItemsData[i]['grocery_items']);
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
            let GroceryItems = [];
            for (let c = 0; c < data.length; c++) {
                let row = data[c];
                if (row.data.length > 0) {
                    for (let d = 0; d < row.data.length; d++) {
                        let element = row.data[d];
                        for (let a = 0; a < CartItemsData.length; a++) {
                            if (CartItemsData[a]['raw_grocery_items'] != null && CartItemsData[a]['raw_grocery_items'] !== "") {
                                let EGroceryItems = JSON.parse(CartItemsData[a]['raw_grocery_items']);
                                for (let i = 0; i < EGroceryItems.length; i++) {
                                    let SubArray = {
                                        store_id: EGroceryItems[i]['store_id'],
                                        store_name: EGroceryItems[i]['store_name']
                                    };
                                    if (element.sku === EGroceryItems[i]['store_item']) {
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
                                    CartItemsData[a].grocery_items = GroceryItems;
                                }
                                GroceryItems = [];
                            }
                        }
                    }
                }
            }
        }).then(() => {
            Pagination.status = true;
            Pagination.data = CartItemsData;
            delete Pagination.status;
            let ResponseData = {
                status: true,
                message: 'Item removed from cart successfully',
                cart_id: CartData[0].id,
                cart_items: Pagination
            };
            return res.status(http_status_codes_1.StatusCodes.OK).json(ResponseData);
        });
    });
    ValidationStep1();
});
app.delete('/clear', ApiAuth, (req, res) => {
    let User = req.body.user;
    let DeleteCartData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`DELETE carts, cart_details FROM carts INNER JOIN cart_details ON carts.id = cart_details.cart_id WHERE carts.customer_id = ${User.user_id} AND carts.status = 1;`);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Cart is cleared!');
    };
    DeleteCartData();
});
app.put('/submitAdminCart', ApiAuth, (req, res) => {
    let User = req.body.user;
    let CartId = req.query.cart_id;
    let CartData = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'submit_user_cart');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'The cart id', value: CartId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for valid Cart Id */
        let checkCartId = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'carts', '*', `id = ${CartId}`, null, null, null);
        if (checkCartId.status) {
            if (checkCartId.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected cart id is invalid');
            }
            GetCartData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, checkCartId.message);
        }
    });
    let GetCartData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'carts A JOIN users B ON A.customer_id = B.id', 'A.*, B.fcm_token', `A.id = ${CartId} AND A.status = 2`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'No submitted cart found');
            }
            CartData = data.data;
            UpdateCart();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let UpdateCart = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE carts SET verification_date = '${(0, common_modules_1.DBDateFormatModule)()}', updated_at = '${(0, common_modules_1.DBDateFormatModule)()}', status = 3 WHERE id = '${CartData[0].id}'`);
        if (data.status) {
            if (CartData[0].fcm_token !== '') {
                FCMCall();
            }
            else {
                Response();
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let FCMCall = () => {
        const axios = require('axios');
        let data = JSON.stringify({
            "to": CartData[0].fcm_token,
            "notification": {
                "title": "Cart Validated",
                "body": "Your cart has been validated by admin. You can check the results."
            }
        });
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://fcm.googleapis.com/fcm/send',
            headers: {
                'Authorization': 'key=AAAAZWeIrbU:APA91bFI4nGYbJxf63tlFuvsWD0RX0dNwTkMxjELuTjRFwvNCYiyhbcCWD4WFFbSVhEA0KJpAUL6jeb0-DSfO_CXUmSdoX2DojWzMVkzRBU0W9uX3295wVHlqBs1iK0VPjYS2OgrBb8F',
                'Content-Type': 'application/json'
            },
            data: data
        };
        axios.request(config)
            .then((response) => {
            Response();
        })
            .catch((error) => {
            return res.status(app.get("ErrorStatus")).json({
                status: false,
                message: error
            });
        });
    };
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Cart verified successfully');
    };
    /* Start */
    CheckRolePermission();
});
app.post('/compareNoLogin', (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let Lang = (req.body.lang === '' || req.body.lang == null) ? 'en' : req.body.lang;
    let CartItems = (req.body.cart_items !== '' && req.body.cart_items !== null && req.body.cart_items !== undefined) ? JSON.parse(req.body.cart_items) : null;
    let CartItemsIds = [];
    let CartItemsData = null;
    let CartItemList = [];
    let StoresToCompare = ["1", "2", "3", "4", "5", "6"];
    let LastThursday = moment().startOf('week').add(-3, 'days'); //.format("YYYY-MM-DD");
    let CurrentWednesday = moment().startOf('week').add(3, 'days'); //.format("YYYY-MM-DD");
    let BillArray = [];
    let BillDifference = 0;
    let BillPercentageMaxToMin = "";
    let Price = null;
    let OptimizedItemsList = [];
    let UniqueAisles = [];
    let AisleItemList = [];
    /* Stores */
    let StoreModels = [];
    let IgaItems = [];
    let IgaAvailableItemsPrice = [];
    let IgaMissingItemsList = [];
    let IgaTotalBill = 0;
    let SupercItems = [];
    let SupercAvailableItemsPrice = [];
    let SupercMissingItemsList = [];
    let SupercTotalBill = 0;
    let MaxiItems = [];
    let MaxiAvailableItemsPrice = [];
    let MaxiMissingItemsList = [];
    let MaxiTotalBill = 0;
    let MetroItems = [];
    let MetroAvailableItemsPrice = [];
    let MetroMissingItemsList = [];
    let MetroTotalBill = 0;
    let ProvigoItems = [];
    let ProvigoAvailableItemsPrice = [];
    let ProvigoMissingItemsList = [];
    let ProvigoTotalBill = 0;
    let WalmartItems = [];
    let WalmartAvailableItemsPrice = [];
    let WalmartMissingItemsList = [];
    let WalmartTotalBill = 0;
    /* Stores */
    let ValidationStep1 = () => {
        // TODO Anmol
        if (CartItems === '' || CartItems == null) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The cart items field is required.');
        }
        if (CartItems.length === 0) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'No cart item found.');
        }
        /* Generate Cart Item Id Array */
        CartItems.forEach((item) => {
            CartItemsIds.push(item.eezly_item_id);
        });
        GetCartItems();
    };
    let GetCartItems = () => __awaiter(void 0, void 0, void 0, function* () {
        const tables = `eezly_items B JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`;
        const columns = `B.id, B.id as eezly_item_id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN B.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                    END AS name, B.thumbnail, B.brand, B.size,
                    CASE
                        WHEN '${Lang}' = 'en' THEN C.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(C.name_fr, C.name)
                    END AS aisle_name,B.grocery_items,B.grocery_items AS raw_grocery_items`;
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, tables, columns, `B.id IN (${CartItemsIds.toString()})`, null, null, null).then((Data) => {
            if (Data.status) {
                CartItemsData = Data.data;
                console.log(CartItemsData);
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
        var e;
        CartItemsData.forEach((row, i) => {
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
            data.forEach((row, index) => {
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
        }).then((data) => {
            CartProcess();
        });
    });
    let CartProcess = () => {
        for (let a = 0; a < CartItemsData.length; a++) {
            let EGroceryItems = CartItemsData[a].grocery_items !== "" ? JSON.parse(CartItemsData[a].grocery_items) : [];
            let StoreIds = [];
            let StoreItemsIds = [];
            for (let b = 0; b < EGroceryItems.length; b++) {
                StoreIds.push(parseInt(EGroceryItems[b].store_id));
                StoreItemsIds.push(EGroceryItems[b].store_item.toString());
            }
            // IGA
            if (StoreIds.includes(1) && StoresToCompare.includes("1")) {
                if (IgaItems.length > 0) {
                    let Key = StoreIds.indexOf(1);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < IgaItems.length; c++) {
                        if (ItemId === IgaItems[c].sku) {
                            // check if store item is outdated or not
                            IgaAvailableItemsPrice.push(pushNoLoginStoreAvailabilityData(CartItemsData[a], IgaItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                IgaTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                IgaMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Super C
            if (StoreIds.includes(2) && StoresToCompare.includes("2")) {
                if (SupercItems.length > 0) {
                    let Key = StoreIds.indexOf(2);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < SupercItems.length; c++) {
                        if (ItemId === SupercItems[c].sku) {
                            SupercAvailableItemsPrice.push(pushNoLoginStoreAvailabilityData(CartItemsData[a], SupercItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                SupercTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                SupercMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Maxi
            if (StoreIds.includes(3) && StoresToCompare.includes("3")) {
                if (MaxiItems.length > 0) {
                    let Key = StoreIds.indexOf(3);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < MaxiItems.length; c++) {
                        if (ItemId === MaxiItems[c].sku) {
                            // check if store item is outdated or not
                            MaxiAvailableItemsPrice.push(pushNoLoginStoreAvailabilityData(CartItemsData[a], MaxiItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                MaxiTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                MaxiMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Metro
            if (StoreIds.includes(4) && StoresToCompare.includes("4")) {
                if (MetroItems.length > 0) {
                    let Key = StoreIds.indexOf(4);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < MetroItems.length; c++) {
                        if (ItemId === MetroItems[c].sku) {
                            // check if store item is outdated or not
                            MetroAvailableItemsPrice.push(pushNoLoginStoreAvailabilityData(CartItemsData[a], MetroItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                MetroTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                MetroMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Provigo
            if (StoreIds.includes(5) && StoresToCompare.includes("5")) {
                if (ProvigoItems.length > 0) {
                    let Key = StoreIds.indexOf(5);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < ProvigoItems.length; c++) {
                        if (ItemId === ProvigoItems[c].sku) {
                            // check if store item is outdated or not
                            ProvigoAvailableItemsPrice.push(pushNoLoginStoreAvailabilityData(CartItemsData[a], ProvigoItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                ProvigoTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                ProvigoMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Walmart
            if (StoreIds.includes(6) && StoresToCompare.includes("6")) {
                if (WalmartItems.length > 0) {
                    let Key = StoreIds.indexOf(6);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < WalmartItems.length; c++) {
                        if (ItemId === WalmartItems[c].sku) {
                            WalmartAvailableItemsPrice.push(pushNoLoginStoreAvailabilityData(CartItemsData[a], WalmartItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                WalmartTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                WalmartMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            delete CartItemsData[a].grocery_items;
        }
        /* Create cart item list */
        CartItemsData.forEach((item, index) => {
            if (UniqueAisles.indexOf(item.aisle_name) === -1) {
                UniqueAisles.push(item.aisle_name);
            }
        });
        UniqueAisles.forEach((item, index) => {
            AisleItemList = [];
            CartItemsData.forEach((c_item, c_index) => {
                if (item === c_item.aisle_name) {
                    AisleItemList.push(c_item);
                }
            });
            CartItemList.push({
                [item]: AisleItemList
            });
        });
        /* Create optimized items list */
        if (IgaAvailableItemsPrice.length > 0) {
            [...IgaAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('IGA', 1, IgaAvailableItemsPrice));
        }
        if (SupercAvailableItemsPrice.length > 0) {
            [...SupercAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Super C', 2, SupercAvailableItemsPrice));
        }
        if (MaxiAvailableItemsPrice.length > 0) {
            [...MaxiAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Maxi', 3, MaxiAvailableItemsPrice));
        }
        if (MetroAvailableItemsPrice.length > 0) {
            [...MetroAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Metro', 4, MetroAvailableItemsPrice));
        }
        if (ProvigoAvailableItemsPrice.length > 0) {
            [...ProvigoAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Provigo', 5, ProvigoAvailableItemsPrice));
        }
        if (WalmartAvailableItemsPrice.length > 0) {
            [...WalmartAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Walmart', 6, WalmartAvailableItemsPrice));
        }
        /* Set cart model */
        // 1 - IGA
        if (StoresToCompare.includes("1")) {
            StoreModels.push({
                store_name: 'IGA',
                store_id: 1,
                available_item_price_list: IgaAvailableItemsPrice,
                missing_item_list: IgaMissingItemsList,
                total_bill: IgaTotalBill > 0 ? IgaTotalBill : null
            });
            if (IgaTotalBill != null && IgaTotalBill > 0) {
                BillArray.push(IgaTotalBill);
            }
        }
        // 2 - Super C
        if (StoresToCompare.includes("2")) {
            StoreModels.push({
                store_name: 'Super C',
                store_id: 2,
                available_item_price_list: SupercAvailableItemsPrice,
                missing_item_list: SupercMissingItemsList,
                total_bill: SupercTotalBill > 0 ? SupercTotalBill : null
            });
            if (SupercTotalBill != null && SupercTotalBill > 0) {
                BillArray.push(SupercTotalBill);
            }
        }
        // 3 - Maxi
        if (StoresToCompare.includes("3")) {
            StoreModels.push({
                store_name: 'Maxi',
                store_id: 3,
                available_item_price_list: MaxiAvailableItemsPrice,
                missing_item_list: MaxiMissingItemsList,
                total_bill: MaxiTotalBill > 0 ? MaxiTotalBill : null
            });
            if (MaxiTotalBill != null && MaxiTotalBill > 0) {
                BillArray.push(MaxiTotalBill);
            }
        }
        // 4 - Metro
        if (StoresToCompare.includes("4")) {
            StoreModels.push({
                store_name: 'Metro',
                store_id: 4,
                available_item_price_list: MetroAvailableItemsPrice,
                missing_item_list: MetroMissingItemsList,
                total_bill: MetroTotalBill > 0 ? MetroTotalBill : null
            });
            if (MetroTotalBill != null && MetroTotalBill > 0) {
                BillArray.push(MetroTotalBill);
            }
        }
        // 5 - Provigo
        if (StoresToCompare.includes("5")) {
            StoreModels.push({
                store_name: 'Provigo',
                store_id: 5,
                available_item_price_list: ProvigoAvailableItemsPrice,
                missing_item_list: ProvigoMissingItemsList,
                total_bill: ProvigoTotalBill > 0 ? ProvigoTotalBill : null
            });
            if (ProvigoTotalBill != null && ProvigoTotalBill > 0) {
                BillArray.push(ProvigoTotalBill);
            }
        }
        // 6 - Walmart
        if (StoresToCompare.includes("6")) {
            StoreModels.push({
                store_name: 'Walmart',
                store_id: 6,
                available_item_price_list: WalmartAvailableItemsPrice,
                missing_item_list: WalmartMissingItemsList,
                total_bill: WalmartTotalBill > 0 ? WalmartTotalBill : null
            });
            if (WalmartTotalBill != null && WalmartTotalBill > 0) {
                BillArray.push(WalmartTotalBill);
            }
        }
        let MaximumBill = Math.max.apply(Math, BillArray);
        let MinimumBill = Math.min.apply(Math, BillArray);
        BillDifference = parseFloat((MaximumBill - MinimumBill).toFixed(2));
        if (MinimumBill > 0) {
            BillPercentageMaxToMin = Math.round(((MaximumBill * 100) / MinimumBill) - 100).toString() + "%";
        }
        Response();
    };
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            cartItemList: CartItemList,
            storeModels: StoreModels,
            optimizedItemsList: OptimizedItemsList,
            differenceHighestToLowest: BillDifference,
            differenceHighestToLowestPercentage: BillPercentageMaxToMin,
        });
    };
    // Start
    ValidationStep1();
});
app.post('/compare', ApiAuth, (req, res) => {
    let User = req.body.user;
    let Lang = (req.body.lang === '' || req.body.lang == null) ? 'en' : req.body.lang;
    let CartId = null;
    let CartData = null;
    let CartItemsData = null;
    let CartItemList = [];
    let CartItemsTotal = 0;
    let Stores = (req.body.stores !== '' && req.body.stores !== null && req.body.stores !== undefined) ? req.body.stores : '';
    let NoOfStores = (req.body.stores !== '' && req.body.stores !== null && req.body.stores !== undefined) ? Stores.split(",").length : 0;
    let StoresToCompare = ["1", "2", "3", "4", "5", "6"];
    let LastThursday = moment().startOf('week').add(-3, 'days'); //.format("YYYY-MM-DD");
    let CurrentWednesday = moment().startOf('week').add(3, 'days'); //.format("YYYY-MM-DD");
    let BillArray = [];
    let BillDifference = 0;
    let BillPercentageMaxToMin = "";
    let Price = null;
    let OptimizedItemsList = [];
    let UniqueAisles = [];
    let AisleItemList = [];
    /* Stores */
    let StoreModels = [];
    let IgaItems = [];
    let IgaAvailableItemsPrice = [];
    let IgaMissingItemsList = [];
    let IgaTotalBill = 0;
    let SupercItems = [];
    let SupercAvailableItemsPrice = [];
    let SupercMissingItemsList = [];
    let SupercTotalBill = 0;
    let MaxiItems = [];
    let MaxiAvailableItemsPrice = [];
    let MaxiMissingItemsList = [];
    let MaxiTotalBill = 0;
    let MetroItems = [];
    let MetroAvailableItemsPrice = [];
    let MetroMissingItemsList = [];
    let MetroTotalBill = 0;
    let ProvigoItems = [];
    let ProvigoAvailableItemsPrice = [];
    let ProvigoMissingItemsList = [];
    let ProvigoTotalBill = 0;
    let WalmartItems = [];
    let WalmartAvailableItemsPrice = [];
    let WalmartMissingItemsList = [];
    let WalmartTotalBill = 0;
    /* Stores */
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Get User Current Cart Data */
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `carts A`, "A.*", `A.customer_id = ${User.user_id} AND A.status = 1`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'No user current cart available.');
                }
                CartData = Data.data;
                CartId = CartData[0].id;
                GetCartItems();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        });
    });
    let GetCartItems = () => __awaiter(void 0, void 0, void 0, function* () {
        const tables = `cart_details A INNER JOIN eezly_items B ON A.eezly_item_id = B.id LEFT JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`;
        const columns = `A.eezly_item_id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN B.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                    END AS name, A.quantity, B.thumbnail, B.brand, B.size,
                    CASE
                        WHEN '${Lang}' = 'en' THEN C.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(C.name_fr, C.name)
                    END AS aisle_name, B.grocery_items,B.grocery_items AS raw_grocery_items`;
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, tables, columns, `A.cart_id = ${CartId}`, null, null, null).then((Data) => {
            if (Data.status) {
                CartItemsData = Data.data;
                CartItemsTotal = Data.data.length;
                SubmitUserCart();
            }
            else {
                return res.status(app.get("BadRequestStatus")).json({
                    status: false,
                    message: Data.message
                });
            }
        });
    });
    // Submit User Current Cart
    let SubmitUserCart = () => {
        let sql = `UPDATE carts SET stores_to_compare = '${Stores}', no_of_stores = '${NoOfStores}', no_of_items = '${CartItemsTotal}', submission_date = '${app.get("DBDateFormat")()}', updated_at = '${app.get("DBDateFormat")()}', status = 1 WHERE id = '${CartId}'`;
        (0, crud_modules_1.RunAnyQuery)(sql).then((data) => {
            if (!data.status) {
                return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
            }
            FetchData();
        });
    };
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        var typeArrayNew = { 'iga': new Array(), 'superc': new Array(), 'maxi': new Array(), 'metro': new Array(), 'provigo': new Array(), 'walmart': new Array() };
        var temp;
        var e;
        CartItemsData.forEach((row, i) => {
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
            data.forEach((row, index) => {
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
        }).then((data) => {
            CartProcess();
        });
    });
    let CartProcess = () => {
        for (let a = 0; a < CartItemsData.length; a++) {
            let EGroceryItems = CartItemsData[a].grocery_items !== "" ? JSON.parse(CartItemsData[a].grocery_items) : [];
            let StoreIds = [];
            let StoreItemsIds = [];
            for (let b = 0; b < EGroceryItems.length; b++) {
                StoreIds.push(parseInt(EGroceryItems[b].store_id));
                StoreItemsIds.push(EGroceryItems[b].store_item.toString());
            }
            // IGA
            if (StoreIds.includes(1) && StoresToCompare.includes("1")) {
                if (IgaItems.length > 0) {
                    let Key = StoreIds.indexOf(1);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < IgaItems.length; c++) {
                        if (ItemId === IgaItems[c].sku) {
                            // check if store item is outdated or not
                            IgaAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], IgaItems[c], LastThursday));
                            Price = GetPrice(IgaItems[c].regular_price, IgaItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                IgaTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                IgaMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Super C
            if (StoreIds.includes(2) && StoresToCompare.includes("2")) {
                if (SupercItems.length > 0) {
                    let Key = StoreIds.indexOf(2);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < SupercItems.length; c++) {
                        if (ItemId === SupercItems[c].sku) {
                            Price = GetPrice(SupercItems[c].regular_price, SupercItems[c].sale_price, CartItemsData[a].quantity);
                            SupercAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], SupercItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                SupercTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                SupercMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Maxi
            if (StoreIds.includes(3) && StoresToCompare.includes("3")) {
                if (MaxiItems.length > 0) {
                    let Key = StoreIds.indexOf(3);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < MaxiItems.length; c++) {
                        if (ItemId === MaxiItems[c].sku) {
                            // check if store item is outdated or not
                            MaxiAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], MaxiItems[c], LastThursday));
                            Price = GetPrice(MaxiItems[c].regular_price, MaxiItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                MaxiTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                MaxiMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Metro
            if (StoreIds.includes(4) && StoresToCompare.includes("4")) {
                if (MetroItems.length > 0) {
                    let Key = StoreIds.indexOf(4);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < MetroItems.length; c++) {
                        if (ItemId === MetroItems[c].sku) {
                            // check if store item is outdated or not
                            Price = GetPrice(MetroItems[c].regular_price, MetroItems[c].sale_price, CartItemsData[a].quantity);
                            MetroAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], MetroItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                MetroTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                MetroMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Provigo
            if (StoreIds.includes(5) && StoresToCompare.includes("5")) {
                if (ProvigoItems.length > 0) {
                    let Key = StoreIds.indexOf(5);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < ProvigoItems.length; c++) {
                        if (ItemId === ProvigoItems[c].sku) {
                            // check if store item is outdated or not
                            Price = GetPrice(ProvigoItems[c].regular_price, ProvigoItems[c].sale_price, CartItemsData[a].quantity);
                            ProvigoAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], ProvigoItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                ProvigoTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                ProvigoMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Walmart
            if (StoreIds.includes(6) && StoresToCompare.includes("6")) {
                if (WalmartItems.length > 0) {
                    let Key = StoreIds.indexOf(6);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < WalmartItems.length; c++) {
                        if (ItemId === WalmartItems[c].sku) {
                            WalmartAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], WalmartItems[c], LastThursday));
                            Price = GetPrice(WalmartItems[c].regular_price, WalmartItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                WalmartTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                WalmartMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            delete CartItemsData[a].grocery_items;
        }
        /* Create cart item list */
        CartItemsData.forEach((item, index) => {
            if (UniqueAisles.indexOf(item.aisle_name) === -1) {
                UniqueAisles.push(item.aisle_name);
            }
        });
        UniqueAisles.forEach((item, index) => {
            AisleItemList = [];
            CartItemsData.forEach((c_item, c_index) => {
                if (item === c_item.aisle_name) {
                    AisleItemList.push(c_item);
                }
            });
            CartItemList.push({
                [item]: AisleItemList
            });
        });
        /* Create optimized items list */
        if (IgaAvailableItemsPrice.length > 0) {
            [...IgaAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('IGA', 1, IgaAvailableItemsPrice));
        }
        if (SupercAvailableItemsPrice.length > 0) {
            [...SupercAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Super C', 2, SupercAvailableItemsPrice));
        }
        if (MaxiAvailableItemsPrice.length > 0) {
            [...MaxiAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Maxi', 3, MaxiAvailableItemsPrice));
        }
        if (MetroAvailableItemsPrice.length > 0) {
            [...MetroAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Metro', 4, MetroAvailableItemsPrice));
        }
        if (ProvigoAvailableItemsPrice.length > 0) {
            [...ProvigoAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Provigo', 5, ProvigoAvailableItemsPrice));
        }
        if (WalmartAvailableItemsPrice.length > 0) {
            [...WalmartAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Walmart', 6, WalmartAvailableItemsPrice));
        }
        /* Set cart model */
        let ComparisonStores = (Stores !== '' && Stores != null) ? Stores.split(',') : [];
        // IGA
        StoreModels.push({
            store_name: 'IGA',
            store_id: 1,
            available_item_price_list: IgaAvailableItemsPrice,
            missing_item_list: IgaMissingItemsList,
            total_bill: IgaTotalBill > 0 ? IgaTotalBill : null
        });
        if (IgaTotalBill != null && IgaTotalBill > 0 && ComparisonStores.includes('1')) {
            BillArray.push(IgaTotalBill);
        }
        // Super C
        StoreModels.push({
            store_name: 'Super C',
            store_id: 2,
            available_item_price_list: SupercAvailableItemsPrice,
            missing_item_list: SupercMissingItemsList,
            total_bill: SupercTotalBill > 0 ? SupercTotalBill : null
        });
        if (SupercTotalBill != null && SupercTotalBill > 0 && ComparisonStores.includes('2')) {
            BillArray.push(SupercTotalBill);
        }
        // Maxi
        StoreModels.push({
            store_name: 'Maxi',
            store_id: 3,
            available_item_price_list: MaxiAvailableItemsPrice,
            missing_item_list: MaxiMissingItemsList,
            total_bill: MaxiTotalBill > 0 ? MaxiTotalBill : null
        });
        if (MaxiTotalBill != null && MaxiTotalBill > 0 && ComparisonStores.includes('3')) {
            BillArray.push(MaxiTotalBill);
        }
        // Metro
        StoreModels.push({
            store_name: 'Metro',
            store_id: 4,
            available_item_price_list: MetroAvailableItemsPrice,
            missing_item_list: MetroMissingItemsList,
            total_bill: MetroTotalBill > 0 ? MetroTotalBill : null
        });
        if (MetroTotalBill != null && MetroTotalBill > 0 && ComparisonStores.includes('4')) {
            BillArray.push(MetroTotalBill);
        }
        // Provigo
        StoreModels.push({
            store_name: 'Provigo',
            store_id: 5,
            available_item_price_list: ProvigoAvailableItemsPrice,
            missing_item_list: ProvigoMissingItemsList,
            total_bill: ProvigoTotalBill > 0 ? ProvigoTotalBill : null
        });
        if (ProvigoTotalBill != null && ProvigoTotalBill > 0 && ComparisonStores.includes('5')) {
            BillArray.push(ProvigoTotalBill);
        }
        // Walmart
        StoreModels.push({
            store_name: 'Walmart',
            store_id: 6,
            available_item_price_list: WalmartAvailableItemsPrice,
            missing_item_list: WalmartMissingItemsList,
            total_bill: WalmartTotalBill > 0 ? WalmartTotalBill : null
        });
        if (WalmartTotalBill != null && WalmartTotalBill > 0 && ComparisonStores.includes('6')) {
            BillArray.push(WalmartTotalBill);
        }
        let MaximumBill = Math.max.apply(Math, BillArray);
        let MinimumBill = Math.min.apply(Math, BillArray);
        BillDifference = parseFloat((MaximumBill - MinimumBill).toFixed(2));
        if (MinimumBill > 0) {
            BillPercentageMaxToMin = Math.round(100 - ((MinimumBill * 100) / MaximumBill)).toString() + "%";
        }
        Response();
    };
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            cartId: CartId,
            cartItemList: CartItemList,
            storeModels: StoreModels,
            optimizedItemList: OptimizedItemsList,
            differenceHighestToLowest: BillDifference,
            differenceHighestToLowestPercentage: BillPercentageMaxToMin,
        });
    };
    ValidationStep1();
});
app.post('/compareValidatedCart', ApiAuth, (req, res) => {
    let User = req.body.user;
    let Lang = (req.body.lang === '' || req.body.lang == null) ? 'en' : req.body.lang;
    let CartId = req.body.cart_id;
    let CartData = null;
    let CartItemsData = null;
    let CartItemList = [];
    let CartItemsTotal = 0;
    let StoresToCompare = ["1", "2", "3", "4", "5", "6"];
    let LastThursday = moment().startOf('week').add(-3, 'days'); //.format("YYYY-MM-DD");
    let CurrentWednesday = moment().startOf('week').add(3, 'days'); //.format("YYYY-MM-DD");
    let BillArray = [];
    let BillDifference = 0;
    let BillPercentageMaxToMin = "";
    let Price = null;
    let OptimizedItemsList = [];
    let OutDatedStatus = false;
    let UniqueAisles = [];
    let AisleItemList = [];
    /* Stores */
    let StoreModels = [];
    let IgaItems = [];
    let IgaAvailableItemsPrice = [];
    let IgaMissingItemsList = [];
    let IgaTotalBill = 0;
    let SupercItems = [];
    let SupercAvailableItemsPrice = [];
    let SupercMissingItemsList = [];
    let SupercTotalBill = 0;
    let MaxiItems = [];
    let MaxiAvailableItemsPrice = [];
    let MaxiMissingItemsList = [];
    let MaxiTotalBill = 0;
    let MetroItems = [];
    let MetroAvailableItemsPrice = [];
    let MetroMissingItemsList = [];
    let MetroTotalBill = 0;
    let ProvigoItems = [];
    let ProvigoAvailableItemsPrice = [];
    let ProvigoMissingItemsList = [];
    let ProvigoTotalBill = 0;
    let WalmartItems = [];
    let WalmartAvailableItemsPrice = [];
    let WalmartMissingItemsList = [];
    let WalmartTotalBill = 0;
    /* Stores */
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Cart id', value: CartId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Get User Current Cart Data */
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `carts A`, "A.*", `A.id = ${CartId} AND A.status <> 1`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected cart id is invalid.');
                }
                CartData = Data.data;
                GetCartItems();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        });
    });
    let GetCartItems = () => __awaiter(void 0, void 0, void 0, function* () {
        const tables = `cart_details A INNER JOIN eezly_items B ON A.eezly_item_id = B.id LEFT JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`;
        const columns = `A.eezly_item_id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN B.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                    END AS name, A.quantity, B.thumbnail, B.brand, B.size,
                    CASE
                        WHEN '${Lang}' = 'en' THEN C.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(C.name_fr, C.name)
                    END AS aisle_name, B.grocery_items,B.grocery_items AS raw_grocery_items`;
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, tables, columns, `A.cart_id = ${CartId}`, null, null, null).then((Data) => {
            if (Data.status) {
                CartItemsData = Data.data;
                CartItemsTotal = Data.data.length;
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
        var e;
        CartItemsData.forEach((row, i) => {
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
            data.forEach((row, index) => {
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
        }).then((data) => {
            CartProcess();
        });
    });
    let CartProcess = () => __awaiter(void 0, void 0, void 0, function* () {
        for (let a = 0; a < CartItemsData.length; a++) {
            let EGroceryItems = CartItemsData[a].grocery_items !== "" ? JSON.parse(CartItemsData[a].grocery_items) : [];
            let StoreIds = [];
            let StoreItemsIds = [];
            for (let b = 0; b < EGroceryItems.length; b++) {
                StoreIds.push(parseInt(EGroceryItems[b].store_id));
                StoreItemsIds.push(EGroceryItems[b].store_item.toString());
            }
            // IGA
            if (StoreIds.includes(1) && StoresToCompare.includes("1")) {
                if (IgaItems.length > 0) {
                    let Key = StoreIds.indexOf(1);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < IgaItems.length; c++) {
                        if (ItemId === IgaItems[c].sku) {
                            // check if store item is outdated or not
                            IgaAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], IgaItems[c], LastThursday));
                            Price = GetPrice(IgaItems[c].regular_price, IgaItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                IgaTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                IgaMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Super C
            if (StoreIds.includes(2) && StoresToCompare.includes("2")) {
                if (SupercItems.length > 0) {
                    let Key = StoreIds.indexOf(2);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < SupercItems.length; c++) {
                        if (ItemId === SupercItems[c].sku) {
                            SupercAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], SupercItems[c], LastThursday));
                            Price = GetPrice(SupercItems[c].regular_price, SupercItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                SupercTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                SupercMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Maxi
            if (StoreIds.includes(3) && StoresToCompare.includes("3")) {
                if (MaxiItems.length > 0) {
                    let Key = StoreIds.indexOf(3);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < MaxiItems.length; c++) {
                        if (ItemId === MaxiItems[c].sku) {
                            // check if store item is outdated or not
                            MaxiAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], MaxiItems[c], LastThursday));
                            Price = GetPrice(MaxiItems[c].regular_price, MaxiItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                MaxiTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                MaxiMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Metro
            if (StoreIds.includes(4) && StoresToCompare.includes("4")) {
                if (MetroItems.length > 0) {
                    let Key = StoreIds.indexOf(4);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < MetroItems.length; c++) {
                        if (ItemId === MetroItems[c].sku) {
                            // check if store item is outdated or not
                            MetroAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], MetroItems[c], LastThursday));
                            Price = GetPrice(MetroItems[c].regular_price, MetroItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                MetroTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                MetroMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Provigo
            if (StoreIds.includes(5) && StoresToCompare.includes("5")) {
                if (ProvigoItems.length > 0) {
                    let Key = StoreIds.indexOf(5);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < ProvigoItems.length; c++) {
                        if (ItemId === ProvigoItems[c].sku) {
                            // check if store item is outdated or not
                            ProvigoAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], ProvigoItems[c], LastThursday));
                            Price = GetPrice(ProvigoItems[c].regular_price, ProvigoItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                ProvigoTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                ProvigoMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Walmart
            if (StoreIds.includes(6) && StoresToCompare.includes("6")) {
                if (WalmartItems.length > 0) {
                    let Key = StoreIds.indexOf(6);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < WalmartItems.length; c++) {
                        if (ItemId === WalmartItems[c].sku) {
                            WalmartAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], WalmartItems[c], LastThursday));
                            Price = GetPrice(WalmartItems[c].regular_price, WalmartItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                WalmartTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                WalmartMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            delete CartItemsData[a].grocery_items;
        }
        /* Create cart item list */
        CartItemsData.forEach((item, index) => {
            if (UniqueAisles.indexOf(item.aisle_name) === -1) {
                UniqueAisles.push(item.aisle_name);
            }
        });
        UniqueAisles.forEach((item, index) => {
            AisleItemList = [];
            CartItemsData.forEach((c_item, c_index) => {
                if (item === c_item.aisle_name) {
                    AisleItemList.push(c_item);
                }
            });
            CartItemList.push({
                [item]: AisleItemList
            });
        });
        /* Create optimized items list */
        if (IgaAvailableItemsPrice.length > 0) {
            [...IgaAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('IGA', 1, IgaAvailableItemsPrice));
        }
        if (SupercAvailableItemsPrice.length > 0) {
            [...SupercAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Super C', 2, SupercAvailableItemsPrice));
        }
        if (MaxiAvailableItemsPrice.length > 0) {
            [...MaxiAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Maxi', 3, MaxiAvailableItemsPrice));
        }
        if (MetroAvailableItemsPrice.length > 0) {
            [...MetroAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Metro', 4, MetroAvailableItemsPrice));
        }
        if (ProvigoAvailableItemsPrice.length > 0) {
            [...ProvigoAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Provigo', 5, ProvigoAvailableItemsPrice));
        }
        if (WalmartAvailableItemsPrice.length > 0) {
            [...WalmartAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Walmart', 6, WalmartAvailableItemsPrice));
        }
        /* Set cart model */
        // IGA
        if (StoresToCompare.includes("1")) {
            StoreModels.push({
                store_name: 'IGA',
                store_id: 1,
                available_item_price_list: IgaAvailableItemsPrice,
                missing_item_list: IgaMissingItemsList,
                total_bill: IgaTotalBill > 0 ? IgaTotalBill : null
            });
            if (IgaTotalBill != null && IgaTotalBill > 0) {
                BillArray.push(IgaTotalBill);
            }
        }
        // Super C
        if (StoresToCompare.includes("2")) {
            StoreModels.push({
                store_name: 'Super C',
                store_id: 2,
                available_item_price_list: SupercAvailableItemsPrice,
                missing_item_list: SupercMissingItemsList,
                total_bill: SupercTotalBill > 0 ? SupercTotalBill : null
            });
            if (SupercTotalBill != null && SupercTotalBill > 0) {
                BillArray.push(SupercTotalBill);
            }
        }
        // Maxi
        if (StoresToCompare.includes("3")) {
            StoreModels.push({
                store_name: 'Maxi',
                store_id: 3,
                available_item_price_list: MaxiAvailableItemsPrice,
                missing_item_list: MaxiMissingItemsList,
                total_bill: MaxiTotalBill > 0 ? MaxiTotalBill : null
            });
            if (MaxiTotalBill != null && MaxiTotalBill > 0) {
                BillArray.push(MaxiTotalBill);
            }
        }
        // Metro
        if (StoresToCompare.includes("4")) {
            StoreModels.push({
                store_name: 'Metro',
                store_id: 4,
                available_item_price_list: MetroAvailableItemsPrice,
                missing_item_list: MetroMissingItemsList,
                total_bill: MetroTotalBill > 0 ? MetroTotalBill : null
            });
            if (MetroTotalBill != null && MetroTotalBill > 0) {
                BillArray.push(MetroTotalBill);
            }
        }
        // Provigo
        if (StoresToCompare.includes("5")) {
            StoreModels.push({
                store_name: 'Provigo',
                store_id: 5,
                available_item_price_list: ProvigoAvailableItemsPrice,
                missing_item_list: ProvigoMissingItemsList,
                total_bill: ProvigoTotalBill > 0 ? ProvigoTotalBill : null
            });
            if (ProvigoTotalBill != null && ProvigoTotalBill > 0) {
                BillArray.push(ProvigoTotalBill);
            }
        }
        // Walmart
        if (StoresToCompare.includes("6")) {
            StoreModels.push({
                store_name: 'Walmart',
                store_id: 6,
                available_item_price_list: WalmartAvailableItemsPrice,
                missing_item_list: WalmartMissingItemsList,
                total_bill: WalmartTotalBill > 0 ? WalmartTotalBill : null
            });
            if (WalmartTotalBill != null && WalmartTotalBill > 0) {
                BillArray.push(WalmartTotalBill);
            }
        }
        let MaximumBill = Math.max.apply(Math, BillArray);
        let MinimumBill = Math.min.apply(Math, BillArray);
        BillDifference = parseFloat((MaximumBill - MinimumBill).toFixed(2));
        if (MinimumBill > 0) {
            BillPercentageMaxToMin = Math.round(((MaximumBill * 100) / MinimumBill) - 100).toString() + "%";
        }
        UpdateCartStatusToValidated();
    });
    let UpdateCartStatusToValidated = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `UPDATE carts SET verification_date = '${app.get("DBDateFormat")()}', updated_at = '${app.get("DBDateFormat")()}', status = 3 WHERE id = '${CartData[0].id}'`;
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((data) => {
            if (!data.status) {
                return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
            }
            Response();
        });
    });
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            cartItemList: CartItemList,
            storeModels: StoreModels,
            optimizedItemList: OptimizedItemsList,
            differenceHighestToLowest: BillDifference,
            differenceHighestToLowestPercentage: BillPercentageMaxToMin,
        });
    };
    // Start
    ValidationStep1();
});
app.post('/compareAdmin', ApiAuth, (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let Lang = (req.body.lang === '' || req.body.lang == null) ? 'en' : req.body.lang;
    let CartId = req.body.cart_id;
    let CartData = null;
    let CartItemsData = null;
    let CartItemList = [];
    let StoresToCompare = null;
    let LastThursday = moment().startOf('week').add(-3, 'days'); //.format("YYYY-MM-DD");
    let CurrentWednesday = moment().startOf('week').add(3, 'days'); //.format("YYYY-MM-DD");
    let OutDatedStoreItemsList = [];
    let BillArray = [];
    let BillDifference = 0;
    let BillPercentageMaxToMin = "";
    let Price = null;
    let OptimizedItemsList = [];
    let OutDatedStatus = false;
    let UniqueAisles = [];
    let AisleItemList = [];
    /* Stores */
    let StoreModels = [];
    let IgaItems = [];
    let IgaAvailableItemsPrice = [];
    let IgaMissingItemsList = [];
    let IgaTotalBill = 0;
    let SupercItems = [];
    let SupercAvailableItemsPrice = [];
    let SupercMissingItemsList = [];
    let SupercTotalBill = 0;
    let MaxiItems = [];
    let MaxiAvailableItemsPrice = [];
    let MaxiMissingItemsList = [];
    let MaxiTotalBill = 0;
    let MetroItems = [];
    let MetroAvailableItemsPrice = [];
    let MetroMissingItemsList = [];
    let MetroTotalBill = 0;
    let ProvigoItems = [];
    let ProvigoAvailableItemsPrice = [];
    let ProvigoMissingItemsList = [];
    let ProvigoTotalBill = 0;
    let WalmartItems = [];
    let WalmartAvailableItemsPrice = [];
    let WalmartMissingItemsList = [];
    let WalmartTotalBill = 0;
    /* Stores */
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        (0, common_modules_1.CheckPermissionModule)(User.role_id, 'submit_user_cart').then((Data) => {
            if (Data.status) {
                ValidationStep1();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
            }
        });
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Cart id', value: CartId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for valid Cart Id */
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `carts A`, "A.*", `A.id = ${CartId} AND A.status <> 1`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected cart id is invalid.');
                }
                CartData = Data.data;
                StoresToCompare = Data.data[0].stores_to_compare != "" ? Data.data[0].stores_to_compare.split(',') : [];
                GetCartItems();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        });
    });
    let GetCartItems = () => __awaiter(void 0, void 0, void 0, function* () {
        const tables = `cart_details A JOIN eezly_items B ON A.eezly_item_id = B.id JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`;
        const columns = `A.eezly_item_id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN B.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                    END AS name, A.quantity, B.thumbnail, B.brand, B.size,
                    CASE
                        WHEN '${Lang}' = 'en' THEN C.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(C.name_fr, C.name)
                    END AS aisle_name, B.grocery_items ,B.grocery_items AS raw_grocery_items`;
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, tables, columns, `A.cart_id = ${CartId}`, null, null, null).then((Data) => {
            if (Data.status) {
                CartItemsData = Data.data;
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
        var e;
        CartItemsData.forEach((row, i) => {
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
            data.forEach((row, index) => {
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
        }).then((data) => {
            CartProcess();
        });
    });
    let CartProcess = () => __awaiter(void 0, void 0, void 0, function* () {
        for (let a = 0; a < CartItemsData.length; a++) {
            let EGroceryItems = CartItemsData[a].grocery_items !== "" ? JSON.parse(CartItemsData[a].grocery_items) : [];
            let StoreIds = [];
            let StoreItemsIds = [];
            for (let b = 0; b < EGroceryItems.length; b++) {
                StoreIds.push(parseInt(EGroceryItems[b].store_id));
                StoreItemsIds.push(EGroceryItems[b].store_item.toString());
            }
            // IGA
            if (StoreIds.includes(1) && StoresToCompare.includes("1")) {
                if (IgaItems.length > 0) {
                    let Key = StoreIds.indexOf(1);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < IgaItems.length; c++) {
                        if (ItemId === IgaItems[c].sku) {
                            // check if store item is outdated or not
                            IgaAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], IgaItems[c], LastThursday));
                            Price = GetPrice(IgaItems[c].regular_price, IgaItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                IgaTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                IgaMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Super C
            if (StoreIds.includes(2) && StoresToCompare.includes("2")) {
                if (SupercItems.length > 0) {
                    let Key = StoreIds.indexOf(2);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < SupercItems.length; c++) {
                        if (ItemId === SupercItems[c].sku) {
                            SupercAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], SupercItems[c], LastThursday));
                            Price = Price = GetPrice(SupercItems[c].regular_price, SupercItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                SupercTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                SupercMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Maxi
            if (StoreIds.includes(3) && StoresToCompare.includes("3")) {
                if (MaxiItems.length > 0) {
                    let Key = StoreIds.indexOf(3);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < MaxiItems.length; c++) {
                        if (ItemId === MaxiItems[c].sku) {
                            // check if store item is outdated or not
                            MaxiAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], MaxiItems[c], LastThursday));
                            Price = GetPrice(MaxiItems[c].regular_price, MaxiItems[c].sale_price, CartItemsData[a].quantity);
                            if (Price !== '' && Price != null) {
                                MaxiTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                MaxiMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Metro
            if (StoreIds.includes(4) && StoresToCompare.includes("4")) {
                if (MetroItems.length > 0) {
                    let Key = StoreIds.indexOf(4);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < MetroItems.length; c++) {
                        if (ItemId === MetroItems[c].sku) {
                            // check if store item is outdated or not
                            MetroAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], MetroItems[c], LastThursday));
                            Price = GetPrice(MetroItems[c].regular_price, MetroItems[c].sale_price, CartItemsData[a].quantity);
                            if (MaxiItems[c].price !== '' && MaxiItems[c].price != null) {
                                MetroTotalBill += parseFloat(MaxiItems[c].price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                MetroMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Provigo
            if (StoreIds.includes(5) && StoresToCompare.includes("5")) {
                if (ProvigoItems.length > 0) {
                    let Key = StoreIds.indexOf(5);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < ProvigoItems.length; c++) {
                        if (ItemId === ProvigoItems[c].sku) {
                            // check if store item is outdated or not
                            Price = GetPrice(ProvigoItems[c].regular_price, ProvigoItems[c].sale_price, CartItemsData[a].quantity);
                            ProvigoAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], ProvigoItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                ProvigoTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                ProvigoMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Walmart
            if (StoreIds.includes(6) && StoresToCompare.includes("6")) {
                if (WalmartItems.length > 0) {
                    let Key = StoreIds.indexOf(6);
                    let ItemId = StoreItemsIds[Key];
                    for (let c = 0; c < WalmartItems.length; c++) {
                        if (ItemId === WalmartItems[c].sku) {
                            Price = GetPrice(WalmartItems[c].regular_price, WalmartItems[c].sale_price, CartItemsData[a].quantity);
                            WalmartAvailableItemsPrice.push(pushStoreAvailabilityData(CartItemsData[a], WalmartItems[c], LastThursday));
                            if (Price !== '' && Price != null) {
                                WalmartTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            }
            else {
                WalmartMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            delete CartItemsData[a].grocery_items;
        }
        /* Create cart item list */
        CartItemsData.forEach((item, index) => {
            if (UniqueAisles.indexOf(item.aisle_name) === -1) {
                UniqueAisles.push(item.aisle_name);
            }
        });
        UniqueAisles.forEach((item, index) => {
            AisleItemList = [];
            CartItemsData.forEach((c_item, c_index) => {
                if (item === c_item.aisle_name) {
                    AisleItemList.push(c_item);
                }
            });
            CartItemList.push({
                [item]: AisleItemList
            });
        });
        /* Create optimized items list */
        if (IgaAvailableItemsPrice.length > 0) {
            [...IgaAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('IGA', 1, IgaAvailableItemsPrice));
        }
        if (SupercAvailableItemsPrice.length > 0) {
            [...SupercAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Super C', 2, SupercAvailableItemsPrice));
        }
        if (MaxiAvailableItemsPrice.length > 0) {
            [...MaxiAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Maxi', 3, MaxiAvailableItemsPrice));
        }
        if (MetroAvailableItemsPrice.length > 0) {
            [...MetroAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Metro', 4, MetroAvailableItemsPrice));
        }
        if (ProvigoAvailableItemsPrice.length > 0) {
            [...ProvigoAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Provigo', 5, ProvigoAvailableItemsPrice));
        }
        if (WalmartAvailableItemsPrice.length > 0) {
            [...WalmartAvailableItemsPrice].sort((a, b) => a.price - b.price);
            OptimizedItemsList.push(pushOptimisedList('Walmart', 6, WalmartAvailableItemsPrice));
        }
        /* Set cart model */
        // IGA
        if (StoresToCompare.includes("1")) {
            StoreModels.push({
                store_name: 'IGA',
                store_id: 1,
                available_item_price_list: IgaAvailableItemsPrice,
                missing_item_list: IgaMissingItemsList,
                total_bill: IgaTotalBill > 0 ? IgaTotalBill : null
            });
            if (IgaTotalBill != null && IgaTotalBill > 0) {
                BillArray.push(IgaTotalBill);
            }
        }
        // Super C
        if (StoresToCompare.includes("2")) {
            StoreModels.push({
                store_name: 'Super C',
                store_id: 2,
                available_item_price_list: SupercAvailableItemsPrice,
                missing_item_list: SupercMissingItemsList,
                total_bill: SupercTotalBill > 0 ? SupercTotalBill : null
            });
            if (SupercTotalBill != null && SupercTotalBill > 0) {
                BillArray.push(SupercTotalBill);
            }
        }
        // Maxi
        if (StoresToCompare.includes("3")) {
            StoreModels.push({
                store_name: 'Maxi',
                store_id: 3,
                available_item_price_list: MaxiAvailableItemsPrice,
                missing_item_list: MaxiMissingItemsList,
                total_bill: MaxiTotalBill > 0 ? MaxiTotalBill : null
            });
            if (MaxiTotalBill != null && MaxiTotalBill > 0) {
                BillArray.push(MaxiTotalBill);
            }
        }
        // Metro
        if (StoresToCompare.includes("4")) {
            StoreModels.push({
                store_name: 'Metro',
                store_id: 4,
                available_item_price_list: MetroAvailableItemsPrice,
                missing_item_list: MetroMissingItemsList,
                total_bill: MetroTotalBill > 0 ? MetroTotalBill : null
            });
            if (MetroTotalBill != null && MetroTotalBill > 0) {
                BillArray.push(MetroTotalBill);
            }
        }
        // Provigo
        if (StoresToCompare.includes("5")) {
            StoreModels.push({
                store_name: 'Provigo',
                store_id: 5,
                available_item_price_list: ProvigoAvailableItemsPrice,
                missing_item_list: ProvigoMissingItemsList,
                total_bill: ProvigoTotalBill > 0 ? ProvigoTotalBill : null
            });
            if (ProvigoTotalBill != null && ProvigoTotalBill > 0) {
                BillArray.push(ProvigoTotalBill);
            }
        }
        // Walmart
        if (StoresToCompare.includes("6")) {
            StoreModels.push({
                store_name: 'Walmart',
                store_id: 6,
                available_item_price_list: WalmartAvailableItemsPrice,
                missing_item_list: WalmartMissingItemsList,
                total_bill: WalmartTotalBill > 0 ? WalmartTotalBill : null
            });
            if (WalmartTotalBill != null && WalmartTotalBill > 0) {
                BillArray.push(WalmartTotalBill);
            }
        }
        let MaximumBill = Math.max.apply(Math, BillArray);
        let MinimumBill = Math.min.apply(Math, BillArray);
        BillDifference = parseFloat((MaximumBill - MinimumBill).toFixed(2));
        if (MinimumBill > 0) {
            BillPercentageMaxToMin = Math.round(((MaximumBill * 100) / MinimumBill) - 100).toString() + "%";
        }
        Response();
    });
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            cartItemList: CartItemList,
            storeModels: StoreModels,
            optimizedItemList: OptimizedItemsList,
            differenceHighestToLowest: BillDifference,
            differenceHighestToLowestPercentage: BillPercentageMaxToMin,
        });
    };
    /* Start */
    CheckRolePermission();
});
// Calculate Price
function GetPrice(regular_price, sale_price, quantity) {
    let price = null;
    if (regular_price !== '' && parseFloat(regular_price) > 0) {
        // condition when regular price is available
        if (sale_price !== '' && parseFloat(sale_price) > 0 && parseFloat(sale_price) < parseFloat(regular_price)) {
            price = sale_price;
        }
        else {
            price = regular_price;
        }
    }
    else {
        // condition when regular price is 0
        if (sale_price !== '' && parseFloat(sale_price) > 0) {
            price = sale_price;
        }
        else {
            price = null;
        }
    }
    return (price !== '' && price != null) ? price * quantity : price;
}
function pushStoreAvailabilityData(CartItemsData, StoreItems, LastThursday) {
    let OutDatedStatus = moment(StoreItems.updated_at) < LastThursday;
    let Price = GetPrice(StoreItems.regular_price, StoreItems.sale_price, CartItemsData.quantity);
    return ({
        eezly_item_id: CartItemsData.eezly_item_id,
        store_item_id: StoreItems.sku,
        regular_price: parseFloat(StoreItems.regular_price) * CartItemsData.quantity,
        sale_price: parseFloat(StoreItems.sale_price) * CartItemsData.quantity,
        price: (Price !== '' && Price != null) ? parseFloat(Price) : Price,
        outdated_status: OutDatedStatus,
    });
}
function pushNoLoginStoreAvailabilityData(CartItemsData, StoreItems, LastThursday) {
    let OutDatedStatus = moment(StoreItems.updated_at) < LastThursday;
    let Price = GetPrice(StoreItems.regular_price, StoreItems.sale_price, CartItemsData.quantity);
    return ({
        eezly_item_id: CartItemsData.eezly_item_id,
        store_item_id: StoreItems.sku,
        regular_price: StoreItems.regular_price,
        sale_price: StoreItems.sale_price,
        price: Price,
        outdated_status: OutDatedStatus,
    });
}
function pushOptimisedList(storeName, storeId, itemAvailable) {
    return ({
        store_name: storeName,
        store_id: storeId,
        eezly_item_id: itemAvailable[0].eezly_item_id,
        store_item_id: itemAvailable[0].store_item_id,
        regular_price: itemAvailable[0].regular_price,
        sale_price: itemAvailable[0].sale_price,
        price: itemAvailable[0].price,
        outdated_status: itemAvailable[0].outdated_status,
    });
}
module.exports = app;
