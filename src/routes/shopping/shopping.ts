import express, {Request, Response, Application} from 'express';
import {CheckRequiredValidation} from '../../modules/validator.modules';
import {
    DBDateFormatModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponse, GenerateSuccessResponseWithData,
    PaginationModule,
    StoreNameObject,
    StoreNamesArray,
    StoreTableNameObject
} from '../../modules/common.modules';
import {RunAnyQuery, SelectQueryModule} from '../../modules/crud.modules';
import {dbCon} from '../../modules/db.modules';
import {StatusCodes} from 'http-status-codes';

require('dotenv').config({path: './.env'});
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
const moment = require("moment");
const ApiAuth = require("../../../lib/auth");

app.post('/createShoppingList', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let CartId = req.body.cart_id;
    let Lang: any = req.body.lang ? req.body.lang : 'en';
    let CartData: any = null;
    let CartItemDetail: any = [];
    let EezlyItemIdsArr: any = [];
    let EezlyItemsDetail: any = [];
    let skus: any = [];
    // Get the current week number
    const currentWeekNumber = moment().isoWeek();

    /* Stores */
    let StoreItems: any = [];

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{field: 'Cart id', value: CartId, type: 'Empty'}]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for valid Cart Id */
        await SelectQueryModule(dbCon, `carts A`, "A.*", `A.id = ? AND A.status = 1`, null, null, null, [CartId]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'The selected cart id is invalid.');
                }
                CartData = Data.data;
                UpdateCartStatusToValidated();
                FetchCartDetails();
            } else {
                return GenerateErrorResponse(res, Data.message);
            }
        });
    };

    let UpdateCartStatusToValidated = async (): Promise<any> => {
        let sql = `UPDATE carts SET verification_date = ?, updated_at = ?, status = 3 WHERE id = ?`;
        let values = [DBDateFormatModule(), DBDateFormatModule(), CartId];
        await RunAnyQuery(sql, values).then((data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
        })
    };

    let FetchCartDetails = async (): Promise<any> => {
        await SelectQueryModule(dbCon, `cart_details A`, "A.*", `A.cart_id = ?`, null, null, null, [CartId]).then((Data: any) => {
            if (Data.status) {
                CartItemDetail = Data.data;
                for (let i = 0; i < CartItemDetail.length; i++) {
                    EezlyItemIdsArr.push(CartItemDetail[i].eezly_item_id);
                }
                FetchEezlyItemsDetails();
            } else {
                return GenerateErrorResponse(res, Data.message);
            }
        });
    };

    let FetchEezlyItemsDetails = async (): Promise<any> => {
        let whereCondition: any = EezlyItemIdsArr.length > 0 ? `A.id IN (${EezlyItemIdsArr.join(",")})` : `A.id IN ('')`;
        await SelectQueryModule(dbCon, `eezly_items A`, "A.*", `${whereCondition}`, null, null, null, []).then((Data: any) => {
            if (Data.status) {
                EezlyItemsDetail = Data.data;
                FetchData();
            } else {
                return GenerateErrorResponse(res, Data.message);
            }
        });
    };

    let FetchData = async (): Promise<any> => {
        let temp: any = [];
        let e: number = 0;
        for (let i = 0; i < EezlyItemsDetail.length; i++) {
            temp = JSON.parse(EezlyItemsDetail[i].grocery_items);
            for (e = 0; e < temp.length; e++) {
                skus.push(temp[e].store_item);
            }
        }
        let condition = "'" + skus.join("','") + "'";
        let storeItemsData:any = await RunAnyQuery(`select * from stores_items where sku IN (${condition})`, []);
        if (!storeItemsData.status) {
            return GenerateBadRequestResponse(res, storeItemsData.message);
        }
        StoreItems = storeItemsData.data;
        InsertData();
    };

    let InsertData = async (): Promise<any> => {
        /* Create Cart Details */
        let ShoppingTitle: any = Lang === 'en' ? `Shopping List Week ${currentWeekNumber}` : `Liste de Course Semaine ${currentWeekNumber}`;
        await RunAnyQuery(`INSERT INTO shopping_lists (name, customer_id, stores_to_compare) VALUES (?, ?, ?)`, [ShoppingTitle, CartData[0].customer_id, CartData[0].stores_to_compare]).then(async (result: any) => {
            if (!result.status) {
                return GenerateErrorResponse(res, result.message);
            }
            // Insert Shopping List
            let shopping_lists_id: any = await result.data.insertId;
            let GroceryItem: any = [];
            let StoreItemsAttached: any = [];
            let Thumbnail: any = '';
            let RegularPrice: any = '';
            let SalePrice: any = '';
            let insertShoppingResult: any = [];
            for (let i = 0; i < CartItemDetail.length; i++) {
                GroceryItem = [];
                StoreItemsAttached = [];
                Thumbnail = '';
                RegularPrice = '';
                SalePrice = '';
                insertShoppingResult = [];
                // Create StoreItems List
                for (let j = 0; j < EezlyItemsDetail.length; j++) {
                    if (CartItemDetail[i].eezly_item_id === EezlyItemsDetail[j].id) {
                        GroceryItem = JSON.parse(EezlyItemsDetail[j].grocery_items);
                        for (let g = 0; g < GroceryItem.length; g++) {
                            for (let s = 0; s < StoreItems.length; s++) {
                                if (GroceryItem[g].store_id == StoreItems[s].storeId && GroceryItem[g].store_item == StoreItems[s].sku) {
                                    Thumbnail = StoreItems[s].image;
                                    RegularPrice = StoreItems[s].regular_price;
                                    SalePrice = StoreItems[s].sale_price;
                                    let SubArray: any = {
                                        store_id: GroceryItem[g].store_id,
                                        store_item: GroceryItem[g].store_item,
                                        thumbnail: Thumbnail,
                                        regular_price: RegularPrice,
                                        sale_price: SalePrice
                                    };
                                    StoreItemsAttached.push(SubArray);
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
                insertShoppingResult = await InsertShoppingListDetails(CartItemDetail[i], shopping_lists_id, StoreItemsAttached);
                if (!insertShoppingResult.status) {
                    return GenerateErrorResponse(res, insertShoppingResult.message);
                }
            }
            Response();
        });
    };

    let InsertShoppingListDetails = async (data: any, shoppingListId: number, storeItemsAttached: any): Promise<any> => {
        storeItemsAttached = storeItemsAttached.length > 0 ? storeItemsAttached : null;
        return await RunAnyQuery(`INSERT INTO shopping_list_details (shopping_list_id , eezly_item_id, quantity, store_items) VALUE (? , ? , ?, IF('${storeItemsAttached}' = 'null', null, ?))`, [shoppingListId, data.eezly_item_id, data.quantity, JSON.stringify(storeItemsAttached)]);
    };

    let Response = () => {
        return GenerateSuccessResponse(res, 'Shopping list created successfully');
    };

    /* Start */
    ValidationStep1();
});

app.get('/getShoppingLists', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let NoOfRecords: any = req.query.no_of_records;
    let ShoppingListItems: any = [];
    let ShoppingListItemsDetail: any = [];
    let ShoppingListItemsIdsArr: any = [];
    let TotalNumberOfItems: number = 0;

    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{
            field: 'The no of records field',
            value: NoOfRecords,
            type: 'Empty'
        }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        Paginate();
    };

    let Paginate = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `shopping_lists A`, 'COUNT(*) AS Total', `A.customer_id = ? AND deleted_at IS NULL`, null, null, null, [User.user_id]);
        if (data.status) {
            Pagination = await PaginationModule(req, process.env.BASE_URL + "/shopping/getShoppingLists", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let FetchData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `shopping_lists A`, `A.id, A.name, A.stores_to_compare, DATE_FORMAT(A.created_at, '%d/%m/%Y') AS created_at`, `A.customer_id = ? AND deleted_at IS NULL`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, [User.user_id]);
        if (data.status) {
            ShoppingListItems = data.data;
            for (let i = 0; i < ShoppingListItems.length; i++) {
                ShoppingListItemsIdsArr.push(ShoppingListItems[i].id);
            }
            FetchShoppingListItemsDetails();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let FetchShoppingListItemsDetails = async (): Promise<any> => {
        let whereCondition: any = ShoppingListItemsIdsArr.length > 0 ? `A.shopping_list_id IN (${ShoppingListItemsIdsArr.join(",")})` : `A.shopping_list_id IN ('')`;
        let data: any = await SelectQueryModule(dbCon, 'shopping_list_details A', 'A.*', `${whereCondition}`, null, null, null, []);
        if (data.status) {
            ShoppingListItemsDetail = data.data;
            MainProcess();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

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

    let Response = (): any => {
        Pagination.status = true;
        Pagination.data = ShoppingListItems;
        return res.status(StatusCodes.OK).json(Pagination);
    };

    // Start
    ValidationStep1();
});

app.get('/getShoppingListDetails', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let Lang: any = req.body.lang ? req.body.lang : 'en';
    let ShoppingListId = req.query.shopping_list_id;
    let ShoppingListDetail: any = null;
    let ShoppingListItemsDetail: any = [];
    let ShoppingListItemsArr: any = [];

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{
            field: 'Shopping list id',
            value: ShoppingListId,
            type: 'Empty'
        }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        CheckShoppingListId();
    };

    let CheckShoppingListId = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'shopping_lists A', `A.id, A.name, A.stores_to_compare, DATE_FORMAT(A.created_at, '%d/%m/%Y') AS created_at`, `A.id = ? AND A.customer_id = ? AND deleted_at IS NULL`, null, null, null, [ShoppingListId, User.user_id]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected shopping list id is invalid');
            } else {
                ShoppingListDetail = data.data[0];
                FetchShoppingListItems();
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let FetchShoppingListItems = async (): Promise<any> => {
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
        let data: any = await SelectQueryModule(dbCon, tables, columns, `A.shopping_list_id = ?`, null, null, null, [ShoppingListId]);
        if (data.status) {
            ShoppingListItemsDetail = data.data;
            MainProcess();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

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

    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
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

app.delete('/deleteShoppingList', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let shoppingListId: any = req.query.shopping_list_id;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{
            field: 'Shopping list id',
            value: shoppingListId,
            type: 'Empty'
        }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for valid shopping list Id */
        let checkValidId: any = await SelectQueryModule(dbCon, 'shopping_lists', '*', `id = ? AND customer_id = ?`, null, null, null, [shoppingListId, User.user_id]);
        if (checkValidId.status) {
            if (checkValidId.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected shopping list id is invalid');
            }
            DeleteShoppingList();
        } else {
            return GenerateErrorResponse(res, checkValidId.message);
        }
    };

    let DeleteShoppingList = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`UPDATE shopping_lists SET deleted_at = ? WHERE id = ?`, [DBDateFormatModule(), shoppingListId]);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        Response();
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Shopping list deleted successfully');
    };

    /* Start */
    ValidationStep1();
});

app.get("/reorder", ApiAuth, (req: Request, res: Response): any => {
    let Lang: any = req.body.lang ? req.body.lang : 'en';
    let User = req.body.user;
    let EezlyItemsArr: any = [];

    let GetMostLikedLatestEezlyItems = async (): Promise<any> => {
        const tables = `shopping_lists sl
                    INNER JOIN shopping_list_details sld ON sl.id = sld.shopping_list_id
                    INNER JOIN eezly_items ei ON sld.eezly_item_id = ei.id`;
        const columns = `COUNT(sld.eezly_item_id) AS TotalLiked, sld.eezly_item_id`;

        let data: any = await SelectQueryModule(dbCon, tables, columns, `sl.customer_id = ?`, ` GROUP BY sld.eezly_item_id`, ` ORDER BY TotalLiked DESC`, ` LIMIT 50`, [User.user_id]);
        if (data.status) {
            for (let i = 0; i < data.data.length; i++) {
                EezlyItemsArr.push(data.data[i].eezly_item_id);
            }
            GetItemsDetail();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetItemsDetail = async (): Promise<any> => {
        const escapedStringArray: string[] = EezlyItemsArr.map((value: string) => mysql.escape(value));
        const whereCondition = escapedStringArray.length > 0 ? `ei.id IN (${escapedStringArray.join(",")})` : `ei.id IN ('')`;
        const tables = `eezly_items ei`;
        const columns = `ei.id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN ei.name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(ei.name_fr, ei.name)
                    END AS name, ei.thumbnail, ei.brand, ei.size, ei.eezly_aisle_id, IF((SELECT COUNT(*) FROM favorites F WHERE F.customer_id = ${User.user_id} AND F.eezly_item_id = ei.id) > 0, true, false) AS isFavorite`;

        let data: any = await SelectQueryModule(dbCon, tables, columns, whereCondition, null, null, null, []);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (data: any): any => {
        return GenerateSuccessResponseWithData(res, data);
    };

    /* Start */
    GetMostLikedLatestEezlyItems();
});

module.exports = app;