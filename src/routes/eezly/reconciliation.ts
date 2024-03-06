import express, { Request, Response, Application } from 'express';
import {
    CheckPermissionModule,
    DBDateFormatModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponseWithData,
    StoreIdObject,
    capitalizeFirstLetter,
    GetGeneralSettings, GenerateSuccessResponse
} from '../../modules/common.modules';
import { RunAnyQuery, SelectQueryModule } from '../../modules/crud.modules';
import { dbCon } from '../../modules/db.modules';
import { StatusCodes } from 'http-status-codes';
import { CheckRequiredValidation } from '../../modules/validator.modules';

require('dotenv').config({ path: './.env' });
const app: Application = express();
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
const ApiAuth = require("./../../../lib/auth");

app.get('/tinder', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let EezlyAisleId: any = req.query.eezly_aisle_id as string ?? null;
    let EezlyBrand: any = req.query.brand as string ?? null;
    let EezlySize: any = req.query.size as string ?? null;
    /* Stores */
    let IgaItems: any = null;
    let SupercItems: any = null;
    let MaxiItems: any = null;
    let MetroItems: any = null;
    let ProvigoItems: any = null;
    let WalmartItems: any = null;
    /* Stores */
    let ReconciliationItems: any = [];
    let ReconciliationItem: any = {};
    let FinalReconciliationItem: any = [];
    let AllEezlyItems: any = [];
    let DuplicatedItems: any = [];
    let FinalDuplicatedItems: any = [];
    let EezlyItemGroceryItemList: any = [];
    let ItemId: any = 0;
    let CheckingItemIdArr: any = [0];
    let ItemName: any = '';
    let DuplicateItemsStatus: any = 0;
    let RemoveDuplicatedItems: any = [];
    let IgaEezlyItemsArr: any = [];
    let SupercEezlyItemsArr: any = [];
    let MaxiEezlyItemsArr: any = [];
    let MetroEezlyItemsArr: any = [];
    let ProvigoEezlyItemsArr: any = [];
    let WalmartEezlyItemsArr: any = [];
    let GeneralEezlyItemsArr: any = [];

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = (): any => {
        FetchData('get_all_eezly_items');
    };

    let FetchData = async (Type: string): Promise<any> => {
        if (Type === 'get_all_eezly_items') {
            await SelectQueryModule(dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> ''`, null, null, null, []).then((Data: any) => {
                if (Data.status) {
                    AllEezlyItems = Data.data;
                    FetchData('get_all_reconciliation_items');
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        } else if (Type === 'get_all_reconciliation_items') {
            let AsileCondition: string = "";
            let BrandCondition: string = "";
            let SizeCondition: string = "";
            if (EezlyAisleId != null) {
                AsileCondition += `AND ` + filterCodeCondition(EezlyAisleId, 'A.eezly_aisle_id');
                //AsileCondition += `AND A.eezly_aisle_id = ${EezlyAisleId}`;
            }
            if (EezlyAisleId != null && EezlyAisleId == '1') {
                BrandCondition = "";
            } else {
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
            await SelectQueryModule(dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.size IS NOT NULL AND A.size <> '' AND A.consolidated_date IS NULL ${AsileCondition} ${BrandCondition} ${SizeCondition}`, null, ` ORDER BY A.updated_at ASC`, ` `, []).then(async (Data: any) => {
                if (Data.status) {
                    if (Data.data.length > 0) {
                        ReconciliationItems = Data.data;
                        FetchData("reconciliation_item");
                    } else {
                        Response();
                    }
                } else {

                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        } else if (Type === 'reconciliation_item') {

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
                spiltArray.forEach((e: any, i: any) => {
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
                    } else {
                        if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].brand === ReconciliationItem.brand) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].size != null) && (AllEezlyItems[i].size.includes(finalSize)) && (AllEezlyItems[i].eezly_aisle_id === ReconciliationItem.eezly_aisle_id)) {
                            DuplicatedItems.push(AllEezlyItems[i]);
                        }
                    }
                }
                /* Eezly Items Duplicated - End */

                /* Verify Eezly Items - Start */
                let refineItemName = duplicateFilter(ItemName);
                let eezlyItemNameArray: any = (refineItemName !== '' && refineItemName !== null) ? refineItemName.split(" ") : [];

                let IgaMaxMatch: any = -1;
                let SupercMaxMatch: any = -1;
                let MaxiMaxMatch: any = -1;
                let MetroMaxMatch: any = -1;
                let ProvigoMaxMatch: any = -1;
                let WalmartMaxMatch: any = -1;
                let TotalWordMatch: number = 0;
                let TotalWordMatchStatus: number = 0;
                let NormalCaseLetter: any = null;
                let SentenceCaseLetter: any = null;

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
                                if (EGroceryItems[i].store_id === StoreIdObject.iga) {
                                    // IGA
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);

                                        if (TotalWordMatch > 0 && TotalWordMatch > IgaMaxMatch) {
                                            IgaEezlyItemsArr = [];
                                            IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                            IgaMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === IgaMaxMatch) {
                                            IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.superc) {
                                    // SUPERC
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > SupercMaxMatch) {
                                            SupercEezlyItemsArr = [];
                                            SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                            SupercMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === SupercMaxMatch) {
                                            SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.maxi) {
                                    // MAXI
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);

                                        if (TotalWordMatch > 0 && TotalWordMatch > MaxiMaxMatch) {
                                            MaxiEezlyItemsArr = [];
                                            MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                            MaxiMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === MaxiMaxMatch) {
                                            MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.metro) {
                                    // METRO
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > MetroMaxMatch) {
                                            MetroEezlyItemsArr = [];
                                            MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                            MetroMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === MetroMaxMatch) {
                                            MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.provigo) {
                                    // PROVIGO
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > ProvigoMaxMatch) {
                                            ProvigoEezlyItemsArr = [];
                                            ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                            ProvigoMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === ProvigoMaxMatch) {
                                            ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.walmart) {
                                    // WALMART
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > WalmartMaxMatch) {
                                            WalmartEezlyItemsArr = [];
                                            WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                            WalmartMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === WalmartMaxMatch) {
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
                } else {
                    FinalReconciliationItem = [];
                    continue;
                }
                /* Create Final Duplicate Items List - End */
            }

            /* Send Response */
            Response();
        } else {
            console.log("Nothing!");
        }
    };

    let Response = (): any => {
        let Data: any = {
            status: true,
            data: FinalReconciliationItem
        };
        return res.status(StatusCodes.OK).json(Data);
    };

    /* Start */
    CheckRolePermission();
});

app.get('/', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let ItemId = req.query.eezly_item_id as string;
    let ItemName: any = '';
    /* Stores */
    let EezlyItemDetails: any = null;
    let AllEezlyItems: any = [];
    let DuplicatedItems: any = [];
    let FinalDuplicatedItems: any = [];
    let EezlyItemGroceryItemList: any = [];
    let DuplicateItemsStatus: any = 0;
    let RemoveDuplicatedItems: any = [];
    let IgaEezlyItemsArr: any = [];
    let SupercEezlyItemsArr: any = [];
    let MaxiEezlyItemsArr: any = [];
    let MetroEezlyItemsArr: any = [];
    let ProvigoEezlyItemsArr: any = [];
    let WalmartEezlyItemsArr: any = [];
    let GeneralEezlyItemsArr: any = [];

    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {

        let data: any = await CheckRequiredValidation([{ field: 'Eezly item id', value: ItemId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        await SelectQueryModule(dbCon, `eezly_items A`, "A.*", `A.id = ?`, null, null, null, [ItemId]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'The selected eezly item id is invalid.');
                }
                ItemName = Data.data[0].name;
                EezlyItemGroceryItemList = Data.data[0].grocery_items !== '' && Data.data[0].grocery_items !== null ? JSON.parse(Data.data[0].grocery_items) : [];
                EezlyItemDetails = Data.data;
                FetchData('get_all_eezly_items');
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let FetchData = async (Type: string): Promise<any> => {
        if (Type === 'get_all_eezly_items') {
            SelectQueryModule(dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.id != ?`, null, null, null, [ItemId]).then((Data: any) => {
                if (Data.status) {
                    AllEezlyItems = Data.data;
                    FetchData("eezly_items_duplicated");
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        } else if (Type === 'eezly_items_duplicated') {
            let spiltArray = EezlyItemDetails[0].size.split(' ');
            let finalSize = "";
            spiltArray.forEach((e: any, i: any) => {
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
                } else {
                    if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].brand === EezlyItemDetails[0].brand) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].size != null) && (AllEezlyItems[i].size.includes(finalSize)) && (AllEezlyItems[i].eezly_aisle_id === EezlyItemDetails[0].eezly_aisle_id)) {
                        DuplicatedItems.push(AllEezlyItems[i]);
                    }
                }
            }

            /* Main Process - Start */
            let GroceryItems: any = [];
            let refineItemName = duplicateFilter(ItemName);
            let eezlyItemNameArray: any = (refineItemName !== '' && refineItemName !== null) ? refineItemName.split(" ") : [];
            let IgaMaxMatch: any = -1;
            let SupercMaxMatch: any = -1;
            let MaxiMaxMatch: any = -1;
            let MetroMaxMatch: any = -1;
            let ProvigoMaxMatch: any = -1;
            let WalmartMaxMatch: any = -1;
            let TotalWordMatch: number = 0;
            let TotalWordMatchStatus: number = 0;
            let NormalCaseLetter: any = null;
            let SentenceCaseLetter: any = null;

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
                            if (EGroceryItems[i].store_id === StoreIdObject.iga) {
                                // IGA
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > IgaMaxMatch) {
                                        IgaEezlyItemsArr = [];
                                        IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                        IgaMaxMatch = TotalWordMatch;
                                    } else if (TotalWordMatch > 0 && TotalWordMatch === IgaMaxMatch) {
                                        IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;

                            } else if (EGroceryItems[i].store_id === StoreIdObject.superc) {
                                // SUPERC
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > SupercMaxMatch) {
                                        SupercEezlyItemsArr = [];
                                        SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                        SupercMaxMatch = TotalWordMatch;
                                    } else if (TotalWordMatch > 0 && TotalWordMatch === SupercMaxMatch) {
                                        SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;

                            } else if (EGroceryItems[i].store_id === StoreIdObject.maxi) {
                                // MAXI
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);

                                    if (TotalWordMatch > 0 && TotalWordMatch > MaxiMaxMatch) {
                                        MaxiEezlyItemsArr = [];
                                        MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                        MaxiMaxMatch = TotalWordMatch;
                                    } else if (TotalWordMatch > 0 && TotalWordMatch === MaxiMaxMatch) {
                                        MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;

                            } else if (EGroceryItems[i].store_id === StoreIdObject.metro) {
                                // METRO
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > MetroMaxMatch) {
                                        MetroEezlyItemsArr = [];
                                        MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                        MetroMaxMatch = TotalWordMatch;
                                    } else if (TotalWordMatch > 0 && TotalWordMatch === MetroMaxMatch) {
                                        MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;

                            } else if (EGroceryItems[i].store_id === StoreIdObject.provigo) {
                                // PROVIGO
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > ProvigoMaxMatch) {
                                        ProvigoEezlyItemsArr = [];
                                        ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                        ProvigoMaxMatch = TotalWordMatch;
                                    } else if (TotalWordMatch > 0 && TotalWordMatch === ProvigoMaxMatch) {
                                        ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;

                            } else if (EGroceryItems[i].store_id === StoreIdObject.walmart) {
                                // WALMART
                                if (DuplicatedItems[a].name) {
                                    TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                    if (TotalWordMatch > 0 && TotalWordMatch > WalmartMaxMatch) {
                                        WalmartEezlyItemsArr = [];
                                        WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                        WalmartMaxMatch = TotalWordMatch;
                                    } else if (TotalWordMatch > 0 && TotalWordMatch === WalmartMaxMatch) {
                                        WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                    }
                                }
                                TotalWordMatchStatus = 1;
                            }
                            // }
                        }

                        let SubArray: any = {
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
        } else {
            console.log("Nothing!");
        }
    };

    let Response = (): any => {
        let Data: any = {
            status: true,
            duplicateItems: FinalDuplicatedItems,
        };
        return res.status(StatusCodes.OK).json(Data);
    };

    /* Start */
    CheckRolePermission();
});

app.post('/merge', ApiAuth, (req: Request, res: Response) => {

    let User = req.body.user;
    let ItemIds = req.body.delete_eezly_item_id;
    let Name = req.body.name;
    let FrenchName = req.body.name_fr;
    let Thumbnail = req.body.thumbnail;
    let EezlyAisleId = req.body.eezly_aisle_id;
    let Brand = req.body.brand;
    let Size = req.body.size;
    /* Stores */
    let ReconciliationItem: any = null;
    let NewEezlyItemId: any = null;
    let GroceryItemList: any = [];
    let SettingsData: any = null;
    let DeleteEezlyItemsData: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Eezly item id', value: ItemIds, type: 'Empty' }, { field: 'Thumbnail', value: Thumbnail, type: 'Empty' }, { field: 'Eezly aisle id', value: EezlyAisleId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for Eezly Aisle Id exists */
        await SelectQueryModule(dbCon, `eezly_aisles A`, "A.*", `A.id = ?`, null, null, null, [EezlyAisleId]).then(async (Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'The selected eezly aisle id is invalid.');

                } else {
                    /* Validate Eezly Items Ids */
                    await SelectQueryModule(dbCon, `eezly_items A`, "A.id, A.grocery_items", `A.deleted_at IS NULL`, null, null, null, []).then(async (Data: any) => {
                        if (Data.status) {
                            let EezlyItemIds: any = [];
                            let EezlyItemIdsGroceryItems: any = [];
                            for (let k = 0; k < Data.data.length; k++) {
                                EezlyItemIds.push(Data.data[k].id.toString());
                                EezlyItemIdsGroceryItems.push(Data.data[k].grocery_items);
                            }
                            ItemIds = ItemIds !== "" ? ItemIds.split(",") : [];
                            for (let j = 0; j < ItemIds.length; j++) {
                                if (!EezlyItemIds.includes(ItemIds[j])) {
                                    return GenerateBadRequestResponse(res, 'One of the eezly item id is invalid');

                                } else {
                                    let EezlyItemIdsGroceryItemsIndex: any = EezlyItemIds.indexOf(ItemIds[j]);
                                    let EezlyItemGroceryItemsList: any = (EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex] !== '' && EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex] !== null) ? JSON.parse(EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex]) : [];
                                    if (EezlyItemGroceryItemsList.length > 0) {
                                        for (let ei_index = 0; ei_index < EezlyItemGroceryItemsList.length; ei_index++) {
                                            GroceryItemList.push(EezlyItemGroceryItemsList[ei_index]);
                                        }
                                    }
                                }
                            }
                            GetSettings();
                        } else {
                            return GenerateBadRequestResponse(res, Data.message);

                        }
                    });
                }
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let GetSettings = (): any => {
        SelectQueryModule(dbCon, "settings", "*", "id = 1", null, null, null, []).then(async (Data: any) => {
            if (Data.status) {
                SettingsData = Data.data;
                GetDeleteItemsRecord();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let GetDeleteItemsRecord = async (): Promise<any> => {
        await SelectQueryModule(dbCon, "eezly_items", "*", `id IN (?)`, null, null, null, [ItemIds.join(",")]).then(async (Data: any) => {
            if (Data.status) {
                DeleteEezlyItemsData = Data.data;
                DeleteAlgoliaItems();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let DeleteAlgoliaItems = async (): Promise<any> => {
        if (DeleteEezlyItemsData !== '' && DeleteEezlyItemsData != null) {
            for (let i = 0; i < DeleteEezlyItemsData.length; i++) {
                if (DeleteEezlyItemsData[i].name !== '' && DeleteEezlyItemsData[i].name != null) {
                    await deleteFromAlgolia(DeleteEezlyItemsData[i].name, SettingsData[0].environment, 'en');
                }
                if (DeleteEezlyItemsData[i].name_fr !== '' && DeleteEezlyItemsData[i].name_fr != null) {
                    await deleteFromAlgolia(DeleteEezlyItemsData[i].name_fr, SettingsData[0].environment, 'fr');
                }
            }
        }
        DeleteEezlyItems();
    };

    let DeleteEezlyItems = async (): Promise<any> => {
        let sql = `DELETE FROM eezly_items WHERE id IN (${ItemIds.join(",")})`;
        await RunAnyQuery(sql, []).then(async (data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
            CreateEezlyItem();
        });
    };

    let CreateEezlyItem = async (): Promise<any> => {
        let sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id, grocery_items, consolidated_date, created_by, created_at,listed) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,'true')`;
        let values = [
            Name !== 'null' ? Name : null,
            FrenchName !== 'null' ? FrenchName : null,
            Thumbnail !== 'null' ? Thumbnail : null,
            Brand !== 'null' ? Brand : null,
            Size !== 'null' ? Size : null,
            EezlyAisleId !== 'null' ? EezlyAisleId : null,
            JSON.stringify(GroceryItemList),
            DBDateFormatModule(),
            User.user_id,
            DBDateFormatModule()
        ];
        await RunAnyQuery(sql, values).then(async (data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
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
                await addInAlgolia(algoliaData, 'en', SettingsData[0].environment);
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
                await addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
            }
            Response();
        });
    };

    let Response = (): any => {
        let Data: any = {
            status: true,
            message: 'Eezly items merged successfully',
            new_eezly_item_id: NewEezlyItemId,
        };
        return res.status(StatusCodes.OK).json(Data);
    };

    /* Start */
    CheckRolePermission();
});

app.post('/skip', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let EezlyAisleId: any = req.body.eezly_aisle_id as string ?? null;
    let EezlyBrand: any = req.body.brand as string ?? null;
    let EezlySize: any = req.body.size as string ?? null;

    /* Stores */
    let ReconciliationItems: any = [];
    let ReconciliationItem: any = {};
    let FinalReconciliationItem: any = [];
    let AllEezlyItems: any = [];
    let DuplicatedItems: any = [];
    let FinalDuplicatedItems: any = [];
    let EezlyItemGroceryItemList: any = [];
    let ItemId = req.body.eezly_item_id;
    let CheckingItemIdArr: any = [0];
    let Counter: number = 0;
    let ItemName: any = '';
    let array: any = null;
    let DuplicateItemsStatus: any = 0;
    let RemoveDuplicatedItems: any = [];
    let IgaEezlyItemsArr: any = [];
    let SupercEezlyItemsArr: any = [];
    let MaxiEezlyItemsArr: any = [];
    let MetroEezlyItemsArr: any = [];
    let ProvigoEezlyItemsArr: any = [];
    let WalmartEezlyItemsArr: any = [];
    let GeneralEezlyItemsArr: any = [];

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'Eezly item id', value: ItemId, type: 'Empty' }
        ]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }


        /* Check of Eezly Item Id Exists */

        await SelectQueryModule(dbCon, `eezly_items A`, "A.*", `A.id = ? AND A.deleted_at IS NULL`, null, null, null, [ItemId]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'The selected eezly item id is invalid.');

                }
                UpdateEezlyItem();
            } else {
                return GenerateBadRequestResponse(res, Data.message);

            }
        });

    };

    let UpdateEezlyItem = async (): Promise<any> => {
        let sql = `UPDATE eezly_items SET updated_at = '${DBDateFormatModule()}' WHERE id = ?`;
        await RunAnyQuery(sql, [ItemId]).then(async (result: any) => {
            if (!result.status) {
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: false,
                    message: result.message,
                });
            }
            FetchData('get_all_eezly_items');
        });
    };

    let FetchData = async (Type: string): Promise<any> => {
        if (Type === 'get_all_eezly_items') {
            await SelectQueryModule(dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> ''`, null, null, null, []).then((Data: any) => {
                if (Data.status) {
                    AllEezlyItems = Data.data;
                    FetchData('get_all_reconciliation_items');
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        } else if (Type === 'get_all_reconciliation_items') {
            let AsileCondition: string = "";
            let BrandCondition: string = "";
            let SizeCondition: string = "";
            if (EezlyAisleId != null) {
                AsileCondition += `AND ` + filterCodeCondition(EezlyAisleId, 'A.eezly_aisle_id');
            }
            if (EezlyAisleId != null && EezlyAisleId == '1') {
                BrandCondition = "";
            } else {
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
            await SelectQueryModule(dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.size IS NOT NULL AND A.size <> '' AND A.consolidated_date IS NULL ${AsileCondition} ${BrandCondition} ${SizeCondition}`, null, ` ORDER BY A.updated_at ASC`, ` `, []).then((Data: any) => {
                if (Data.status) {
                    if (Data.data.length > 0) {
                        ReconciliationItems = Data.data;
                        FetchData("reconciliation_item");
                    } else {
                        Response();
                    }
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        } else if (Type === 'reconciliation_item') {

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
                spiltArray.forEach((e: any, i: any) => {
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
                    } else {
                        if ((AllEezlyItems[i].id !== ItemId) && (AllEezlyItems[i].brand === ReconciliationItem.brand) && (AllEezlyItems[i].size !== '') && (AllEezlyItems[i].size != null) && (AllEezlyItems[i].size.includes(finalSize)) && (AllEezlyItems[i].eezly_aisle_id === ReconciliationItem.eezly_aisle_id)) {
                            DuplicatedItems.push(AllEezlyItems[i]);
                        }
                    }
                }
                /* Eezly Items Duplicated - End */

                /* Verify Eezly Items - Start */
                let refineItemName = duplicateFilter(ItemName);
                let eezlyItemNameArray: any = (refineItemName !== '' && refineItemName !== null) ? refineItemName.split(" ") : [];

                let IgaMaxMatch: any = -1;
                let SupercMaxMatch: any = -1;
                let MaxiMaxMatch: any = -1;
                let MetroMaxMatch: any = -1;
                let ProvigoMaxMatch: any = -1;
                let WalmartMaxMatch: any = -1;
                let TotalWordMatch: number = 0;
                let TotalWordMatchStatus: number = 0;
                let NormalCaseLetter: any = null;
                let SentenceCaseLetter: any = null;

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
                                if (EGroceryItems[i].store_id === StoreIdObject.iga) {
                                    // IGA
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > IgaMaxMatch) {
                                            IgaEezlyItemsArr = [];
                                            IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                            IgaMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === IgaMaxMatch) {
                                            IgaEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.superc) {
                                    // SUPERC
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > SupercMaxMatch) {
                                            SupercEezlyItemsArr = [];
                                            SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                            SupercMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === SupercMaxMatch) {
                                            SupercEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.maxi) {
                                    // MAXI
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);

                                        if (TotalWordMatch > 0 && TotalWordMatch > MaxiMaxMatch) {
                                            MaxiEezlyItemsArr = [];
                                            MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                            MaxiMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === MaxiMaxMatch) {
                                            MaxiEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.metro) {
                                    // METRO
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > MetroMaxMatch) {
                                            MetroEezlyItemsArr = [];
                                            MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                            MetroMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === MetroMaxMatch) {
                                            MetroEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.provigo) {
                                    // PROVIGO
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > ProvigoMaxMatch) {
                                            ProvigoEezlyItemsArr = [];
                                            ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                            ProvigoMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === ProvigoMaxMatch) {
                                            ProvigoEezlyItemsArr.push(DuplicatedItems[a].id);
                                        }
                                    }
                                    TotalWordMatchStatus = 1;

                                } else if (EGroceryItems[i].store_id === StoreIdObject.walmart) {
                                    // WALMART
                                    if (DuplicatedItems[a].name) {
                                        TotalWordMatch = groceryStoreRefine(eezlyItemNameArray, DuplicatedItems[a].name, TotalWordMatch);
                                        if (TotalWordMatch > 0 && TotalWordMatch > WalmartMaxMatch) {
                                            WalmartEezlyItemsArr = [];
                                            WalmartEezlyItemsArr.push(DuplicatedItems[a].id);
                                            WalmartMaxMatch = TotalWordMatch;
                                        } else if (TotalWordMatch > 0 && TotalWordMatch === WalmartMaxMatch) {
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
                } else {
                    FinalReconciliationItem = [];
                    continue;
                }
                /* Create Final Duplicate Items List - End */
            }

            /* Send Response */
            Response();
        } else {
            console.log("Nothing!");
        }
    };

    let Response = (): any => {
        let Data: any = {
            status: true,
            data: FinalReconciliationItem
        };
        return res.status(StatusCodes.OK).json(Data);
    };

    /* Start */
    CheckRolePermission();
});

// Merge v3 API - Start
app.post('/findNextItem', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let ReconciliationItems: any = [];
    let FinalReconciliationItem: any = [];
    let AllEezlyItems: any = [];
    let ItemId = req.body.eezly_item_id;
    let EezlyItemGroceryItemList: any = [];
    let EezlyItemSkuList: any = [];
    let DuplicateItemGroceryItemList: any = [];

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'Eezly item id', value: ItemId, type: 'Empty' }
        ]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        if (ItemId !== '0') {
            let data: any = await SelectQueryModule(dbCon, `eezly_items A`, "A.*", `A.id = ? AND A.deleted_at IS NULL`, null, null, null, [ItemId]);
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            } else {
                if (data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'The selected eezly item id is invalid.');
                }
            }
        }
        UpdateEezlyItem();
    };

    let UpdateEezlyItem = async (): Promise<any> => {
        if (ItemId !== 0) {
            let data: any = await RunAnyQuery(`UPDATE eezly_items SET updated_at = '${DBDateFormatModule()}' WHERE id = ?`, [ItemId]);
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
        }
        GetAllEezlyItem();
    };

    let GetAllEezlyItem = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.name_fr, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.eezly_aisle_id IS NOT NULL`, null, ` ORDER BY A.updated_at ASC`, null, []);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        AllEezlyItems = data.data;
        ReconciliationItems = data.data;
        MainProcess();
    };

    /* Old Logic */
    // let MainProcess = (): any => {
    //     let g = 0;
    //     let i = 0;
    //     let d = 0;
    //     let status = 0;
    //     for (let counter = 0; counter < ReconciliationItems.length; counter++) {
    //         EezlyItemSkuList = [];
    //         EezlyItemGroceryItemList = (ReconciliationItems[counter].grocery_items !== '' && ReconciliationItems[counter].grocery_items != null) ? JSON.parse(ReconciliationItems[counter].grocery_items) : [];
    //         for (g = 0; g < EezlyItemGroceryItemList.length; g++) {
    //             EezlyItemSkuList.push(EezlyItemGroceryItemList[g].store_item);
    //         }
    //         for (i = 0; i < AllEezlyItems.length; i++) {
    //             if (ReconciliationItems[counter].id == AllEezlyItems[i].id) { continue; }
    //             DuplicateItemGroceryItemList = (AllEezlyItems[i].grocery_items !== '' && AllEezlyItems[i].grocery_items != null) ? JSON.parse(AllEezlyItems[i].grocery_items) : [];
    //             for (d = 0; d < DuplicateItemGroceryItemList.length; d++) {
    //                 if (EezlyItemSkuList.includes(DuplicateItemGroceryItemList[d].store_item)) {
    //                     status = 1;
    //                     FinalReconciliationItem.push(ReconciliationItems[counter]);
    //                     break;
    //                 }
    //             }
    //             if (status === 1) { break; }
    //         }
    //         if (status === 1) { break; }
    //     }
    //     /* Send Response */
    //     Response();
    // };

    let MainProcess = (): any => {
        let EezlyItemGroceryItemList: any = [];
        let result: any = [];
        let resultIds: any = [];
        let duplicateItemList: any = [];
        AllEezlyItems.map((item: any, i: any) => {
            duplicateItemList.push({
                id: item.id,
                groceryItemslist: item.grocery_items ? JSON.parse(item.grocery_items).map((s_item: any) => s_item.store_item) : []
            });
        });
        for (let counter = 0; counter < ReconciliationItems.length; counter++) {
            EezlyItemGroceryItemList = ReconciliationItems[counter].grocery_items
                ? JSON.parse(ReconciliationItems[counter].grocery_items).map((item: any) => item.store_item)
                : [];
            result = duplicateItemList.filter((item: any) =>
                item.id !== ReconciliationItems[counter].id ? item.groceryItemslist?.map((groceryId: any) => EezlyItemGroceryItemList.includes(groceryId)).includes(true) : false
            );
            // Extract ids from the result array
            resultIds = result.map((item: any) => item.id);
            if (resultIds.length > 0) {
                FinalReconciliationItem.push(ReconciliationItems[counter]);
                break;
            }
        };

        /* Send Response */
        Response();
    };

    let Response = (): any => {
        return GenerateSuccessResponseWithData(res, FinalReconciliationItem);
    };

    /* Start */
    CheckRolePermission();
});

app.post('/getDuplicateItems', ApiAuth, (req: Request, res: Response): any => {

    let User = req.body.user;
    let ItemId = req.body.eezly_item_id;
    let DuplicateItems: any = [];
    let FinalItemsList: any = [];
    let SkuList: any = [];
    let whereCondition: string = '';

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'Eezly item id', value: ItemId, type: 'Empty' }
        ]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        let itemData: any = await SelectQueryModule(dbCon, `eezly_items A`, "A.*", `A.id = ? AND A.deleted_at IS NULL`, null, null, null, [ItemId]);
        if (!itemData.status) {
            return GenerateErrorResponse(res, itemData.message);
        } else {
            if (itemData.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected eezly item id is invalid.');
            }
            let groceryItems: any = (itemData.data[0].grocery_items !== '' && itemData.data[0].grocery_items != null) ? JSON.parse(itemData.data[0].grocery_items) : [];
            for (let g = 0; g < groceryItems.length; g++) {
                whereCondition += g > 0 ? ` OR A.grocery_items LIKE "%${groceryItems[g].store_item}%"` : ` A.grocery_items LIKE "%${groceryItems[g].store_item}%"`;
                SkuList.push(groceryItems[g].store_item);
            }
        }
        GetAllDuplicateItems();
    };

    let GetAllDuplicateItems = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.name_fr, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.eezly_aisle_id IS NOT NULL AND A.id != ? AND (${whereCondition})`, null, null, null, [ItemId]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        DuplicateItems = data.data;
        MainProcess();
    };

    let MainProcess = (): any => {
        let duplicate_groceryitem_list: any = [];
        let d = 0;
        for (let i = 0; i < DuplicateItems.length; i++) {
            duplicate_groceryitem_list = (DuplicateItems[i].grocery_items !== '' && DuplicateItems[i].grocery_items != null) ? JSON.parse(DuplicateItems[i].grocery_items) : [];
            for (d = 0; d < duplicate_groceryitem_list.length; d++) {
                if (SkuList.includes(duplicate_groceryitem_list[d].store_item)) {
                    FinalItemsList.push(DuplicateItems[i]);
                    break;
                }
            }
        }
        Response();
    };

    let Response = (): any => {
        return GenerateSuccessResponseWithData(res, FinalItemsList);
    };

    /* Start */
    CheckRolePermission();
});

app.post('/mergeDuplicateItems', ApiAuth, (req: Request, res: Response) => {

    let User = req.body.user;
    let ItemIds = req.body.delete_eezly_item_id;
    let Name: any = null;
    let FrenchName: any = null;
    let Thumbnail: any = null;
    let EezlyAisleId: any = null;
    let Brand: any = null;
    let Size: any = null;
    /* Stores */
    let ReconciliationItem: any = null;
    let NewEezlyItemId: any = null;
    let GroceryItemList: any = [];
    let SettingsData: any = null;
    let DeleteEezlyItemsData: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Eezly item id', value: ItemIds, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Validate Eezly Items Ids */
        await SelectQueryModule(dbCon, `eezly_items A`, "A.id, A.grocery_items", `A.deleted_at IS NULL`, null, null, null, []).then(async (Data: any) => {
            if (Data.status) {
                let EezlyItemIds: any = [];
                let EezlyItemIdsGroceryItems: any = [];
                for (let k = 0; k < Data.data.length; k++) {
                    EezlyItemIds.push(Data.data[k].id.toString());
                    EezlyItemIdsGroceryItems.push(Data.data[k].grocery_items);
                }
                ItemIds = ItemIds !== "" ? ItemIds.split(",") : [];
                for (let j = 0; j < ItemIds.length; j++) {
                    if (!EezlyItemIds.includes(ItemIds[j])) {
                        return GenerateBadRequestResponse(res, 'One of the eezly item id is invalid');
                    } else {
                        let EezlyItemIdsGroceryItemsIndex: any = EezlyItemIds.indexOf(ItemIds[j]);
                        let EezlyItemGroceryItemsList: any = (EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex] !== '' && EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex] !== null) ? JSON.parse(EezlyItemIdsGroceryItems[EezlyItemIdsGroceryItemsIndex]) : [];
                        if (EezlyItemGroceryItemsList.length > 0) {
                            for (let ei_index = 0; ei_index < EezlyItemGroceryItemsList.length; ei_index++) {
                                GroceryItemList.push(EezlyItemGroceryItemsList[ei_index]);
                            }
                        }
                    }
                }
                GetSettings();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let GetSettings = async (): Promise<any> => {
        let data: any = await GetGeneralSettings();
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        SettingsData = data.data;
        GetDeleteItemsRecord();
    };

    let GetDeleteItemsRecord = async (): Promise<any> => {
        await SelectQueryModule(dbCon, "eezly_items", "*", `id IN ("${ItemIds.join(",")}")`, null, null, null, []).then(async (Data: any) => {
            if (Data.status) {
                DeleteEezlyItemsData = Data.data;
                Name = DeleteEezlyItemsData[0].name;
                FrenchName = DeleteEezlyItemsData[0].name_fr;
                Thumbnail = DeleteEezlyItemsData[0].thumbnail;
                EezlyAisleId = DeleteEezlyItemsData[0].eezly_aisle_id;
                Brand = DeleteEezlyItemsData[0].brand;
                Size = DeleteEezlyItemsData[0].size;
                DeleteAlgoliaItems();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let DeleteAlgoliaItems = async (): Promise<any> => {
        if (DeleteEezlyItemsData !== '' && DeleteEezlyItemsData != null) {
            for (let i = 0; i < DeleteEezlyItemsData.length; i++) {
                if (DeleteEezlyItemsData[i].name !== '' && DeleteEezlyItemsData[i].name != null) {
                    await deleteFromAlgolia(DeleteEezlyItemsData[i].name, SettingsData[0].environment, 'en');
                }
                if (DeleteEezlyItemsData[i].name_fr !== '' && DeleteEezlyItemsData[i].name_fr != null) {
                    await deleteFromAlgolia(DeleteEezlyItemsData[i].name_fr, SettingsData[0].environment, 'fr');
                }
            }
        }
        DeleteEezlyItems();
    };

    let DeleteEezlyItems = async (): Promise<any> => {
        let sql = `DELETE FROM eezly_items WHERE id IN (${ItemIds.join(",")})`;
        await RunAnyQuery(sql, []).then(async (data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
            CreateEezlyItem();
        });
    };

    let CreateEezlyItem = async (): Promise<any> => {
        let sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id, grocery_items, consolidated_date, created_by, created_at,listed) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,'true')`;
        let values = [
            (Name !== '' && Name != null) ? Name : FrenchName,
            (FrenchName !== '' && FrenchName != null) ? FrenchName : Name,
            (Thumbnail !== '' && Thumbnail != null) ? Thumbnail : null,
            (Brand !== '' && Brand != null) ? Brand : null,
            (Size !== '' && Size != null) ? Size : null,
            (EezlyAisleId !== '' && EezlyAisleId != null) ? EezlyAisleId : null,
            JSON.stringify(GroceryItemList),
            DBDateFormatModule(),
            User.user_id,
            DBDateFormatModule()
        ];
        await RunAnyQuery(sql, values).then(async (data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
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
                await addInAlgolia(algoliaData, 'en', SettingsData[0].environment);
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
                await addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
            }
            Response();
        });
    };

    let Response = (): any => {
        let Data: any = {
            status: true,
            message: 'Eezly items merged successfully',
            new_eezly_item_id: NewEezlyItemId,
        };
        return res.status(StatusCodes.OK).json(Data);
    };

    /* Start */
    CheckRolePermission();
});

app.post('/importPossibleMatches', ApiAuth, (req: Request, res: Response): any => {

    let User = req.body.user;
    let ReconciliationItems: any = [];
    let AllEezlyItems: any = [];
    let EezlyItemGroceryItemList: any = [];
    let EezlyItemGroceryStoreIdList: any = [];
    let duplicateItemList: any = [];
    let resultIds: any = [];
    let data: any = null;
    let PossibleMergeIds: any = [];

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            GetAllEezlyItem();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let GetAllEezlyItem = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id", `A.id, A.name, A.name_fr, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.name IS NOT NULL AND A.name <> '' AND A.eezly_aisle_id IS NOT NULL`, null, ` ORDER BY A.updated_at ASC`, null, []);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        AllEezlyItems = data.data;
        ReconciliationItems = data.data;
        MainProcess();
    };

    let MainProcess = async (): Promise<any> => {
        let PossibleMergeIds = new Set();
        resultIds = [];
        AllEezlyItems.map((item: any, i: any) => {
            duplicateItemList.push({
                id: item.id,
                name: item.name,
                name_fr: item.name_fr,
                brand: item.brand,
                size: item.size,
                groceryItemslist: item.grocery_items ? JSON.parse(item.grocery_items).map((s_item: any) => s_item.store_item) : []
            });
        });
        for (let counter = 0; counter < ReconciliationItems.length; counter++) {
            if (PossibleMergeIds.has(ReconciliationItems[counter].id)) { continue; }
            resultIds = [];
            EezlyItemGroceryItemList = ReconciliationItems[counter].grocery_items
                ? JSON.parse(ReconciliationItems[counter].grocery_items).map((item: any) => item.store_item)
                : [];

            duplicateItemList.some((item: any) => {
                if (!PossibleMergeIds.has(item.id) && item.id !== ReconciliationItems[counter].id && (item.name === ReconciliationItems[counter].name || item.name_fr === ReconciliationItems[counter].name_fr) && item.brand === ReconciliationItems[counter].brand && item.size === ReconciliationItems[counter].size) {
                    if (item.groceryItemslist.some((groceryId: any) => EezlyItemGroceryItemList.includes(groceryId))) {
                        PossibleMergeIds.add(item.id);
                        resultIds.push(item.id);
                        return true; // break the loop
                    }
                }
                return false;
            });

            if (resultIds.length > 0) {
                PossibleMergeIds.add(ReconciliationItems[counter].id);
                resultIds.push(ReconciliationItems[counter].id);
                let data: any = await InsertRecord(resultIds);
                if (!data.status) {
                    return GenerateErrorResponse(res, data.message);
                }
            }
        }
        /* Send Response */
        Response();
    };

    let InsertRecord = async (resultIds: any): Promise<any> => {
        return await RunAnyQuery(`INSERT INTO eezly_items_match (eezly_item_ids) VALUE ("${resultIds.join(',')}")`, []);
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Possible merge import successfully');
    };

    /* Start */
    CheckRolePermission();
});

app.post('/mergePossibleMatches', ApiAuth, (req: Request, res: Response): any => {

    let User = req.body.user;
    let AllPossibleMatched: any = [];
    let AllEezlyItems: any = [];
    let AllEezlyItemsId: any = [];
    let SettingsData: any = null;
    let Start:any = Number(req.body.start);
    let Limit:number = 100;
    let End:number = Start + Limit;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            GetSettings();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let GetSettings = (): any => {
        SelectQueryModule(dbCon, "settings", "*", "id = 1", null, null, null, []).then(async (Data: any) => {
            if (Data.status) {
                SettingsData = Data.data;
                GetAllPossibleMatches();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let GetAllPossibleMatches = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "eezly_items_match", `*`, null, null, null, ` LIMIT ${Limit} OFFSET 0`, []);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        AllPossibleMatched = data.data;
        AllEezlyItemsId = AllPossibleMatched.flatMap((item:any) => item.eezly_item_ids.split(','));
        GetAllEezlyItem();
    };

    let GetAllEezlyItem = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "eezly_items", '*',`id IN (${AllEezlyItemsId.join(",")})`, null, null, null,[]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        AllEezlyItems = data.data;
        DeleteAlgoliaItems();
    };

    let DeleteAlgoliaItems = async (): Promise<any> => {
        const clientIn = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
        const indexval_en = SettingsData[0].environment + "_eezly_" + "en";
        const indexval_fr = SettingsData[0].environment + "_eezly_" + "fr";
        const index_en = clientIn.initIndex(`${indexval_en}`);
        const index_fr = clientIn.initIndex(`${indexval_fr}`);
        // Create arrays to hold object IDs for deletion
        const objectIDsToDeleteEn: string[] = [];
        const objectIDsToDeleteFr: string[] = [];
        for (let i = 0; i < AllEezlyItems.length; i++) {
            if (AllEezlyItems[i].name !== '' && AllEezlyItems[i].name != null) {
                const response = await index_en.search(AllEezlyItems[i].name);
                if (response.hits.length > 0) {
                    const objectIDToDelete: string = response.hits[0].objectID!;
                    objectIDsToDeleteEn.push(objectIDToDelete);
                }
            }
            if (AllEezlyItems[i].name_fr !== '' && AllEezlyItems[i].name_fr != null) {
                const response = await index_fr.search(AllEezlyItems[i].name_fr);
                if (response.hits.length > 0) {
                    const objectIDToDelete: string = response.hits[0].objectID!;
                    objectIDsToDeleteFr.push(objectIDToDelete);
                }
            }
        }
        // Delete records for each language
        await deleteObjects(index_en, objectIDsToDeleteEn, 'en');
        await deleteObjects(index_fr, objectIDsToDeleteFr, 'fr');
        MainProcess();
    };

    // Helper function to delete objects for a specific index and language
    const deleteObjects = async (index: any, objectIDs: string[], language: string): Promise<void> => {
        if (objectIDs.length > 0) {
            try {
                await index.deleteObjects(objectIDs);
                // console.log(`Records with object IDs ${objectIDs.join(', ')} successfully deleted for ${language}`);
            } catch (error) {
                // console.error(`Error deleting objects from Algolia (${language}):`, error);
                throw error;
            }
        }
    };

    let MainProcess = async (): Promise<any> => {
        for (const matchedItem of AllPossibleMatched) {
            const items = matchedItem.eezly_item_ids.split(',');
            const groceryItemList = [];
            let itemDetails:any = null;
            let name_fr: any = null;
            for (const itemId of items) {
                itemDetails = AllEezlyItems.find((item:any) => item.id == itemId);
                if(itemDetails !== '' && itemDetails != null) {
                    const eezlyItemGroceryItemsList = JSON.parse(itemDetails.grocery_items);
                    name_fr = (name_fr !== '' && name_fr != null) ? name_fr : (itemDetails.name_fr !== '' && itemDetails.name_fr != null) ? itemDetails.name_fr : null;
                    groceryItemList.push(...eezlyItemGroceryItemsList);
                } 
            }
            if(itemDetails !== '' && itemDetails != null) {
                const name:any = itemDetails.name ? itemDetails.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®"'.*+?^${}()|[\]\\]/g, "") : null; // TODO @adeel replace it with string functions
                name_fr = name_fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®".*+?^${}()|[\]\\]/g, ""); // TODO @adeel replace it with string functions
                const thumbnail:any = itemDetails.thumbnail || null;
                const brand:any = itemDetails.brand || null;
                const size:any = itemDetails.size || null;
                const eezly_aisle_id:any = itemDetails.eezly_aisle_id || null;
                // Create New Eezly Item
                const sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id, grocery_items, consolidated_date, created_by, created_at, listed) VALUES (${name === 'null' ? null : `'${name}'`},${name_fr === 'null' ? null : `"${name_fr}"`},${thumbnail === 'null' ? null : `'${thumbnail}'`},${brand === 'null' ? null : `"${brand}"`},${size === 'null' ? null : `"${size}"`},${eezly_aisle_id === 'null' ? null : `${eezly_aisle_id}`},'${JSON.stringify(groceryItemList)}','${DBDateFormatModule()}',${User.user_id},'${DBDateFormatModule()}','true')`;
                // console.log(sql);
                // const values = [
                //     itemDetails.name || null,
                //     name_fr,
                //     itemDetails.thumbnail || null,
                //     itemDetails.brand || null,
                //     itemDetails.size || null,
                //     itemDetails.eezly_aisle_id || null,
                //     JSON.stringify(groceryItemList),
                //     DBDateFormatModule(),
                //     User.user_id,
                //     DBDateFormatModule()
                // ];
                const data:any = await RunAnyQuery(sql, []);
                if (!data.status) {
                    return GenerateErrorResponse(res, data.message);
                }
                const newEezlyItemId = data.data.insertId;
                // If listed is true, create algolia or delete from algolia
                ['en', 'fr'].forEach(async (lang) => {
                    if ((lang === 'en' && itemDetails[`name`] !== '' && itemDetails[`name`] != null) || (lang === 'fr' && name_fr !== '' && name_fr != null)) {
                        const algoliaData = {
                            id: `${newEezlyItemId}`,
                            name: lang === 'en' ? itemDetails['name'] : name_fr,
                            brand: itemDetails.brand,
                            listed: 'true',
                            size: itemDetails.size,
                            thumbnail: itemDetails.thumbnail,
                        };
                        await addInAlgolia(algoliaData, lang, SettingsData[0].environment);
                    }
                });
            }
        }
        /* Delete */
        DeleteEezlyItems();
    };

    let DeleteEezlyItems = async (): Promise<any> => {
        let sql = `DELETE FROM eezly_items WHERE id IN (${AllEezlyItemsId.join(",")})`;
        await RunAnyQuery(sql, []).then(async (data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
            DeleteEezlyItemMatchRecord();
        });
    };

    let DeleteEezlyItemMatchRecord = async (): Promise<any> => {
        let sql = `DELETE FROM eezly_items_match WHERE id > ${Start} AND id <= ${End}`;
        await RunAnyQuery(sql, []).then(async (data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
            Response();
        });
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Eezly items merged successfully');
    };

    /* Start */
    CheckRolePermission();
});
// Merge v3 API - End

// Merge v4 API - Start
app.post('/v4/mergeDuplicateItems', ApiAuth, (req: Request, res: Response) => {

    let User = req.body.user;
    let StoreItemIds = req.body.store_items;
    let Name: any = null;
    let FrenchName: any = null;
    let Thumbnail: any = null;
    let EezlyAisleId: any = null;
    let Brand: any = null;
    let Size: any = null;
    let SettingsData: any = null;
    let StoreItemsData: any = null;
    let GroceryItemsData: any = null;

    let Step1 = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (!data.status) {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
        // Validation
        let validationData: any = await CheckRequiredValidation([{ field: 'Store items', value: StoreItemIds, type: 'Empty' }]);
        if (!validationData.status) {
            return GenerateBadRequestResponse(res, validationData.message);
        }
        // Settings Data
        let settData: any = await GetGeneralSettings();
        if (!settData.status) {
            return GenerateErrorResponse(res, settData.message);
        }
        SettingsData = settData.data;
        // Get Store Items
        StoreItemIds = StoreItemIds.split(',');
        let storeData:any = await SelectQueryModule(dbCon, `stores_items A LEFT JOIN store_aisles B ON A.aisle = B.name AND A.storeId = B.store_id`, "A.*, B.eezly_aisle_id", `A.id IN (?)`, null, null, null, [StoreItemIds]);
        if (!storeData.status) {
            return GenerateErrorResponse(res, storeData.message);
        }
        StoreItemsData = storeData.data;
        if (StoreItemIds.length > StoreItemsData.length) {
            return GenerateBadRequestResponse(res, 'One of the store items id is invalid');
        }
        // Get Eezly Items Grocery Items List
        let groceryData:any = await SelectQueryModule(dbCon, `eezly_items_grocery_items_list`, "*", `store_item_id IN (?)`, null, null, null, [StoreItemIds]);
        if (!groceryData.status) {
            return GenerateErrorResponse(res, groceryData.message);
        }
        GroceryItemsData = groceryData.data;
        MainProcess();
    };

    let MainProcess = async (): Promise<any> => {
        if (GroceryItemsData.length > 0) {
            // Case 1 - Just create link
            let eezlyItemId:number = GroceryItemsData[0].eezly_item_id;
            const storeItemIds = GroceryItemsData.map((item:any) => item.store_item_id);
            let groceryItemValues: any = [];
            for (let i=0; i < StoreItemsData.length; i++) {
                if (storeItemIds.indexOf(StoreItemsData[i].id) === -1) {
                    groceryItemValues.push([eezlyItemId, StoreItemsData[i].id]);
                }
            }
            if (groceryItemValues.length > 0) {
                let data:any = await CreateEezlyItemGroceryItem(groceryItemValues);
                if (!data.status) {
                    return GenerateErrorResponse(res, data.message);
                }
            }
            Response();
        } else {
            // Case 2 - Create eezly item and its link
            Name = StoreItemsData[0].name;
            FrenchName = StoreItemsData[0].french_name;
            Thumbnail = StoreItemsData[0].url;
            EezlyAisleId = StoreItemsData[0].eezly_aisle_id;
            Brand = StoreItemsData[0].brand;
            Size = StoreItemsData[0].size;
            let sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id, listed, consolidated_date, created_by, created_at) VALUES ( ?, ?, ?, ?, ?, ?, 'true', ?, ?, ?)`;
            let values = [
                (Name !== '' && Name != null) ? Name : FrenchName,
                (FrenchName !== '' && FrenchName != null) ? FrenchName : Name,
                (Thumbnail !== '' && Thumbnail != null) ? Thumbnail : null,
                (Brand !== '' && Brand != null) ? Brand : null,
                (Size !== '' && Size != null) ? Size : null,
                (EezlyAisleId !== '' && EezlyAisleId != null) ? EezlyAisleId : null,
                DBDateFormatModule(),
                User.user_id,
                DBDateFormatModule()
            ];
            await RunAnyQuery(sql, values).then(async (data: any) => {
                if (!data.status) {
                    return GenerateErrorResponse(res, data.message);
                }
                const newEezlyItemId = data.data.insertId;

                // Create Grocery Item List
                let groceryItemValues: any = [];
                for (let i=0; i < StoreItemsData.length; i++) {
                    groceryItemValues.push([newEezlyItemId, StoreItemsData[i].id]);
                }
                let groceryItemData:any = await CreateEezlyItemGroceryItem(groceryItemValues);
                if (!groceryItemData.status) {
                    return GenerateErrorResponse(res, groceryItemData.message);
                }

                // Add In Algolia
                if (Name !== '' && Name != null) {
                    let algoliaData = {
                        "id": `${newEezlyItemId}`,
                        "name": Name,
                        "brand": Brand,
                        "listed": "true",
                        "size": Size,
                        "thumbnail": Thumbnail,
                    };
                    await addInAlgolia(algoliaData, 'en', SettingsData[0].environment);
                }
                if (FrenchName !== '' && FrenchName != null) {
                    let algoliaData = {
                        "id": `${newEezlyItemId}`,
                        "name": FrenchName,
                        "brand": Brand,
                        "listed": "true",
                        "size": Size,
                        "thumbnail": Thumbnail,
                    };
                    await addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
                }
                Response();
            });
        }
    };

    let CreateEezlyItemGroceryItem = async (insertCondition:any): Promise<any> => {
        return await RunAnyQuery(`INSERT INTO eezly_items_grocery_items_list (eezly_item_id, store_item_id) VALUES ?`, [insertCondition]);
    };

    let Response = (): any => {
        let Data: any = {
            status: true,
            message: 'Store items merged successfully',
        };
        return res.status(StatusCodes.OK).json(Data);
    };

    /* Start */
    Step1();
});
// Merge v4 API - End

// Add Eezly Item In Algolia
function addInAlgolia(addData: any, lang: String, environment: String) {
    const indexval = environment + "_eezly_" + lang;
    const clientIn = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
    const index = clientIn.initIndex(`${indexval}`);
    var obj = index.saveObjects([addData], {
        autoGenerateObjectIDIfNotExist: true
    }).then((d: any) => {
    }).catch((err: any) => {
    });
}

// Delete Eezly Item From Algolia
function deleteFromAlgolia(name: any, environment: string, lang: string) {

    const indexval = environment + "_eezly_" + lang;
    const clientIn = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
    const index = clientIn.initIndex(`${indexval}`);

    // Search for the record with the specified attribute value
    index.search(name).then((response: any) => {
        if (response.hits.length > 0) {
            const objectIDToDelete: string = response.hits[0].objectID!;
            return index.deleteObject(objectIDToDelete);
        }
    })
}

function filterCodeCondition(conditionVar: any, conditionFor: any) {
    if (conditionVar != "") {
        let newBrandsIds: any = (conditionVar !== '' && conditionVar != null) ? conditionVar.split(",") : [];
        return (newBrandsIds.length > 0) ? (`${conditionFor} IN (${newBrandsIds.map((d: any) => { return `'${d}'` }).join(',')})`) : `${conditionFor} IN (${conditionVar})`;
    } else {
        return `${conditionFor} = ''`;
    }
}

function duplicateFilter(duplicateRefineItemName: any,) {
    duplicateRefineItemName = (duplicateRefineItemName !== "" || duplicateRefineItemName !== null) ? duplicateRefineItemName.replace("", " ") : duplicateRefineItemName;
    duplicateRefineItemName = (duplicateRefineItemName !== "" || duplicateRefineItemName !== null) ? duplicateRefineItemName.replace("'", " ") : duplicateRefineItemName;
    duplicateRefineItemName = (duplicateRefineItemName !== "" || duplicateRefineItemName !== null) ? duplicateRefineItemName.replace(",", " ") : duplicateRefineItemName;
    duplicateRefineItemName = duplicateRefineItemName.trim();
    return duplicateRefineItemName;
}

function groceryStoreRefine(eezlyItemNameArray: any, name: string, TotalWordMatch: any) {
    let duplicateRefineItemName = duplicateFilter(name);
    let duplicateItemNameArray: any = (duplicateRefineItemName !== "" || duplicateRefineItemName !== null) ? duplicateRefineItemName.split(" ") : [];

    for (let dmi_index = 0; dmi_index < duplicateItemNameArray.length; dmi_index++) {
        let SentenceCaseLetter = capitalizeFirstLetter(duplicateItemNameArray[dmi_index]);
        if ((eezlyItemNameArray.includes(duplicateItemNameArray[dmi_index])) || (eezlyItemNameArray.includes(SentenceCaseLetter))) {
            TotalWordMatch = TotalWordMatch + 1;
        }
    }
    return TotalWordMatch;
}

module.exports = app;
