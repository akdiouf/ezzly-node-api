import express, { Request, Response, Application } from 'express';
import { CheckRequiredValidation } from "../../modules/validator.modules";
import { GenerateBadRequestResponse, GenerateErrorResponse, GenerateSuccessResponse, GetGeneralSettings, PaginationModule, StoreIdObject } from "../../modules/common.modules";
import { RunAnyQuery, SelectQueryModule } from "../../modules/crud.modules";
import { dbCon } from "../../modules/db.modules";
import { StatusCodes } from 'http-status-codes';

require('dotenv').config({ path: './.env' });
const app: Application = express();
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
const ApiAuth = require("../../../lib/auth");

// Favorite/UnFavorite Eezly Item
app.put('/update', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let EezlyItemId = req.query.eezly_item_id;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Eezly item id', value: EezlyItemId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for valid Cart Id */
        let checkValidId: any = await SelectQueryModule(dbCon, 'eezly_items', '*', `id = ?`, null, null, null, [EezlyItemId]);
        if (checkValidId.status) {
            if (checkValidId.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected Eezly item id is invalid');
            }
            CheckFavoriteStatus();
        } else {
            return GenerateErrorResponse(res, checkValidId.message);
        }
    };

    let CheckFavoriteStatus = async (): Promise<any> => {
        /* Check for item favourite status */
        let data: any = await SelectQueryModule(dbCon, 'favorites', '*', `customer_id = ? AND eezly_item_id = ?`, null, null, null, [User.user_id, EezlyItemId]);
        if (data.status) {
            if (data.data.length === 0) {
                AddEezlyItemInFavoriteList();
            } else {
                RemoveEezlyItemFromFavoriteList();
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let AddEezlyItemInFavoriteList = async (): Promise<any> => {
        let sql = `INSERT INTO favorites (customer_id, eezly_item_id) VALUES (?,?)`;
        let values = [User.user_id, EezlyItemId]
        let data: any = await RunAnyQuery(sql, values);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let RemoveEezlyItemFromFavoriteList = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`DELETE FROM favorites WHERE customer_id = ? AND eezly_item_id = ?`, [User.user_id, EezlyItemId]);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = () => {
        return GenerateSuccessResponse(res, 'Favorite list updated successfully');
    };

    /* Start */
    ValidationStep1();
});

// Get Favorite Items List
app.get('/all', ApiAuth, (req: Request, res: Response): any => {
    let db = app.get("db");
    let User = req.body.user;
    let NoOfRecords: any = req.query.no_of_records;
    let Lang: any = (req.query.lang === '' || req.query.lang == null) ? 'en' : req.query.lang;
    let FavoriteItems: any = [];
    let FilterGroceryItems: any = [];
    let GroceryItems: any = [];
    let whereCondition: any = '';
    let SettingsData: any = null;
    let SettingsThumbnailStores: any = null;
    let Status: any = 0;
    let skus: any = [];
    let igaStoreSkuList: any = [];
    let supercStoreSkuList: any = [];
    let maxiStoreSkuList: any = [];
    let metroStoreSkuList: any = [];
    let provigoStoreSkuList: any = [];
    let walmartStoreSkuList: any = [];

    /* Stores */
    let IgaItems: any = [];
    let SupercItems: any = [];
    let MaxiItems: any = [];
    let MetroItems: any = [];
    let ProvigoItems: any = [];
    let WalmartItems: any = [];

    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'No of records', value: NoOfRecords, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        GetSettings();
    };

    let GetSettings = async (): Promise<any> => {
        let data: any = await GetGeneralSettings();
        if (data.status) {
            SettingsData = data.data;
            SettingsThumbnailStores = (SettingsData[0].priority_stores_thumbnail !== '' || SettingsData[0].priority_stores_thumbnail != null) ? SettingsData[0].priority_stores_thumbnail.split(',') : [];
            GetFavoriteItemsList("favorite_items_count");
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetFavoriteItemsList = async (Type: string): Promise<any> => {
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
            await SelectQueryModule(dbCon, tables, `COUNT(*) AS Total`, `A.customer_id = ? AND B.deleted_at IS NULL`, null, null, null, [User.user_id]).then(async (Data: any) => {
                if (Data.status) {
                    Pagination = await PaginationModule(req, app.get("BaseUrl") + "/favorite/all", Page, NoOfRecords, parseInt(Data.data[0].Total));
                    GetFavoriteItemsList("favorite_items");
                } else {
                    return GenerateErrorResponse(res, Data.message);
                }
            });
        } else if (Type === "favorite_items") {
            await SelectQueryModule(dbCon, tables, columns, `A.customer_id = ? AND B.deleted_at IS NULL`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, [User.user_id]).then((Data: any) => {
                if (Data.status) {
                    FavoriteItems = Data.data;
                    FetchData();
                } else {
                    return GenerateErrorResponse(res, Data.message);
                }
            });
        }
    };
    let FetchData = async (): Promise<any> => {
        var temp;
        var e;
        FavoriteItems.forEach((row: any, i: any) => {
            temp = JSON.parse(row.raw_grocery_items);
            for (e = 0; e < temp.length; e++) {
                skus.push(temp[e].store_item);
            }
        });
        let condition = "'" + skus.join("','") + "'";
        let sqlNew = `select * from stores_items where sku IN (${condition})`;
        await RunAnyQuery(sqlNew, [condition]).then((data: any) => {
            if (!data.status) {
                return GenerateBadRequestResponse(res, data.message);
            }
            data.data.forEach((row: any) => {
                switch (row.storeId) {
                    case StoreIdObject.iga:
                        IgaItems.push(row);
                        break;
                    case StoreIdObject.superc:
                        SupercItems.push(row);
                        break;
                    case StoreIdObject.maxi:
                        MaxiItems.push(row);
                        break;
                    case StoreIdObject.metro:
                        MetroItems.push(row);
                        break;
                    case StoreIdObject.provigo:
                        ProvigoItems.push(row);
                        break;
                    case StoreIdObject.walmart:
                        WalmartItems.push(row);
                        break;
                    default:
                        break;
                }
            });
        }).then((data: any) => {
            MainProcess();
        });
    }

    let MainProcess = () => {
        for (let a = 0; a < FavoriteItems.length; a++) {
            Status = 0;
            if (FavoriteItems[a].raw_grocery_items !== null && FavoriteItems[a].raw_grocery_items !== "") {
                let EGroceryItems = JSON.parse(FavoriteItems[a].raw_grocery_items);
                for (let i = 0; i < EGroceryItems.length; i++) {
                    let SubArray: any = {
                        store_id: EGroceryItems[i].store_id,
                        store_name: EGroceryItems[i].store_name
                    };
                    if (EGroceryItems[i].store_id === StoreIdObject.iga) {
                        for (let j = 0; j < IgaItems.length; j++) {
                            if (IgaItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = returnStoreSubArray(IgaItems[j]);
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("1")) {
                                        FavoriteItems[a].thumbnail = IgaItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    } else if (EGroceryItems[i].store_id === StoreIdObject.superc) {
                        for (let j = 0; j < SupercItems.length; j++) {
                            if (SupercItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = returnStoreSubArray(SupercItems[j]);
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("2")) {
                                        FavoriteItems[a].thumbnail = SupercItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    } else if (EGroceryItems[i].store_id === StoreIdObject.maxi) {
                        for (let j = 0; j < MaxiItems.length; j++) {
                            if (MaxiItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = returnStoreSubArray(MaxiItems[j])
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("3")) {
                                        FavoriteItems[a].thumbnail = MaxiItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    } else if (EGroceryItems[i].store_id === StoreIdObject.metro) {
                        for (let j = 0; j < MetroItems.length; j++) {
                            if (MetroItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = returnStoreSubArray(MetroItems[j])
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("4")) {
                                        FavoriteItems[a].thumbnail = MetroItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    } else if (EGroceryItems[i].store_id === StoreIdObject.provigo) {
                        for (let j = 0; j < ProvigoItems.length; j++) {
                            if (ProvigoItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = returnStoreSubArray(ProvigoItems[j])
                                if (Status === 0 && SettingsThumbnailStores.length > 0) {
                                    if (SettingsThumbnailStores.includes("5")) {
                                        FavoriteItems[a].thumbnail = ProvigoItems[j].image;
                                        Status = 1;
                                    }
                                }
                                break;
                            }
                        }
                    } else if (EGroceryItems[i].store_id === StoreIdObject.walmart) {
                        for (let j = 0; j < WalmartItems.length; j++) {
                            if (WalmartItems[j].sku === EGroceryItems[i].store_item) {
                                SubArray["item_details"] = returnStoreSubArray(WalmartItems[j]);
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

    let Response = (): any => {
        Pagination.status = true;
        Pagination.data = FavoriteItems;
        return res.status(StatusCodes.OK).json(Pagination);
    };

    // Start
    ValidationStep1();
});

function returnStoreSubArray(arr: any) {
    return {
        id: arr.id,
        category: arr.category,
        aisle: arr.aisle,
        subCategory: arr.subCategory,
        sku: arr.sku,
        name: arr.name,
        french_name: arr.french_name,
        brand: arr.brand,
        regular_price: arr.regular_price,
        sale_price: arr.sale_price,
        image: arr.image,
        url: arr.url,
        size_label: arr.size_label,
        size: arr.size
    }
}

module.exports = app;
