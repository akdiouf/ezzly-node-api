import express, { Request, Response, Application } from 'express';
import { RunAnyQuery } from '../../modules/crud.modules';
import { dbCon } from '../../modules/db.modules';
import {
    CheckPermissionModule,
    DBDateFormatModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateForbiddenErrorResponse,
    GenerateSuccessResponse,
    GenerateUnauthorizedResponse,
    GetGeneralSettings,
    PaginationModule,
    StoreNameObject,
    StoreNamesArray,
    multiDimensionalUniqueStoreArray, GenerateSuccessResponseWithData, StoreNamesArrayWithIds, JoinSqlStatement, ComputeJoinSqlData, removeKeysFromJoinData, EezlyGetItemsIds, GetStroesFromDb
} from '../../modules/common.modules';
import { SelectQueryModule } from "../../modules/crud.modules";
import { StatusCodes } from 'http-status-codes';
import { CheckRequiredValidation } from "../../modules/validator.modules";

require('dotenv').config({ path: './.env' });
const jwt = require("jsonwebtoken");
const app: Application = express();
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
const ApiAuth = require("./../../../lib/auth");

// Get Eezly Items
app.get("/", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;

    let SettingsData: any = null;
    let SettingsThumbnailStores: any = null;
    let EezlyItems: any = null;
    let NoOfRecords: any = req.query.no_of_records;
    let Status: any = 0;
    let skus: any = [];
    /* For Listed Items */
    let Listed: string = "";
    let ListedCondition: string = "";
    let OrderByCondition: string = ` ORDER BY A.id DESC`;
    if (req.query.listed) {
        Listed = req.query.listed as string;
        ListedCondition = ` AND A.listed = '${Listed}'`;
    } else {
        // ListedCondition = ` AND A.listed = 'true'`;
    }

    /* Search Conditions */
    /* 1 - By Id */
    let SearchById: any = "";
    let SearchByIdCondition: any = "";
    if (req.query.search_by_id) {
        SearchById = parseInt(req.query.search_by_id as string);
        SearchByIdCondition = ` AND A.id = ${SearchById}`;
    }
    /* 2 - By Name */
    let SearchByName: any = "";
    let SearchByNameCondition: any = "";
    if (req.query.search_by_name) {
        SearchByName = req.query.search_by_name as string;
        if (SearchByName !== "") {
            let NameValues: any = SearchByName.split(" ");
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
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;
    let GroceryItems: any = [];

    let ValidationStep1 = (): any => {

        if (NoOfRecords === '' || NoOfRecords == null) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Number of records is required'
            });
        }
        GetSettings();
    };

    let GetSettings = async (): Promise<any> => {
        await RunAnyQuery("select * from settings where id = 1", []).then((Data: any) => {
            if (Data.status) {
                SettingsData = Data.data;
                SettingsThumbnailStores = (SettingsData[0].priority_stores_thumbnail !== '' || SettingsData[0].priority_stores_thumbnail != null) ? SettingsData[0].priority_stores_thumbnail.split(',') : [];
                // FetchData();
                FetchDataNew();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let FetchDataNew = async (): Promise<any> => {
        await SelectQueryModule(dbCon, "eezly_items A", "COUNT(*) AS Total", `A.deleted_at IS NULL ${ListedCondition} ${SearchByIdCondition} ${SearchByNameCondition} ${OrderByCondition}`, null, null, null, []).then(async (Data: any) => {
            if (Data.status) {
                Pagination = await PaginationModule(req, app.get("BaseUrl") + "/eezly_items", Page, NoOfRecords, parseInt(Data.data[0].Total));
            } else {
                return res.status(StatusCodes.OK).json({
                    status: false,
                    message: Data.message
                });
            }
        });
        if (Pagination) {
            let inConditions: any = await EezlyGetItemsIds(Page, NoOfRecords, `deleted_at IS NULL`, []);
            if (inConditions) {
                let condition = ` A.eezly_item_id IN (?)`;
                let sqlForItems: string = JoinSqlStatement(condition);
                await RunAnyQuery(sqlForItems, [inConditions]).then((data: any) => {
                    return ComputeJoinSqlData(data.data);
                }).then((data: any) => {
                    let finalArray: any = removeKeysFromJoinData(data);
                    Pagination.status = true;
                    Pagination.data = finalArray;
                    return res.status(StatusCodes.OK).json(Pagination);
                });
            }
        }
    }
    /* Start */
    ValidationStep1();
});

// Search From Eezly Items
app.get("/search", (req: Request, res: Response): any => {
    let EezlyItems: any = null;
    let FilterGroceryItems: any = [];
    let GroceryItems: any = [];
    let LastThursday: any = moment().startOf('week').add(-3, 'days');//.format("YYYY-MM-DD");
    let NoOfRecords: any = 1;
    let whereCondition: any = '';
    let OutDatedStatus: boolean = false;
    let skus: any = [];
    /* Search Conditions */
    /* 1 - By Id */
    let SearchById: any = "";
    let SearchByIdCondition: any = "";
    if (req.query.search_by_id) {
        SearchById = parseInt(req.query.search_by_id as string);
        SearchByIdCondition = ` AND A.id = ${SearchById}`;
    }

    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let FetchData = async (): Promise<any> => {
        await SelectQueryModule(dbCon, "eezly_items A", "COUNT(*) AS Total", `A.deleted_at IS NULL ${SearchByIdCondition}`, null, null, null, []).then(async (Data: any) => {
            if (Data.status) {
                Pagination = await PaginationModule(req, app.get("BaseUrl") + "/eezly_items/search", Page, NoOfRecords, parseInt(Data.data[0].Total));
            } else {
                return res.status(StatusCodes.OK).json({
                    status: false,
                    message: Data.message
                });
            }
        });
        if (Pagination) {
            let inConditions: any = await EezlyGetItemsIds(Page, NoOfRecords, `deleted_at IS NULL AND id = ?`, [SearchById]);
            if (inConditions) {
                let sqlForItems: string = JoinSqlStatement(` A.eezly_item_id IN (?)`);
                await RunAnyQuery(sqlForItems, [inConditions]).then((data: any) => {
                    return ComputeJoinSqlData(data.data);
                }).then((data: any) => {
                    let finalArray: any = removeKeysFromJoinData(data);
                    Pagination.status = true;
                    Pagination.data = finalArray;
                    return res.status(StatusCodes.OK).json(Pagination);
                });
            }
        }
    };

    /* Start */
    FetchData();
});

// Create Eezly Item
app.post("/create", ApiAuth, (req: Request, res: Response): any => {
    let User: any = req.body.user;
    let Name: any = req.body.name ? req.body.name : null;
    let FrenchName: any = req.body.name_fr ? req.body.name_fr : null;
    let Thumbnail: any = req.body.thumbnail ? req.body.thumbnail : null;
    let AisleId: any = req.body.eezly_aisle_id;
    let Brand: any = req.body.brand;
    let Size: any = req.body.size;
    let lang: any = (req.query.lang !== '' && req.query.lang !== null) ? req.query.lang : 'en';
    let environment: any = (req.query.environment !== '' && req.query.environment !== null) ? req.query.environment : 'dev';

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'modify_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'Name', value: Name, type: 'Length maximum 255 characters' },
            { field: 'French name', value: FrenchName, type: 'Length maximum 255 characters' },
            { field: 'Eezly aisle id', value: AisleId, type: 'Empty' },
            { field: 'Brand', value: Brand, type: 'Empty' },
            { field: 'Size', value: Size, type: 'Empty' },
        ]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check of Aisle Id Exists */
        let checkAisleId: any = await SelectQueryModule(dbCon, 'eezly_aisles', '*', `id = ?`, null, null, null, [AisleId]);
        if (checkAisleId.status) {
            if (checkAisleId.data.length === 0) {
                return GenerateBadRequestResponse(res, 'Invalid Eezly Aisle');
            }
            StoreData();
        } else {
            return GenerateErrorResponse(res, checkAisleId.message);
        }
    };

    let StoreData = async (): Promise<any> => {
        let sql = `INSERT INTO eezly_items (name, name_fr, thumbnail, brand, size, eezly_aisle_id , created_by, updated_by, created_at, updated_at) VALUE (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        let values = [
            Name !== 'null' ? Name : null,
            FrenchName !== 'null' ? FrenchName : null,
            Thumbnail !== 'null' ? Thumbnail : null,
            Brand,
            Size,
            AisleId,
            User.user_id,
            User.user_id,
            DBDateFormatModule(),
            DBDateFormatModule()
        ];
        let data: any = await RunAnyQuery(sql, values);
        if (data.status) {
            Response(data.data.insertId);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (Id: any): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            message: 'Eezly item added successfully',
            eezly_item_id: Id
        });
    };

    /* Start */
    CheckRolePermission();
});

// Update Eezly Item
app.put("/update", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let ItemId = req.body.eezly_item_id as string;
    let Name: any = req.body.name ? req.body.name : null;
    let FrenchName: any = req.body.name_fr ? req.body.name_fr : null;
    let Thumbnail: any = req.body.thumbnail ? req.body.thumbnail : null;
    let AisleId = req.body.eezly_aisle_id as string;
    let Brand: any = req.body.brand ? req.body.brand : null;
    let Size: any = req.body.size ? req.body.size : null;
    let Listed = req.body.listed as string;
    let Description: any = req.body.description ? req.body.description : null;
    let DescriptionFr: any = req.body.description_fr ? req.body.description_fr : null;
    let Ingredients: any = req.body.ingredients ? req.body.ingredients : null;
    let IngredientsFr: any = req.body.ingredients_fr ? req.body.ingredients_fr : null;
    let NutritionalInfo: any = req.body.nutritional_info ? req.body.nutritional_info : null;
    let NutritionalInfoFr: any = req.body.nutritional_info_fr ? req.body.nutritional_info_fr : null;
    let EezlyItemData: any = null;
    let SettingsData: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'modify_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        /* Check of Eezly Item Id Exists */
        let data: any = await SelectQueryModule(dbCon, 'eezly_items', '*', `id = ?`, null, null, null, [ItemId]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected eezly item id is invalid');
            }
            EezlyItemData = data.data;
            GetSettings();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetSettings = async (): Promise<any> => {
        let data: any = await GetGeneralSettings();
        if (data.status) {
            SettingsData = data.data;
            UpdateData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let UpdateData = async (): Promise<any> => {
        let sql = `UPDATE eezly_items SET name = ?, name_fr = ?, thumbnail = ?, brand = ?, size = ?, eezly_aisle_id = ?, listed = ?, description = ?, description_fr = ?, ingredients = ?, ingredients_fr = ?, nutritional_info = ?, nutritional_info_fr = ?, updated_by = ?, updated_at = ? WHERE id = ?`;
        let values = [
            Name !== 'null' ? Name : null,
            FrenchName !== 'null' ? FrenchName : null,
            FrenchName !== 'null' ? FrenchName : null,
            Brand !== 'null' ? Brand : null,
            Size !== 'null' ? Size : null,
            AisleId,
            Listed,
            Description !== 'null' ? Description : null,
            DescriptionFr !== 'null' ? DescriptionFr : null,
            Ingredients !== 'null' ? Ingredients : null,
            IngredientsFr !== 'null' ? IngredientsFr : null,
            NutritionalInfo !== 'null' ? NutritionalInfo : null,
            NutritionalInfoFr !== 'null' ? NutritionalInfoFr : null,
            User.user_id,
            DBDateFormatModule(),
            ItemId
        ];
        let data: any = await RunAnyQuery(sql, values);
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
                    await addInAlgolia(algoliaData, 'en', SettingsData[0].environment);
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
                    await addInAlgolia(algoliaData, 'fr', SettingsData[0].environment);
                }
            } else if (Listed !== EezlyItemData[0].listed && Listed === 'false') {
                if (Name !== '' && Name != null) {
                    await deleteFromAlgolia(Name, SettingsData[0].environment, 'en');
                }
                if (FrenchName !== '' && FrenchName != null) {
                    await deleteFromAlgolia(FrenchName, SettingsData[0].environment, 'fr');
                }
            }
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Eezly item updated successfully');
    };

    /* Start */
    CheckRolePermission();
});

// Search Eezly Items From Algolia
app.get("/algoliaSearch", async (req: Request, res: Response): Promise<any> => {
    // Token Handling
    let db = app.get('db');
    let UserId: any = null;
    let token = req.body.token || req.query.token || req.headers["authorization"];
    if (token != null) {
        token = token.split(' ')[1];
        if (!token) {
            return GenerateForbiddenErrorResponse(res, 'A token is required for authentication');
        }
        try {
            let User: any = jwt.verify(token, process.env.JWT_SECRET_KEY);
            UserId = User.user_id;
        } catch (err: any) {
            return GenerateUnauthorizedResponse(res, err.message);
        }
    }

    // Initializing
    const client = algoliasearch('9UL78WLKMV', '195cacaa24066db23c59803f029d2c46');
    let keyword: any = req.query.keyword;
    let lang: any = req.query.lang ? req.query.lang : 'en';
    let environment: any = req.query.environment ? req.query.environment : 'dev';
    let page: any = req.query.page;
    let brand: any = req.query.brand;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Keyword', value: keyword, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        if (req.query.page === '' || req.query.page == null) {
            page = 0;
        }
        if ((lang === 'en' || lang === 'fr') && (environment === 'dev' || environment === 'prod')) {
            searchIndex(`${environment}_eezly_${lang}`)
        } else {
            return GenerateBadRequestResponse(res, 'Invalid searching parameters');
        }
    };

    let searchIndex = (algoliaIndex: string): any => {
        const index = client.initIndex(algoliaIndex);
        let conditions: any = {};
        if (brand == null || brand === '') {
            conditions = {
                attributesToRetrieve: ['name', 'brand', 'id', 'size', 'thumbnail', 'listed'],
                hitsPerPage: 50,
                page: parseInt(page),
                getRankingInfo: 1,
                facets: ['brand']
            }
        } else {
            if (brand.includes(",")) {
                let newArray: any = brand.split(",");
                brand = "";
                newArray.forEach((e: any, i: any) => {
                    brand += "brand:'" + e + "'";
                    if (i != newArray.length - 1) {
                        brand += " OR ";
                    }
                });
            } else {
                brand = `brand:${brand}`;
            }
            conditions = {
                filters: `${brand}`,
                attributesToRetrieve: ['name', 'brand', 'id', 'size', 'thumbnail', 'listed'],
                hitsPerPage: 50,
                page: parseInt(page),
                getRankingInfo: 1,
                facets: ['brand']
            }
        }
        index.search(keyword, conditions).then((hits: any) => {
            if (hits) {
                if (UserId === '' || UserId == null) {
                    for (let i = 0; i < hits.hits.length; i++) {
                        hits.hits[i].isFavourite = 0;
                    }
                    Response(hits);
                } else {
                    let favoriteEezlyItemsArr: any = [];
                    let promise = new Promise(function (resolve, reject) {
                        dbCon.query(`SELECT * FROM favorites WHERE customer_id = ${UserId}`, (err: Error, data: any) => {
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
                    promise.then((data: any) => {
                        if (!data.status) {
                            return GenerateErrorResponse(res, data.message);
                        }
                        for (let i = 0; i < data.data.length; i++) {
                            favoriteEezlyItemsArr.push(data.data[i].eezly_item_id);
                        }
                        hits.hits.forEach((record: any, index: number) => {
                            if (favoriteEezlyItemsArr.indexOf(parseInt(record.id)) !== -1) {
                                hits.hits[index].isFavourite = 1;
                            } else {
                                hits.hits[index].isFavourite = 0;
                            }
                        });
                        Response(hits);
                    });
                }
            } else {
                Response("Not Found");
            }
        }).catch((err: any) => {
            console.error(err);
        });
    };

    let Response = (result: any): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            data: result.hits,
            facets: result.facets,
            currentpage: result.page,
            totalpages: result.nbPages
        });
    };

    /* Start */
    ValidationStep1();
});

// Get Eezly Items Based on Listed Parameter
app.put("/listed", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let ItemId = req.query.eezly_item_id as string;
    let Listed = req.query.listed as string;
    let EezlyItemData: any = null;
    let SettingsData: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'list_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        /* Check for Listed */
        if (!(Listed === 'true' || Listed === 'false')) {
            return GenerateBadRequestResponse(res, 'Selected listed is invalid');
        }
        /* Check of Eezly Item Id Exists */
        let checkIdExists: any = await SelectQueryModule(dbCon, 'eezly_items', '*', `id = ?`, null, null, null, [ItemId]);
        if (checkIdExists.status) {
            if (checkIdExists.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected eezly item id is invalid');
            }
            EezlyItemData = checkIdExists.data;
            GetSettings();
        } else {
            return GenerateErrorResponse(res, checkIdExists.message);
        }
    };

    let GetSettings = async (): Promise<any> => {
        let data: any = await GetGeneralSettings();
        if (data.status) {
            SettingsData = data.data;
            UpdateData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let UpdateData = async (): Promise<any> => {
        let sql = `UPDATE eezly_items SET listed = ?, updated_by = ?, updated_at = ? WHERE id = ?`;
        let values = [Listed, User.user_id, DBDateFormatModule(), ItemId]
        let data: any = await RunAnyQuery(sql, values);
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
            } else if (Listed !== EezlyItemData[0].listed && Listed === 'false') {
                if (EezlyItemData[0].name !== '' && EezlyItemData[0].name != null) {
                    deleteFromAlgolia(EezlyItemData[0].name, SettingsData[0].environment, 'en');
                }
                if (EezlyItemData[0].name_fr !== '' && EezlyItemData[0].name_fr != null) {
                    deleteFromAlgolia(EezlyItemData[0].name_fr, SettingsData[0].environment, 'fr');
                }
            }
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Eezly item updated successfully');
    };

    /* Start */
    CheckRolePermission();
});

// Add/Update Grocery Item List
app.post(["/addGroceryItemList", "/updateGroceryItemList"], ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let ItemId = req.body.eezly_item_id;
    let GroceryItemList: any = req.body.groceryItemList;
    let Stores: any = null;
    let skus: any = [];
    let StoreItems: any = [];
    let EezlyItemThumbnail: any = null;
    let FirstGroceryItemThumbnail: any = null;
    let SuccessMessage: string = "";
    let RequestSubUrl = req.originalUrl.split("/")[2];
    if (RequestSubUrl === "addGroceryItemList") {
        SuccessMessage = "Grocery item list added successfully";
    } else {
        SuccessMessage = "Grocery item list updated successfully";
    }

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'grocery item', value: GroceryItemList, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        await SelectQueryModule(dbCon, "eezly_items A", "A.*", `A.id = ?`, null, null, null, [ItemId]).then((data: any) => {
            if (!data.status) {
                return GenerateBadRequestResponse(res, data.message);
            }
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected eezly item id is invalid');
            }
            EezlyItemThumbnail = data.data.thumbnail;
            GetAllStores();
        });
    };

    let GetAllStores = async (): Promise<any> => {
        await SelectQueryModule(dbCon, "stores", "*", "deleted_at IS NULL", null, null, null, []).then((Data: any) => {
            if (Data.status) {
                Stores = Data.data;
                FetchData();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let FetchData = async (): Promise<any> => {
        let e: number = 0;
        GroceryItemList = JSON.parse(GroceryItemList);
        for (e = 0; e < GroceryItemList.length; e++) {
            skus.push(GroceryItemList[e].store_item);
        }
        let condition = "'" + skus.join("','") + "'";
        let storeItemsData: any = await RunAnyQuery(`select * from stores_items where sku IN (${condition})`, []);
        if (!storeItemsData.status) {
            return GenerateBadRequestResponse(res, storeItemsData.message);
        }
        StoreItems = storeItemsData.data;
        MainProcess();
    };

    let MainProcess = async (): Promise<any> => {
        for (let i = 0; i < GroceryItemList.length; i++) {
            const item = GroceryItemList[i];
            // Check for Store Id and Name Exists
            const isValidStoreIdAndName = Stores.some((store: any) => item.store_id === store.id && item.store_name === store.name);
            if (!isValidStoreIdAndName) {
                return GenerateBadRequestResponse(res, "Invalid store id and name in grocery item list");
            }
            // Check for Store with sku
            if (StoreNameObject.hasOwnProperty(item.store_name)) {
                const isValidStoreItem = StoreItems.some((storeItem: any) => {
                    if (item.store_item === storeItem.sku) {
                        if (i === 0) {
                            FirstGroceryItemThumbnail = storeItem.image;
                        }
                        return true;
                    }
                    return false;
                });
                if (!isValidStoreItem) {
                    return GenerateBadRequestResponse(res, "Invalid store");
                }
            }
        }
        /* Updating Record */
        let sql = '';
        let values = null;
        if (EezlyItemThumbnail === null) {
            sql = `UPDATE eezly_items SET grocery_items = ?, thumbnail = ?, updated_by = ?, updated_at = ? WHERE id = ?`;
            values = [JSON.stringify(GroceryItemList), FirstGroceryItemThumbnail, User.user_id, DBDateFormatModule(), ItemId]

        } else {
            sql = `UPDATE eezly_items SET grocery_items = ?, updated_by = ?, updated_at = ? WHERE id = ?`;
            values = [JSON.stringify(GroceryItemList), User.user_id, DBDateFormatModule(), ItemId];
        }
        await RunAnyQuery(sql, values).then((data: any) => {
            if (!data.status) {
                return GenerateBadRequestResponse(res, data.message);
            }
            Response();
        });
    };

    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            message: SuccessMessage
        });
    };

    /* Start */
    ValidationStep1();
});

// Update Catalog Information
app.post("/updateCatalogInformation", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let ItemId = req.body.eezly_item_id;
    let ProductDescription: any = (req.body.product_description !== '' && req.body.product_description != null) ? req.body.product_description.replace(/[\u0300-\u036f]/g, "") : null;
    let ProductDescriptionFr: any = (req.body.product_description_fr !== '' && req.body.product_description_fr != null) ? req.body.product_description_fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®".*+?^${}()|[\]\\]/g, "") : null;
    let Ingredients: any = (req.body.ingredients !== '' && req.body.ingredients != null) ? req.body.ingredients.replace(/[\u0300-\u036f]/g, "") : null;
    let IngredientsFr: any = (req.body.ingredients_fr !== '' && req.body.ingredients_fr != null) ? req.body.ingredients_fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®".*+?^${}()|[\]\\]/g, "") : null;
    let NutritionalInformation: any = (req.body.nutritional_information !== '' && req.body.nutritional_information != null) ? req.body.nutritional_information.replace(/[\u0300-\u036f]/g, "") : null;
    let NutritionalInformationFr: any = (req.body.nutritional_information_fr !== '' && req.body.nutritional_information_fr != null) ? req.body.nutritional_information_fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®".*+?^${}()|[\]\\]/g, "") : null;
    let Photos: any = (req.body.photos !== '' && req.body.photos != null) ? req.body.photos : null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'modify_eezly_items');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        /* Check of Eezly Item Id Exists */
        let data: any = await SelectQueryModule(dbCon, 'eezly_items', '*', `id = ?`, null, null, null, [ItemId]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected eezly item id is invalid');
            }
            MainProcess();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let MainProcess = async (): Promise<any> => {
        /* Updating Record */
        let sql = `UPDATE eezly_items SET description = ?, description_fr = ?, ingredients = ?, ingredients_fr = ?, nutritional_info = ?, nutritional_info_fr = ?, photos = ?, updated_by = ?, updated_at = ? WHERE id = ?`;
        let values = [
            ProductDescription !== 'null' ? ProductDescription : null,
            ProductDescriptionFr !== 'null' ? ProductDescriptionFr : null,
            Ingredients !== 'null' ? Ingredients : null,
            IngredientsFr !== 'null' ? IngredientsFr : null,
            NutritionalInformation !== 'null' ? NutritionalInformation : null,
            NutritionalInformationFr !== 'null' ? NutritionalInformationFr : null,
            Photos !== 'null' ? Photos : null,
            User.user_id,
            DBDateFormatModule(),
            ItemId
        ];
        let data: any = await RunAnyQuery(sql, values);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Eezly item catalog information updated successfully');
    };

    /* Start */
    CheckRolePermission();
});

// Get Eezly Item By Aisle Id
app.get("/getEezlyItemByAisleId", (req: Request, res: Response): any => {
    let eezly_aisle_id: any = req.query.eezly_aisle_id;
    let SettingsData: any = null;
    let SettingsThumbnailStores: any = null;
    /* Stores */
    let EezlyItems: any = null;
    let GroceryItems: any = [];
    let NoOfRecords: any = req.query.no_of_records;
    let skus: any = [];
    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'No of records', value: NoOfRecords, type: 'Empty' },
            { field: 'Eezly aisle', value: eezly_aisle_id, type: 'Empty' }
        ]);
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
            FetchData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }

    };

    let FetchData = async (): Promise<any> => {
        await SelectQueryModule(dbCon, "eezly_items A", "COUNT(*) AS Total", `A.deleted_at IS NULL AND A.listed = true AND A.eezly_aisle_id = ?`, null, null, null, [eezly_aisle_id]).then(async (Data: any) => {
            if (Data.status) {
                Pagination = await PaginationModule(req, app.get("BaseUrl") + "/eezly_items", Page, NoOfRecords, parseInt(Data.data[0].Total));
            } else {
                return res.status(StatusCodes.OK).json({
                    status: false,
                    message: Data.message
                });
            }
        });
        if (Pagination) {
            await SelectQueryModule(dbCon, `eezly_items A`, `A.*, A.grocery_items AS raw_grocery_items, (SELECT B.name FROM eezly_aisles B WHERE B.id = A.eezly_aisle_id) AS aisle_name, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.deleted_at IS NULL AND A.listed = true AND A.eezly_aisle_id = ?`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, [eezly_aisle_id]).then((Data: any) => {
                if (Data.status) {
                    return { status: true, data: Data.data };
                } else {
                    return GenerateErrorResponse(res, Data.message);
                }
            }).then(async (d: any) => {
                if (d.status && d.data.length > 0) {
                    EezlyItems = d.data;
                    var temp;
                    var e;
                    EezlyItems.forEach((row: any, i: any) => {
                        temp = JSON.parse(row.raw_grocery_items);
                        for (e = 0; e < temp.length; e++) {
                            skus.push(temp[e].store_item);
                        }
                    });
                    let condition = "'" + skus.join("','") + "'";
                    let sqlNew = `select * from stores_items where sku IN (${condition})`;
                    await RunAnyQuery(sqlNew, []).then((data: any) => {
                        if (!data.status) {
                            return GenerateBadRequestResponse(res, data.message);
                        }
                        let a: number = 0;
                        if (EezlyItems[a].raw_grocery_items !== null && EezlyItems[a].raw_grocery_items !== "") {
                            let EGroceryItems = JSON.parse(EezlyItems[a].raw_grocery_items);
                            for (let i = 0; i < EGroceryItems.length; i++) {
                                data.data.forEach((element: any, index: any) => {
                                    let SubArray: any = {
                                        store_id: EGroceryItems[i].store_id,
                                        store_name: EGroceryItems[i].store_name
                                    };
                                    if ((element.sku === EGroceryItems[i].store_item)) {
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
                                });
                            }
                            if (GroceryItems.length > 0) {
                                EezlyItems[a].grocery_items = multiDimensionalUniqueStoreArray(GroceryItems);
                            }
                            EezlyItems[a].photos = (EezlyItems[a].photos !== '' && EezlyItems[a].photos !== null) ? JSON.parse(EezlyItems[a].photos) : [];
                        }
                    }).then((data: any) => {
                        Pagination.status = true;
                        Pagination.data = EezlyItems;
                        return res.status(StatusCodes.OK).json(Pagination);
                    });
                } else {
                    return GenerateBadRequestResponse(res, "An unhandled error exception");
                }
            });
        }
    };
    /* Start */
    ValidationStep1();
});

// Get Eezly Item By Store Id
app.get("/getEezlyItemByStoreItem", (req: Request, res: Response): any => {

    let SettingsData: any = null;
    let SettingsThumbnailStores: any = null;
    let store: string = req.query.store as string;
    let sku: string = req.query.sku as string;
    let eezlyItems: any = [];
    let finalEezlyItem: any = [];

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'Store', value: store, type: 'Empty' },
            { field: 'SKU', value: sku, type: 'Length' },
        ]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Get Settings */
        let setting: any = await GetGeneralSettings();
        if (!setting.status) {
            return GenerateErrorResponse(res, setting.message);
        } else {
            SettingsData = setting.data;
            SettingsThumbnailStores = (SettingsData[0].priority_stores_thumbnail !== '' || SettingsData[0].priority_stores_thumbnail != null) ? SettingsData[0].priority_stores_thumbnail.split(',') : [];
        }
        GetEezlyItems();
    };

    let GetEezlyItems = async (): Promise<any> => {
        let eezlyItemsData: any = await SelectQueryModule(dbCon, 'eezly_items A INNER JOIN eezly_aisles B ON A.eezly_aisle_id = B.id', `A.id, A.name, A.thumbnail, A.brand, A.size, A.eezly_aisle_id, B.name as aisle_name, A.grocery_items, A.created_by, A.updated_by, (SELECT C.fullName FROM users C WHERE A.created_by = C.id) AS createdBy, (SELECT D.fullName FROM users D WHERE A.updated_by = D.id) AS updatedBy`, `A.grocery_items LIKE ?`, null, null, null, [`%${sku}%`]);
        if (!eezlyItemsData.status) {
            return GenerateErrorResponse(res, eezlyItemsData.message);
        }
        eezlyItems = eezlyItemsData.data;
        MainProcess();
    };

    let MainProcess = (): any => {
        let GroceryItems: any = [];
        let Status: number = 0;
        for (let i = 0; i < eezlyItems.length; i++) {
            GroceryItems = JSON.parse(eezlyItems[i].grocery_items);
            for (let b = 0; b < GroceryItems.length; b++) {
                if (GroceryItems[b].store_name === store && GroceryItems[b].store_item == sku) {
                    finalEezlyItem.push(eezlyItems[i]);
                    Status = 1;
                    break;
                }
            }
            if (Status) { break; }
        }
        Response();
    };

    let Response = (): any => {
        return GenerateSuccessResponseWithData(res, finalEezlyItem);
    };

    /* Start */
    ValidationStep1();
});

// Add Eezly Item In Algolia
function addInAlgolia(addData: any, lang: String, environment: String) {
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
        } else {
            console.log('Record not found.');
        }
    })
        .then((response: any) => {
            if (response) {
                console.log('Record deleted successfully:', response);
            }
        })
        .catch((error: any) => {
            console.error('Error deleting record:', error);
        });
}


module.exports = app;
