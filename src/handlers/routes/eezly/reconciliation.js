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
const crud_modules_1 = require("../../modules/crud.modules");
const db_modules_1 = require("../../modules/db.modules");
const http_status_codes_1 = require("http-status-codes");
const validator_modules_1 = require("../../modules/validator.modules");
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
const formData = require('express-form-data');
const os = require("os");
const cors = require('cors');
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
app.get('/tinder', ApiAuth, (req, res) => {
    var _a, _b, _c;
    let db = app.get("db");
    let User = req.body.user;
    let EezlyAisleId = (_a = req.query.eezly_aisle_id) !== null && _a !== void 0 ? _a : null;
    let EezlyBrand = (_b = req.query.brand) !== null && _b !== void 0 ? _b : null;
    let EezlySize = (_c = req.query.size) !== null && _c !== void 0 ? _c : null;
    /* Stores */
    let IgaItems = null;
    let SupercItems = null;
    let MaxiItems = null;
    let MetroItems = null;
    let ProvigoItems = null;
    let WalmartItems = null;
    /* Stores */
    let ReconciliationItems = [];
    let ReconciliationItem = {};
    let FinalReconciliationItem = [];
    let AllEezlyItems = [];
    let DuplicatedItems = [];
    let FinalDuplicatedItems = [];
    let EezlyItemGroceryItemList = [];
    let ItemId = 0;
    let CheckingItemIdArr = [0];
    let ItemName = '';
    let DuplicateItemsStatus = 0;
    let RemoveDuplicatedItems = [];
    let IgaEezlyItemsArr = [];
    let SupercEezlyItemsArr = [];
    let MaxiEezlyItemsArr = [];
    let MetroEezlyItemsArr = [];
    let ProvigoEezlyItemsArr = [];
    let WalmartEezlyItemsArr = [];
    let GeneralEezlyItemsArr = [];
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'get_user_details');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => {
        FetchData('get_all_eezly_items');
    };
    let FetchData = (Type) => __awaiter(void 0, void 0, void 0, function* () {
        if (Type === 'get_all_eezly_items') {
            yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> ''`, null, null, null).then((Data) => {
                if (Data.status) {
                    AllEezlyItems = Data.data;
                    FetchData('get_all_reconciliation_items');
                }
                else {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
                }
            });
        }
        else if (Type === 'get_all_reconciliation_items') {
            let AsileCondition = "";
            let BrandCondition = "";
            let SizeCondition = "";
            if (EezlyAisleId != null) {
                AsileCondition += `AND ` + filterCodeCondition(EezlyAisleId, 'A.eezly_aisle_id');
                //AsileCondition += `AND A.eezly_aisle_id = ${EezlyAisleId}`;
            }
            if (EezlyAisleId != null && EezlyAisleId == '1') {
                BrandCondition = "";
            }
            else {
                BrandCondition += `AND A.brand IS NOT NULL AND A.brand <> ''`;
                if (EezlyBrand != null) {
                    BrandCondition += `AND ` + filterCodeCondition(EezlyBrand, 'A.brand');
                    //BrandCondition += `AND A.brand = "${EezlyBrand}"`;
                }
            }
            if (EezlySize != null) {
                SizeCondition += `AND ` + filterCodeCondition(EezlySize, 'A.size');
                // SizeCondition += `AND A.size = "${EezlySize}"`;
            }
            yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.size IS NOT NULL AND A.size <> '' AND A.consolidated_date IS NULL ${AsileCondition} ${BrandCondition} ${SizeCondition}`, null, ` ORDER BY A.updated_at ASC`, ` `).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
                if (Data.status) {
                    if (Data.data.length > 0) {
                        ReconciliationItems = Data.data;
                        FetchData("reconciliation_item");
                    }
                    else {
                        Response();
                    }
                }
                else {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
                }
            }));
        }
        else if (Type === 'reconciliation_item') {
            for (let counter = 0; counter < ReconciliationItems.length; counter++) {
                FinalReconciliationItem = [];
                ReconciliationItem = ReconciliationItems[counter];
                ItemId = ReconciliationItems[counter].id;
                ItemName = ReconciliationItems[counter].name;
                EezlyItemGroceryItemList = ReconciliationItems[counter].grocery_items !== '' && ReconciliationItems[counter].grocery_items !== null ? JSON.parse(ReconciliationItems[counter].grocery_items) : [];
                FinalReconciliationItem.push(ReconciliationItem);
                DuplicatedItems = [];
                /* Eezly Items Duplicated - Start */
                let spiltArray = ReconciliationItem.size.split(' ');
                let finalSize = "";
                spiltArray.forEach((e, i) => {
                    if (!isNaN(e)) {
                        if (e.includes(".") || e.includes(",")) {
                            e = e.replace(/[0]+$/, "");
                            if (e.substring(e.length - 1) == '.' || e.substring(e.length - 1) == ',') {
                                e = e.slice(0, -1);
                            }
                            spiltArray[i] = e + "%";
                        }
                    }
                });
                finalSize = spiltArray.join(" ");
                for (let i = 0; i < AllEezlyItems.length; i++) {
                    if (EezlyAisleId != null && EezlyAisleId == '1') {
                        if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].eezly_aisle_id === ReconciliationItem.eezly_aisle_id)) {
                            DuplicatedItems.push(AllEezlyItems[i]);
                        }
                    }
                    else {
                        if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].brand === ReconciliationItem.brand) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].size != null) && (AllEezlyItems[i].size.includes(finalSize)) && (AllEezlyItems[i].eezly_aisle_id === ReconciliationItem.eezly_aisle_id)) {
                            DuplicatedItems.push(AllEezlyItems[i]);
                        }
                    }
                }
                /* Eezly Items Duplicated - End */
                /* Verify Eezly Items - Start */
                let refineItemName = duplicateFilter(ItemName);
                let eezlyItemNameArray = (refineItemName !== '' && refineItemName !== null) ? refineItemName.split(" ") : [];
                let IgaMaxMatch = -1;
                let SupercMaxMatch = -1;
                let MaxiMaxMatch = -1;
                let MetroMaxMatch = -1;
                let ProvigoMaxMatch = -1;
                let WalmartMaxMatch = -1;
                let TotalWordMatch = 0;
                let TotalWordMatchStatus = 0;
                let NormalCaseLetter = null;
                let SentenceCaseLetter = null;
                for (let a = 0; a < DuplicatedItems.length; a++) {
                    if (DuplicatedItems[a].grocery_items !== null && DuplicatedItems[a].grocery_items !== "") {
                        let EGroceryItems = JSON.parse(DuplicatedItems[a].grocery_items);
                        DuplicateItemsStatus = 0;
                        TotalWordMatchStatus = 0;
                        for (let i = 0; i < EGroceryItems.length; i++) {
                            TotalWordMatch = 0;
                            // first check if this duplicate item store is already merged then skip it.
                            for (let ei_index = 0; ei_index < EezlyItemGroceryItemList.length; ei_index++) {
                                if (EGroceryItems[i].store_id === EezlyItemGroceryItemList[ei_index].store_id) {
                                    DuplicateItemsStatus = 1;
                                    break;
                                }
                            }
                            if (DuplicateItemsStatus === 1) {
                                RemoveDuplicatedItems.push(DuplicatedItems[a].id);
                                break;
                            }
                            if (TotalWordMatchStatus === 0) {
                                // if (EGroceryItems.length > 1) {
                                //     // IF ITEM CONTAINS MORE THAN 1 GROCERY STORE ITEM, ADD IT TO THE FINAL LIST
                                //     GeneralEezlyItemsArr.push(DuplicatedItems[a].id);
                                //     TotalWordMatchStatus = 1;
                                // } else {
                                if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.iga) {
                                    // IGA
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > IgaMaxMatch) {
                                            IgaEezlyItemsArr = [];
                                            IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                            IgaMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === IgaMaxMatch) {
                                            IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.superc) {
                                    // SUPERC
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > SupercMaxMatch) {
                                            SupercEezlyItemsArr = [];
                                            SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                            SupercMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === SupercMaxMatch) {
                                            SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.maxi) {
                                    // MAXI
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > MaxiMaxMatch) {
                                            MaxiEezlyItemsArr = [];
                                            MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                            MaxiMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === MaxiMaxMatch) {
                                            MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.metro) {
                                    // METRO
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > MetroMaxMatch) {
                                            MetroEezlyItemsArr = [];
                                            MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                            MetroMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === MetroMaxMatch) {
                                            MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.provigo) {
                                    // PROVIGO
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > ProvigoMaxMatch) {
                                            ProvigoEezlyItemsArr = [];
                                            ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                            ProvigoMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === ProvigoMaxMatch) {
                                            ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.walmart) {
                                    // WALMART
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > WalmartMaxMatch) {
                                            WalmartEezlyItemsArr = [];
                                            WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                            WalmartMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === WalmartMaxMatch) {
                                            WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                // }
                            }
                        }
                    }
                }
                // Remove Items from duplicate eezly items array which stores are already merged
                for (let rd_index = 0; rd_index < RemoveDuplicatedItems.length; rd_index++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === RemoveDuplicatedItems[rd_index]) {
                            DuplicatedItems.splice(main_arr_index, 1);
                            break;
                        }
                    }
                }
                /* Verify Eezly Items - End */
                /* Create Final Duplicate Items List - Start */
                // IGA
                for (let z = 0; z < IgaEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === IgaEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // SUPERC
                for (let z = 0; z < SupercEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === SupercEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // MAXI
                for (let z = 0; z < MaxiEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === MaxiEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // METRO
                for (let z = 0; z < MetroEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === MetroEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // PROVIGO
                for (let z = 0; z < ProvigoEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === ProvigoEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // WALMART
                for (let z = 0; z < WalmartEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === WalmartEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // GENERAL
                for (let z = 0; z < GeneralEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === GeneralEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                if (FinalDuplicatedItems.length > 0) {
                    /* Main Process - Start */
                    // let GroceryItems: any = [];
                    // for (let a = 0; a < ReconciliationItem.length; a++) {
                    //     if (ReconciliationItem[a].grocery_items !== null && ReconciliationItem[a].grocery_items !== "") {
                    //         let EGroceryItems = JSON.parse(ReconciliationItem[a].grocery_items);
                    //         for (let i = 0; i < EGroceryItems.length; i++) {
                    //             let SubArray: any = {
                    //                 store_id: EGroceryItems[i].store_id,
                    //                 store_name: EGroceryItems[i].store_name
                    //             };
                    //             GroceryItems.push(SubArray);
                    //         }
                    //         ReconciliationItem[a].grocery_items = GroceryItems;
                    //         GroceryItems = [];
                    //     }
                    //     ReconciliationItem[a].created_by = ReconciliationItem[a].createdBy;
                    //     ReconciliationItem[a].updated_by = ReconciliationItem[a].updatedBy;
                    //     delete ReconciliationItem[a].createdBy;
                    //     delete ReconciliationItem[a].updatedBy;
                    // }
                    break;
                    /* Main Process - End */
                }
                else {
                    FinalReconciliationItem = [];
                    continue;
                }
                /* Create Final Duplicate Items List - End */
            }
            /* Send Response */
            Response();
        }
        else {
            console.log("Nothing!");
        }
    });
    let Response = () => {
        let Data = {
            status: true,
            data: FinalReconciliationItem
        };
        return res.status(http_status_codes_1.StatusCodes.OK).json(Data);
    };
    /* Start */
    CheckRolePermission();
});
app.get('/', ApiAuth, (req, res) => {
    let User = req.body.user;
    let ItemId = req.query.eezly_item_id;
    let ItemName = '';
    /* Stores */
    let EezlyItemDetails = null;
    let AllEezlyItems = [];
    let DuplicatedItems = [];
    let FinalDuplicatedItems = [];
    let EezlyItemGroceryItemList = [];
    let DuplicateItemsStatus = 0;
    let RemoveDuplicatedItems = [];
    let IgaEezlyItemsArr = [];
    let SupercEezlyItemsArr = [];
    let MaxiEezlyItemsArr = [];
    let MetroEezlyItemsArr = [];
    let ProvigoEezlyItemsArr = [];
    let WalmartEezlyItemsArr = [];
    let GeneralEezlyItemsArr = [];
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'get_user_details');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Eezly item id', value: ItemId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `eezly_items A`, "A.*", `A.id = ${ItemId}`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected eezly item id is invalid.');
                }
                ItemName = Data.data[0].name;
                EezlyItemGroceryItemList = Data.data[0].grocery_items !== '' && Data.data[0].grocery_items !== null ? JSON.parse(Data.data[0].grocery_items) : [];
                EezlyItemDetails = Data.data;
                FetchData('get_all_eezly_items');
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        });
    });
    let FetchData = (Type) => __awaiter(void 0, void 0, void 0, function* () {
        if (Type === 'get_all_eezly_items') {
            (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.id != '${ItemId}'`, null, null, null).then((Data) => {
                if (Data.status) {
                    AllEezlyItems = Data.data;
                    FetchData("eezly_items_duplicated");
                }
                else {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
                }
            });
        }
        else if (Type === 'eezly_items_duplicated') {
            let spiltArray = EezlyItemDetails[0].size.split(' ');
            let finalSize = "";
            spiltArray.forEach((e, i) => {
                if (!isNaN(e)) {
                    if (e.includes(".") || e.includes(",")) {
                        e = e.replace(/[0]+$/, "");
                        if (e.substring(e.length - 1) == '.' || e.substring(e.length - 1) == ',') {
                            e = e.slice(0, -1);
                        }
                        spiltArray[i] = e + "%";
                    }
                }
            });
            finalSize = spiltArray.join(" ");
            for (let i = 0; i < AllEezlyItems.length; i++) {
                if (EezlyItemDetails[0].eezly_aisle_id == '1') {
                    if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].eezly_aisle_id === EezlyItemDetails[0].eezly_aisle_id)) {
                        DuplicatedItems.push(AllEezlyItems[i]);
                    }
                }
                else {
                    if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].brand === EezlyItemDetails[0].brand) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].size != null) && (AllEezlyItems[i].size.includes(finalSize)) && (AllEezlyItems[i].eezly_aisle_id === EezlyItemDetails[0].eezly_aisle_id)) {
                        DuplicatedItems.push(AllEezlyItems[i]);
                    }
                }
            }
            /* Main Process - Start */
            let GroceryItems = [];
            let refineItemName = duplicateFilter(ItemName);
            let eezlyItemNameArray = (refineItemName !== '' && refineItemName !== null) ? refineItemName.split(" ") : [];
            let IgaMaxMatch = -1;
            let SupercMaxMatch = -1;
            let MaxiMaxMatch = -1;
            let MetroMaxMatch = -1;
            let ProvigoMaxMatch = -1;
            let WalmartMaxMatch = -1;
            let TotalWordMatch = 0;
            let TotalWordMatchStatus = 0;
            let NormalCaseLetter = null;
            let SentenceCaseLetter = null;
            for (let a = 0; a < DuplicatedItems.length; a++) {
                if (DuplicatedItems[a].grocery_items !== null && DuplicatedItems[a].grocery_items !== "") {
                    let EGroceryItems = JSON.parse(DuplicatedItems[a].grocery_items);
                    DuplicateItemsStatus = 0;
                    TotalWordMatchStatus = 0;
                    for (let i = 0; i < EGroceryItems.length; i++) {
                        TotalWordMatch = 0;
                        // first check if this duplicate item store is already merged then skip it.
                        for (let ei_index = 0; ei_index < EezlyItemGroceryItemList.length; ei_index++) {
                            if (EGroceryItems[i].store_id === EezlyItemGroceryItemList[ei_index].store_id) {
                                DuplicateItemsStatus = 1;
                                break;
                            }
                        }
                        if (DuplicateItemsStatus === 1) {
                            RemoveDuplicatedItems.push(DuplicatedItems[a].id);
                            break;
                        }
                        if (TotalWordMatchStatus === 0) {
                            // if (EGroceryItems.length > 1) {
                            //     // IF ITEM CONTAINS MORE THAN 1 GROCERY STORE ITEM, ADD IT TO THE FINAL LIST
                            //     GeneralEezlyItemsArr.push(DuplicatedItems[a].id);
                            //     TotalWordMatchStatus = 1;
                            // } else {
                            if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.iga) {
                                // IGA
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > IgaMaxMatch) {
                                        IgaEezlyItemsArr = [];
                                        IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                        IgaMaxMatch = TotalWordMatch;
                                    }
                                    else if (TotalWordMatch > 0 && TotalWordMatch === IgaMaxMatch) {
                                        IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;
                            }
                            else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.superc) {
                                // SUPERC
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > SupercMaxMatch) {
                                        SupercEezlyItemsArr = [];
                                        SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                        SupercMaxMatch = TotalWordMatch;
                                    }
                                    else if (TotalWordMatch > 0 && TotalWordMatch === SupercMaxMatch) {
                                        SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;
                            }
                            else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.maxi) {
                                // MAXI
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > MaxiMaxMatch) {
                                        MaxiEezlyItemsArr = [];
                                        MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                        MaxiMaxMatch = TotalWordMatch;
                                    }
                                    else if (TotalWordMatch > 0 && TotalWordMatch === MaxiMaxMatch) {
                                        MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;
                            }
                            else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.metro) {
                                // METRO
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > MetroMaxMatch) {
                                        MetroEezlyItemsArr = [];
                                        MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                        MetroMaxMatch = TotalWordMatch;
                                    }
                                    else if (TotalWordMatch > 0 && TotalWordMatch === MetroMaxMatch) {
                                        MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;
                            }
                            else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.provigo) {
                                // PROVIGO
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > ProvigoMaxMatch) {
                                        ProvigoEezlyItemsArr = [];
                                        ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                        ProvigoMaxMatch = TotalWordMatch;
                                    }
                                    else if (TotalWordMatch > 0 && TotalWordMatch === ProvigoMaxMatch) {
                                        ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;
                            }
                            else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.walmart) {
                                // WALMART
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > WalmartMaxMatch) {
                                        WalmartEezlyItemsArr = [];
                                        WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                        WalmartMaxMatch = TotalWordMatch;
                                    }
                                    else if (TotalWordMatch > 0 && TotalWordMatch === WalmartMaxMatch) {
                                        WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;
                            }
                            // }
                        }
                        let SubArray = {
                            store_id: EGroceryItems[i].store_id,
                            store_name: EGroceryItems[i].store_name,
                            store_item: EGroceryItems[i].store_item
                        };
                        GroceryItems.push(SubArray);
                    }
                    DuplicatedItems[a].grocery_items = GroceryItems;
                    GroceryItems = [];
                }
                DuplicatedItems[a].created_by = DuplicatedItems[a].createdBy;
                DuplicatedItems[a].updated_by = DuplicatedItems[a].updatedBy;
                delete DuplicatedItems[a].createdBy;
                delete DuplicatedItems[a].updatedBy;
            }
            // Remove Items from duplicate eezly items array which stores are already merged
            for (let rd_index = 0; rd_index < RemoveDuplicatedItems.length; rd_index++) {
                for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                    if (DuplicatedItems[main_arr_index].id === RemoveDuplicatedItems[rd_index]) {
                        DuplicatedItems.splice(main_arr_index, 1);
                        break;
                    }
                }
            }
            /* Main Process - End */
            /* Create Final Duplicate Items - Start */
            // IGA
            for (let z = 0; z < IgaEezlyItemsArr.length; z++) {
                for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                    if (DuplicatedItems[main_arr_index].id === IgaEezlyItemsArr[z]) {
                        FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                        break;
                    }
                }
            }
            // SUPERC
            for (let z = 0; z < SupercEezlyItemsArr.length; z++) {
                for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                    if (DuplicatedItems[main_arr_index].id === SupercEezlyItemsArr[z]) {
                        FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                        break;
                    }
                }
            }
            // MAXI
            for (let z = 0; z < MaxiEezlyItemsArr.length; z++) {
                for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                    if (DuplicatedItems[main_arr_index].id === MaxiEezlyItemsArr[z]) {
                        FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                        break;
                    }
                }
            }
            // METRO
            for (let z = 0; z < MetroEezlyItemsArr.length; z++) {
                for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                    if (DuplicatedItems[main_arr_index].id === MetroEezlyItemsArr[z]) {
                        FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                        break;
                    }
                }
            }
            // PROVIGO
            for (let z = 0; z < ProvigoEezlyItemsArr.length; z++) {
                for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                    if (DuplicatedItems[main_arr_index].id === ProvigoEezlyItemsArr[z]) {
                        FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                        break;
                    }
                }
            }
            // WALMART
            for (let z = 0; z < WalmartEezlyItemsArr.length; z++) {
                for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                    if (DuplicatedItems[main_arr_index].id === WalmartEezlyItemsArr[z]) {
                        FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                        break;
                    }
                }
            }
            // GENERAL
            for (let z = 0; z < GeneralEezlyItemsArr.length; z++) {
                for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                    if (DuplicatedItems[main_arr_index].id === GeneralEezlyItemsArr[z]) {
                        FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                        break;
                    }
                }
            }
            /* Create Final Duplicate Items - End */
            /* Send Response */
            Response();
        }
        else {
            console.log("Nothing!");
        }
    });
    let Response = () => {
        let Data = {
            status: true,
            duplicateItems: FinalDuplicatedItems,
        };
        return res.status(http_status_codes_1.StatusCodes.OK).json(Data);
    };
    /* Start */
    CheckRolePermission();
});
app.post('/merge', ApiAuth, (req, res) => {
    let User = req.body.user;
    let ItemIds = req.body.delete_eezly_item_id;
    let Name = req.body.name;
    let FrenchName = req.body.name_fr;
    let Thumbnail = req.body.thumbnail;
    let EezlyAisleId = req.body.eezly_aisle_id;
    let Brand = req.body.brand;
    let Size = req.body.size;
    /* Stores */
    let ReconciliationItem = null;
    let NewEezlyItemId = null;
    let GroceryItemList = [];
    let SettingsData = null;
    let DeleteEezlyItemsData = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'get_user_details');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Eezly item id', value: ItemIds, type: 'Empty' }, { field: 'Thumbnail', value: Thumbnail, type: 'Empty' }, { field: 'Eezly aisle id', value: EezlyAisleId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for Eezly Aisle Id exists */
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `eezly_aisles A`, "A.*", `A.id = ${EezlyAisleId}`, null, null, null).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected eezly aisle id is invalid.');
                }
                else {
                    /* Validate Eezly Items Ids */
                    yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `eezly_items A`, "A.id, A.grocery_items", `A.deleted_at IS NULL`, null, null, null).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
                        if (Data.status) {
                            let EezlyItemIds = [];
                            let EezlyItemIdsGroceryItems = [];
                            for (let k = 0; k < Data.data.length; k++) {
                                EezlyItemIds.push(Data.data[k].id.toString());
                                EezlyItemIdsGroceryItems.push(Data.data[k].grocery_items);
                            }
                            ItemIds = ItemIds !== "" ? ItemIds.split(",") : [];
                            for (let j = 0; j < ItemIds.length; j++) {
                                if (!EezlyItemIds.includes(ItemIds[j])) {
                                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'One of the eezly item id is invalid');
                                }
                                else {
                                    let EezlyItemIdsGroceryItemsIndex = EezlyItemIds.indexOf(ItemIds[j]);
                                    let EezlyItemGroceryItemsList = (EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex] !== '' && EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex] !== null) ? JSON.parse(EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex]) : [];
                                    if (EezlyItemGroceryItemsList.length > 0) {
                                        for (let ei_index = 0; ei_index < EezlyItemGroceryItemsList.length; ei_index++) {
                                            GroceryItemList.push(EezlyItemGroceryItemsList[ei_index]);
                                        }
                                    }
                                }
                            }
                            GetSettings();
                        }
                        else {
                            return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
                        }
                    }));
                }
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        }));
    });
    let GetSettings = () => {
        (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "settings", "*", "id = 1", null, null, null).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
            if (Data.status) {
                SettingsData = Data.data;
                GetDeleteItemsRecord();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        }));
    };
    let GetDeleteItemsRecord = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "eezly_items", "*", `id IN (${ItemIds.join(",")})`, null, null, null).then((Data) => __awaiter(void 0, void 0, void 0, function* () {
            if (Data.status) {
                DeleteEezlyItemsData = Data.data;
                DeleteAlgoliaItems();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        }));
    });
    let DeleteAlgoliaItems = () => __awaiter(void 0, void 0, void 0, function* () {
        if (DeleteEezlyItemsData !== '' && DeleteEezlyItemsData != null) {
            for (let i = 0; i < DeleteEezlyItemsData.length; i++) {
                if (DeleteEezlyItemsData[i].name !== '' && DeleteEezlyItemsData[i].name != null) {
                    yield deleteFromAlgolia(DeleteEezlyItemsData[i].name, SettingsData[0].environment, 'en');
                }
                if (DeleteEezlyItemsData[i].name_fr !== '' && DeleteEezlyItemsData[i].name_fr != null) {
                    yield deleteFromAlgolia(DeleteEezlyItemsData[i].name_fr, SettingsData[0].environment, 'fr');
                }
            }
        }
        DeleteEezlyItems();
    });
    let DeleteEezlyItems = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `DELETE FROM eezly_items WHERE id IN (${ItemIds.join(",")})`;
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((data) => __awaiter(void 0, void 0, void 0, function* () {
            if (!data.status) {
                return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
            }
            CreateEezlyItem();
        }));
    });
    let CreateEezlyItem = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id, grocery_items, consolidated_date, created_by, created_at,listed) VALUES (IF("${Name}" = "null", null, "${Name}"), IF("${FrenchName}" = "null", null, "${FrenchName}"), IF('${Thumbnail}' = "null", null, '${Thumbnail}'), IF("${Brand}" = "null", null, "${Brand}"), IF('${Size}' = "null", null, '${Size}'), IF('${EezlyAisleId}' = "null", null, '${EezlyAisleId}'), '${JSON.stringify(GroceryItemList)}', '${app.get("DBDateFormat")()}', '${User.user_id}', '${app.get("DBDateFormat")()}','true')`;
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((data) => __awaiter(void 0, void 0, void 0, function* () {
            if (!data.status) {
                return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
            }
            NewEezlyItemId = data.data.insertId;
            // If listed is true create algolia other delete from algolia
            if (Name !== '' && Name != null) {
                let algoliaData = {
                    "id": `${NewEezlyItemId}`,
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
                    "id": `${NewEezlyItemId}`,
                    "name": FrenchName,
                    "brand": Brand,
                    "listed": "true",
                    "size": Size,
                    "thumbnail": Thumbnail,
                };
                yield addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
            }
            Response();
        }));
    });
    let Response = () => {
        let Data = {
            status: true,
            message: 'Eezly items merged successfully',
            new_eezly_item_id: NewEezlyItemId,
        };
        return res.status(http_status_codes_1.StatusCodes.OK).json(Data);
    };
    /* Start */
    CheckRolePermission();
});
app.post('/skip', ApiAuth, (req, res) => {
    var _a, _b, _c;
    let User = req.body.user;
    let EezlyAisleId = (_a = req.body.eezly_aisle_id) !== null && _a !== void 0 ? _a : null;
    let EezlyBrand = (_b = req.body.brand) !== null && _b !== void 0 ? _b : null;
    let EezlySize = (_c = req.body.size) !== null && _c !== void 0 ? _c : null;
    /* Stores */
    let ReconciliationItems = [];
    let ReconciliationItem = {};
    let FinalReconciliationItem = [];
    let AllEezlyItems = [];
    let DuplicatedItems = [];
    let FinalDuplicatedItems = [];
    let EezlyItemGroceryItemList = [];
    let ItemId = req.body.eezly_item_id;
    let CheckingItemIdArr = [0];
    let Counter = 0;
    let ItemName = '';
    let array = null;
    let DuplicateItemsStatus = 0;
    let RemoveDuplicatedItems = [];
    let IgaEezlyItemsArr = [];
    let SupercEezlyItemsArr = [];
    let MaxiEezlyItemsArr = [];
    let MetroEezlyItemsArr = [];
    let ProvigoEezlyItemsArr = [];
    let WalmartEezlyItemsArr = [];
    let GeneralEezlyItemsArr = [];
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'get_user_details');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([
            { field: 'Eezly item id', value: ItemId, type: 'Empty' }
        ]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `eezly_items A`, "A.*", `A.id = ${ItemId} AND A.deleted_at IS NULL`, null, null, null).then((Data) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected eezly item id is invalid.');
                }
                UpdateEezlyItem();
            }
            else {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
            }
        });
    });
    let UpdateEezlyItem = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `UPDATE eezly_items SET updated_at = '${app.get("DBDateFormat")()}' WHERE id = '${ItemId}'`;
        yield (0, crud_modules_1.RunAnyQuery)(sql).then((result) => __awaiter(void 0, void 0, void 0, function* () {
            if (!result.status) {
                return res.status(app.get("ErrorStatus")).json({
                    status: false,
                    message: result.message,
                });
            }
            FetchData('get_all_eezly_items');
        }));
    });
    let FetchData = (Type) => __awaiter(void 0, void 0, void 0, function* () {
        if (Type === 'get_all_eezly_items') {
            yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> ''`, null, null, null).then((Data) => {
                if (Data.status) {
                    AllEezlyItems = Data.data;
                    FetchData('get_all_reconciliation_items');
                }
                else {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
                }
            });
        }
        else if (Type === 'get_all_reconciliation_items') {
            let AsileCondition = "";
            let BrandCondition = "";
            let SizeCondition = "";
            if (EezlyAisleId != null) {
                AsileCondition += `AND ` + filterCodeCondition(EezlyAisleId, 'A.eezly_aisle_id');
            }
            if (EezlyAisleId != null && EezlyAisleId == '1') {
                BrandCondition = "";
            }
            else {
                BrandCondition += `AND A.brand IS NOT NULL AND A.brand <> ''`;
                if (EezlyBrand != null) {
                    BrandCondition += `AND ` + filterCodeCondition(EezlyBrand, 'A.brand');
                    //BrandCondition += `AND A.brand = "${EezlyBrand}"`;
                }
            }
            if (EezlySize != null) {
                SizeCondition += `AND ` + filterCodeCondition(EezlySize, 'A.size');
                // SizeCondition += `AND A.size = "${EezlySize}"`;
            }
            yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.size IS NOT NULL AND A.size <> '' AND A.consolidated_date IS NULL ${AsileCondition} ${BrandCondition} ${SizeCondition}`, null, ` ORDER BY A.updated_at ASC`, ` `).then((Data) => {
                if (Data.status) {
                    if (Data.data.length > 0) {
                        ReconciliationItems = Data.data;
                        FetchData("reconciliation_item");
                    }
                    else {
                        Response();
                    }
                }
                else {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, Data.message);
                }
            });
        }
        else if (Type === 'reconciliation_item') {
            for (let counter = 0; counter < ReconciliationItems.length; counter++) {
                FinalReconciliationItem = [];
                ReconciliationItem = ReconciliationItems[counter];
                ItemId = ReconciliationItems[counter].id;
                ItemName = ReconciliationItems[counter].name;
                EezlyItemGroceryItemList = ReconciliationItems[counter].grocery_items !== '' && ReconciliationItems[counter].grocery_items !== null ? JSON.parse(ReconciliationItems[counter].grocery_items) : [];
                FinalReconciliationItem.push(ReconciliationItem);
                DuplicatedItems = [];
                /* Eezly Items Duplicated - Start */
                let spiltArray = ReconciliationItem.size.split(' ');
                let finalSize = "";
                spiltArray.forEach((e, i) => {
                    if (!isNaN(e)) {
                        if (e.includes(".") || e.includes(",")) {
                            e = e.replace(/[0]+$/, "");
                            if (e.substring(e.length - 1) == '.' || e.substring(e.length - 1) == ',') {
                                e = e.slice(0, -1);
                            }
                            spiltArray[i] = e + "%";
                        }
                    }
                });
                finalSize = spiltArray.join(" ");
                for (let i = 0; i < AllEezlyItems.length; i++) {
                    if (EezlyAisleId != null && EezlyAisleId == '1') {
                        if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].eezly_aisle_id === ReconciliationItem.eezly_aisle_id)) {
                            DuplicatedItems.push(AllEezlyItems[i]);
                        }
                    }
                    else {
                        if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].brand === ReconciliationItem.brand) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].size != null) && (AllEezlyItems[i].size.includes(finalSize)) && (AllEezlyItems[i].eezly_aisle_id === ReconciliationItem.eezly_aisle_id)) {
                            DuplicatedItems.push(AllEezlyItems[i]);
                        }
                    }
                }
                /* Eezly Items Duplicated - End */
                /* Verify Eezly Items - Start */
                let refineItemName = duplicateFilter(ItemName);
                let eezlyItemNameArray = (refineItemName !== '' && refineItemName !== null) ? refineItemName.split(" ") : [];
                let IgaMaxMatch = -1;
                let SupercMaxMatch = -1;
                let MaxiMaxMatch = -1;
                let MetroMaxMatch = -1;
                let ProvigoMaxMatch = -1;
                let WalmartMaxMatch = -1;
                let TotalWordMatch = 0;
                let TotalWordMatchStatus = 0;
                let NormalCaseLetter = null;
                let SentenceCaseLetter = null;
                for (let a = 0; a < DuplicatedItems.length; a++) {
                    if (DuplicatedItems[a].grocery_items !== null && DuplicatedItems[a].grocery_items !== "") {
                        let EGroceryItems = JSON.parse(DuplicatedItems[a].grocery_items);
                        DuplicateItemsStatus = 0;
                        TotalWordMatch = 0;
                        TotalWordMatchStatus = 0;
                        for (let i = 0; i < EGroceryItems.length; i++) {
                            // first check if this duplicate item store is already merged then skip it.
                            for (let ei_index = 0; ei_index < EezlyItemGroceryItemList.length; ei_index++) {
                                if (EGroceryItems[i].store_id === EezlyItemGroceryItemList[ei_index].store_id) {
                                    DuplicateItemsStatus = 1;
                                    break;
                                }
                            }
                            if (DuplicateItemsStatus === 1) {
                                RemoveDuplicatedItems.push(DuplicatedItems[a].id);
                                break;
                            }
                            if (TotalWordMatchStatus === 0) {
                                // if (EGroceryItems.length > 1) {
                                //     // IF ITEM CONTAINS MORE THAN 1 GROCERY STORE ITEM, ADD IT TO THE FINAL LIST
                                //     GeneralEezlyItemsArr.push(DuplicatedItems[a].id);
                                //     TotalWordMatchStatus = 1;
                                // } else {
                                if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.iga) {
                                    // IGA
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > IgaMaxMatch) {
                                            IgaEezlyItemsArr = [];
                                            IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                            IgaMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === IgaMaxMatch) {
                                            IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.superc) {
                                    // SUPERC
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > SupercMaxMatch) {
                                            SupercEezlyItemsArr = [];
                                            SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                            SupercMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === SupercMaxMatch) {
                                            SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.maxi) {
                                    // MAXI
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > MaxiMaxMatch) {
                                            MaxiEezlyItemsArr = [];
                                            MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                            MaxiMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === MaxiMaxMatch) {
                                            MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.metro) {
                                    // METRO
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > MetroMaxMatch) {
                                            MetroEezlyItemsArr = [];
                                            MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                            MetroMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === MetroMaxMatch) {
                                            MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.provigo) {
                                    // PROVIGO
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > ProvigoMaxMatch) {
                                            ProvigoEezlyItemsArr = [];
                                            ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                            ProvigoMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === ProvigoMaxMatch) {
                                            ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                else if (EGroceryItems[i].store_id === common_modules_1.StoreIdObject.walmart) {
                                    // WALMART
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > WalmartMaxMatch) {
                                            WalmartEezlyItemsArr = [];
                                            WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                            WalmartMaxMatch = TotalWordMatch;
                                        }
                                        else if (TotalWordMatch > 0 && TotalWordMatch === WalmartMaxMatch) {
                                            WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;
                                }
                                // }
                            }
                        }
                    }
                }
                // Remove Items from duplicate eezly items array which stores are already merged
                for (let rd_index = 0; rd_index < RemoveDuplicatedItems.length; rd_index++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === RemoveDuplicatedItems[rd_index]) {
                            DuplicatedItems.splice(main_arr_index, 1);
                            break;
                        }
                    }
                }
                /* Verify Eezly Items - End */
                /* Create Final Duplicate Items List - Start */
                // IGA
                for (let z = 0; z < IgaEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === IgaEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // SUPERC
                for (let z = 0; z < SupercEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === SupercEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // MAXI
                for (let z = 0; z < MaxiEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === MaxiEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // METRO
                for (let z = 0; z < MetroEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === MetroEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // PROVIGO
                for (let z = 0; z < ProvigoEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === ProvigoEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // WALMART
                for (let z = 0; z < WalmartEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === WalmartEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                // GENERAL
                for (let z = 0; z < GeneralEezlyItemsArr.length; z++) {
                    for (let main_arr_index = 0; main_arr_index < DuplicatedItems.length; main_arr_index++) {
                        if (DuplicatedItems[main_arr_index].id === GeneralEezlyItemsArr[z]) {
                            FinalDuplicatedItems.push(DuplicatedItems[main_arr_index]);
                            break;
                        }
                    }
                }
                if (FinalDuplicatedItems.length > 0) {
                    /* Main Process - Start */
                    // let GroceryItems: any = [];
                    // for (let a = 0; a < ReconciliationItem.length; a++) {
                    //     if (ReconciliationItem[a].grocery_items !== null && ReconciliationItem[a].grocery_items !== "") {
                    //         let EGroceryItems = JSON.parse(ReconciliationItem[a].grocery_items);
                    //         for (let i = 0; i < EGroceryItems.length; i++) {
                    //             let SubArray: any = {
                    //                 store_id: EGroceryItems[i].store_id,
                    //                 store_name: EGroceryItems[i].store_name
                    //             };
                    //             GroceryItems.push(SubArray);
                    //         }
                    //         ReconciliationItem[a].grocery_items = GroceryItems;
                    //         GroceryItems = [];
                    //     }
                    //     ReconciliationItem[a].created_by = ReconciliationItem[a].createdBy;
                    //     ReconciliationItem[a].updated_by = ReconciliationItem[a].updatedBy;
                    //     delete ReconciliationItem[a].createdBy;
                    //     delete ReconciliationItem[a].updatedBy;
                    // }
                    break;
                    /* Main Process - End */
                }
                else {
                    FinalReconciliationItem = [];
                    continue;
                }
                /* Create Final Duplicate Items List - End */
            }
            /* Send Response */
            Response();
        }
        else {
            console.log("Nothing!");
        }
    });
    let Response = () => {
        let Data = {
            status: true,
            data: FinalReconciliationItem
        };
        return res.status(http_status_codes_1.StatusCodes.OK).json(Data);
    };
    /* Start */
    CheckRolePermission();
});
// Add Eezly Item In Algolia
function addInAlgolia(addData, lang, environment) {
    const indexval = environment + "_eezly_" + lang;
    const clientIn = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
    const index = clientIn.initIndex(`${indexval}`);
    var obj = index.saveObjects([addData], {
        autoGenerateObjectIDIfNotExist: true
    }).then((d) => {
    }).catch((err) => {
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
    });
}
function filterCodeCondition(conditionVar, conditionFor) {
    if (conditionVar != "") {
        let newBrandsIds = (conditionVar !== '' && conditionVar != null) ? conditionVar.split(",") : [];
        return (newBrandsIds.length > 0) ? (`${conditionFor} IN (${newBrandsIds.map((d) => { return `'${d}'`; }).join(',')})`) : `${conditionFor} IN (${conditionVar})`;
    }
    else {
        return `${conditionFor} = ''`;
    }
}
function duplicateFilter(duplicateRefineItemName) {
    duplicateRefineItemName = (duplicateRefineItemName !== "" || duplicateRefineItemName !== null) ? duplicateRefineItemName.replace("", " ") : duplicateRefineItemName;
    duplicateRefineItemName = (duplicateRefineItemName !== "" || duplicateRefineItemName !== null) ? duplicateRefineItemName.replace("'", " ") : duplicateRefineItemName;
    duplicateRefineItemName = (duplicateRefineItemName !== "" || duplicateRefineItemName !== null) ? duplicateRefineItemName.replace(",", " ") : duplicateRefineItemName;
    duplicateRefineItemName = duplicateRefineItemName.trim();
    return duplicateRefineItemName;
}
function groceryStoreRefine(eezlyItemNameArray, name, TotalWordMatch) {
    let duplicateRefineItemName = duplicateFilter(name);
    let duplicateItemNameArray = (duplicateRefineItemName !== "" || duplicateRefineItemName !== null) ? duplicateRefineItemName.split(" ") : [];
    for (let dmi_index = 0; dmi_index < duplicateItemNameArray.length; dmi_index++) {
        let SentenceCaseLetter = (0, common_modules_1.capitalizeFirstLetter)(duplicateItemNameArray[dmi_index]);
        if ((eezlyItemNameArray.includes(duplicateItemNameArray[dmi_index])) || (eezlyItemNameArray.includes(SentenceCaseLetter))) {
            TotalWordMatch = TotalWordMatch + 1;
        }
    }
    return TotalWordMatch;
}
module.exports = app;
