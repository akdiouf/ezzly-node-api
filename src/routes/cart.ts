import express, { Request, Response, Application } from 'express';
import {
    PaginationModule,
    StoreNamesArray,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateBadGatewayResponse,
    CheckPermissionModule, GenerateSuccessResponse, DBDateFormatModule,
    CartStatus, StoreIdObject, StoreIdsArray, EezlyGetItemsIds, JoinSqlStatement, ComputeJoinSqlData, removeKeysFromJoinData, JoinSqlStatementForCart, ComputeJoinSqlDataForCart, JoinSqlStatementForCartWithoutLogin
} from '../modules/common.modules';
import { RunAnyQuery, SelectQueryModule } from "../modules/crud.modules";
import { CheckRequiredValidation } from "../modules/validator.modules";
import { dbCon } from '../modules/db.modules';
import { StatusCodes } from 'http-status-codes';

require('dotenv').config({ path: './.env' });
const app: Application = express();
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
const ApiAuth = require("./../../lib/auth");

app.post("/add", ApiAuth, (req: Request, res: Response): any => {
    let db = app.get("db");
    let User = req.body.user;
    let CartItems = req.body.cart_items;
    let FinalCartItems: any = [];
    let EezlyItemIds: any = [];

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'The cart items field', value: CartItems, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        GetEezlyItems();
    };

    let GetEezlyItems = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'eezly_items', 'id', 'deleted_at IS NULL', null, null, null, []);
        if (data.status) {
            for (let i = 0; i < data.data.length; i++) {
                EezlyItemIds.push(data.data[i].id);
            }
            CartItems = JSON.parse(CartItems);
            for (let i = 0; i < CartItems.length; i++) {
                if (EezlyItemIds.indexOf(CartItems[i].eezly_item_id) === -1) {
                    return GenerateErrorResponse(res, 'Eezly item not found');
                }
            }
            /* Items in the Cart are valid. Now process cart */
            Cart();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Cart = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'carts A', 'A.*', `A.customer_id = ? AND A.status = ${CartStatus.current}`, null, null, null, [User.user_id]);
        if (data.status) {
            if (data.data.length === 0) {
                /* Create Cart Entry */
                let sql = `INSERT INTO carts (customer_id, status, created_at, updated_at) VALUE (?, ?, ?, ?)`;
                let values = [User.user_id, CartStatus.current, DBDateFormatModule(), DBDateFormatModule()];
                let insertCartData: any = await RunAnyQuery(sql, values);
                if (insertCartData.status) {
                    InsertCartDetails(insertCartData.data.insertId);
                } else {
                    return GenerateErrorResponse(res, insertCartData.message);
                }
            } else {
                /* Deleting old Cart Details */
                let deleteOldCartData: any = await RunAnyQuery(`DELETE FROM cart_details WHERE cart_id = ?`, data.data[0].id);
                if (deleteOldCartData.status) {
                    InsertCartDetails(data.data[0].id);
                } else {
                    return GenerateErrorResponse(res, deleteOldCartData.message);
                }
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let InsertCartDetails = async (CartId: number): Promise<any> => {
        // If duplicate item is available then remove it and sum up quantity of first one
        EezlyItemIds = [];
        for (let i = 0; i < CartItems.length; i++) {
            if (EezlyItemIds.indexOf(CartItems[i].eezly_item_id) !== -1) {
                for (let j = 0; j < FinalCartItems.length; j++) {
                    if (FinalCartItems[j].eezly_item_id === CartItems[i].eezly_item_id) {
                        FinalCartItems[j].quantity += CartItems[i].quantity;
                    }
                }
            } else {
                EezlyItemIds.push(CartItems[i].eezly_item_id);
                FinalCartItems.push(CartItems[i]);
            }
        }
        /* Creating New Cart Details */
        let sql = `INSERT INTO cart_details (cart_id, eezly_item_id, quantity, created_at, updated_at) VALUE `;
        let values = [];
        for (let i = 0; i < FinalCartItems.length; i++) {
            sql += i === 0 ? `` : `, `;
            sql += `(?, ?, ?, ?, ?)`;
            values.push(
                CartId,
                FinalCartItems[i].eezly_item_id,
                FinalCartItems[i].quantity,
                DBDateFormatModule(),
                DBDateFormatModule()
            );
        }
        let data: any = await RunAnyQuery(sql, values);
        if (data.status) {
            Response(CartId);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (cartId: any): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            message: 'Cart updated successfully',
            cart_id: cartId
        });
    };

    /* Start */
    ValidationStep1();
});

app.get('/getCartDetails', ApiAuth, (req: Request, res: Response): any => {
    let db = app.get("db");
    let User = req.body.user;
    let NoOfRecords: any = req.query.no_of_records;
    let CartId = req.query.cart_id as string;
    let CartData: any = null;
    let CartTotalItemsQuantity: number = 0;
    let TotalCartItems: number = 0;
    let CartItemsData: any = null;
    let itemIds: any = [];
    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let ValidationStep1 = async (): Promise<any> => {
        if (NoOfRecords === '' || NoOfRecords == null) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'The no of records field is required.'
            });
        } else if (CartId === '' || CartId == null) {
            return res.status(400).json({
                status: false,
                message: 'The cart id field is required.'
            });
        }
        /* Check for valid Cart Id */
        await SelectQueryModule(dbCon, `carts A`, "A.*", `A.id = ?`, null, null, null, [CartId]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, "The selected cart id is invalid.");
                }
                FetchData();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let FetchData = async (): Promise<any> => {
        await SelectQueryModule(dbCon, `carts A JOIN cart_statuses B ON A.status = B.id JOIN users C ON A.customer_id = C.id`, "A.id, C.fullName as customer_name, A.stores_to_compare, A.no_of_stores, A.no_of_items, A.submission_date, A.verification_date, B.name as status", `A.id = ?`, null, null, null, [CartId]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'Cart is empty');
                }
                CartData = Data.data;
                GetStoresToCompare();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let GetStoresToCompare = async (): Promise<any> => {
        if (CartData[0].stores_to_compare !== "") {
            await SelectQueryModule(dbCon, `stores A`, `A.id, A.name`, `A.id IN (?)`, null, null, null, [CartData[0].stores_to_compare]).then((Data: any) => {
                if (Data.status) {
                    CartData[0].stores_to_compare = Data.data;
                    GetCartTotalQuantity();
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        } else {
            CartData[0].stores_to_compare = [];
            GetCartTotalQuantity();
        }
    };

    let GetCartTotalQuantity = async (): Promise<any> => {
        await SelectQueryModule(dbCon, `cart_details A`, `COUNT(*) AS TotalItems, SUM(A.quantity) AS Total`, `A.cart_id = ?`, null, null, null, [CartId]).then(async (SumData: any) => {
            if (SumData.status) {
                CartTotalItemsQuantity = parseInt(SumData.data[0].Total);
                TotalCartItems = parseInt(SumData.data[0].TotalItems);
                Pagination = await PaginationModule(req, app.get("BaseUrl") + "/cart/getCartDetails", Page, NoOfRecords, TotalCartItems);
                GetCartItems();
            } else {
                return GenerateBadRequestResponse(res, SumData.message);
            }
        });
    };

    let GetCartItems = async (): Promise<any> => {
        await SelectQueryModule(db, `cart_details A JOIN eezly_items B ON A.eezly_item_id = B.id JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`, `A.eezly_item_id, B.name, A.quantity, B.thumbnail, B.brand, B.size, B.eezly_aisle_id, C.name as aisle_name, B.grocery_items,B.grocery_items AS raw_grocery_items`, `A.cart_id = ?`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, [CartId]).then((Data: any) => {
            if (Data.status) {
                CartItemsData = Data.data;
                for (let i in CartItemsData) {
                    itemIds.push(CartItemsData[i].eezly_item_id)
                }
                FetchStoresDataNew();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let FetchStoresDataNew = async (): Promise<any> => {
        let condition = ` A.eezly_item_id IN (?) AND G.cart_id = ?`;
        let sqlForItems: string = JoinSqlStatement(condition, "cart");
        await RunAnyQuery(sqlForItems, [itemIds, CartId]).then((data: any) => {
            return ComputeJoinSqlData(data.data);
        }).then((data: any) => {
            let finalArray: any = removeKeysFromJoinData(data);
            Pagination.status = true;
            Pagination.data = finalArray;
            delete Pagination.status;
            return res.status(StatusCodes.OK).json({
                status: true,
                cart: CartData,
                cartTotalItemsQuantity: CartTotalItemsQuantity,
                cart_items: Pagination
            });
        });

    }
    /* Start */
    ValidationStep1();
});

app.get('/getCartsByStatus', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let Lang: any = (req.query.lang === '' || req.query.lang == null) ? 'en' : req.query.lang;
    let NoOfRecords: any = req.query.no_of_records;
    let Status = req.query.status as string;
    let CartsData: any = null;
    let Stores: any = null;
    let CartItemsData: any = null;
    let itemIds: any = [];
    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'Number of records', value: NoOfRecords, type: 'Empty' },
            { field: 'French name', value: Status, type: 'Empty' },

        ]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        if (parseInt(Status) === CartStatus.current) {
            CurrentCarts();
        } else if (parseInt(Status) === CartStatus.submit || parseInt(Status) === CartStatus.validate) {
            SubmittedVerifiedCarts();
        } else {
            return GenerateBadRequestResponse(res, 'The status field value is invalid');
        }
    };

    let CurrentCarts = (): any => {
        let GetCarts = async (): Promise<any> => {
            await SelectQueryModule(dbCon, `carts A`, `A.*`, `A.status = ? AND A.customer_id = ?`, null, null, null, [1, User.user_id]).then((Data: any) => {
                if (Data.status) {
                    if (Data.data.length === 0) {
                        return GenerateBadRequestResponse(res, 'Cart is empty');
                    }
                    CartsData = Data.data;
                    GetCartItemsTotal();
                } else {
                    return GenerateBadRequestResponse(res, Data.message);

                }
            });
        };

        let GetCartItemsTotal = async (): Promise<any> => {
            await SelectQueryModule(dbCon, `cart_details A`, `COUNT(*) AS TotalItems, SUM(A.quantity) AS Total`, `A.cart_id = ?`, null, null, null, [CartsData[0].id]).then(async (Data: any) => {
                if (Data.status) {
                    Pagination = await PaginationModule(req, app.get("BaseUrl") + "/cart/getCartDetails", Page, NoOfRecords, Data.data[0].TotalItems);
                    GetCartItems();
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        };

        let GetCartItems = async (): Promise<any> => {
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

            await SelectQueryModule(dbCon, tables, columns, `A.cart_id = ?`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, [CartsData[0].id]).then((Data: any) => {
                if (Data.status) {
                    CartItemsData = Data.data;
                    for (let i in CartItemsData) {
                        itemIds.push(CartItemsData[i].eezly_item_id)
                    }
                    FetchStoresDataNew();
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        };
        let FetchStoresDataNew = async (): Promise<any> => {
            let condition = ` A.eezly_item_id IN (?)`;
            let sqlForItems: string = JoinSqlStatement(condition);
            await RunAnyQuery(sqlForItems, [itemIds]).then((data: any) => {
                return ComputeJoinSqlData(data.data);
            }).then((data: any) => {
                let finalArray: any = removeKeysFromJoinData(data);
                CartItemsData = finalArray
                Response();
            });

        }
        GetCarts();
    };

    let SubmittedVerifiedCarts = (): any => {
        let GetStores = async (): Promise<any> => {
            await SelectQueryModule(dbCon, `stores A`, `A.id, A.name`, null, null, null, null, []).then((Data: any) => {
                if (Data.status) {
                    Stores = Data.data;
                    GetCount();
                } else {
                    return GenerateBadRequestResponse(res, Data.message);

                }
            });
        };

        let GetCount = async (): Promise<any> => {
            await SelectQueryModule(dbCon, `carts A JOIN users B ON A.customer_id = B.id`, `COUNT(*) AS Total`, `A.status = ${parseInt(Status)}${User.role_id !== 1 ? ' AND A.customer_id = ' + User.user_id : ''}`, null, null, null, []).then(async (Data: any) => {
                if (Data.status) {
                    Pagination = await PaginationModule(req, app.get("BaseUrl") + "/cart/getCartsByStatus", Page, NoOfRecords, Data.data[0].Total);
                    GetData();
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        };

        let GetData = async (): Promise<any> => {
            await SelectQueryModule(dbCon, `carts A JOIN users B ON A.customer_id = B.id`, `A.id, A.stores_to_compare, A.no_of_stores, A.no_of_items, A.submission_date`, `A.status = ${parseInt(Status)}${User.role_id !== 1 ? ' AND A.customer_id = ' + User.user_id : ''}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, []).then((Data: any) => {
                if (Data.status) {
                    CartItemsData = Data.data;
                    for (let i = 0; i < CartItemsData.length; i++) {
                        if (CartItemsData[i].stores_to_compare !== "") {
                            let _StoreIds: any = CartItemsData[i].stores_to_compare.split(",");
                            let StoresToCompare: any = [];
                            for (let k = 0; k < Stores.length; k++) {
                                if (_StoreIds.includes(Stores[k].id.toString())) {
                                    StoresToCompare.push(Stores[k]);
                                }
                            }
                            CartItemsData[i].stores_to_compare = StoresToCompare;
                        }
                    }
                    Response();
                } else {
                    return GenerateBadRequestResponse(res, Data.message);
                }
            });
        };
        GetStores();
    };

    let Response = (): any => {
        Pagination.status = true;
        Pagination.data = CartItemsData;
        if (parseInt(Status) === CartStatus.current) {
            delete Pagination.status;
            let ResponseData: any = {
                status: true,
                cart_id: CartsData[0].id,
                cart_items: Pagination
            };
            return res.status(StatusCodes.OK).json(ResponseData);
        } else if (parseInt(Status) === CartStatus.submit || parseInt(Status) === CartStatus.validate) {
            return res.status(StatusCodes.OK).json(Pagination);
        }
    };

    /* Start */
    ValidationStep1();
});

app.put('/removeCartItem', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let NoOfRecords: any = req.query.no_of_records as string;
    let EezlyItemId = req.query.eezly_item_id as string;
    let CartData: any = null;
    let CartItemsData: any = null;
    let TotalCartItems: any = null;
    let GroceryItems: any = [];
    let itemIds: any = [];
    /* Stores */
    let skus: any = [];

    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;
    let ValidationStep1 = (): any => {
        if (NoOfRecords === '' || NoOfRecords == null) {
            return GenerateBadRequestResponse(res, 'The no of records field is required.');
        } else if (EezlyItemId === '' || EezlyItemId == null) {
            return GenerateBadRequestResponse(res, 'The eezly item id field is required.');
        }
        //TODO: Anmol
        GetCartData();
    };

    let GetCartData = async (): Promise<any> => {
        await SelectQueryModule(dbCon, `carts A`, `A.*`, `A.customer_id = ? AND A.status = ?`, null, null, null, [User.user_id, CartStatus.current]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'No current cart available');
                }
                CartData = Data.data;
                GetCartItemWithItemId();
            } else {
                return GenerateBadRequestResponse(res, 'The eezly item id field is required.');

            }
        });
    };

    let GetCartItemWithItemId = async (): Promise<any> => {
        await SelectQueryModule(dbCon, `cart_details A`, `A.*`, `A.cart_id = ? AND A.eezly_item_id = ?`, null, null, null, [CartData[0].id, EezlyItemId]).then((Data: any) => {
            if (Data.status) {
                CartItemsData = Data.data;
                if (CartItemsData.length === 0) {
                    return GenerateBadRequestResponse(res, 'Invalid Eezly Item Id');
                }
                DeleteItemFromCart();
            } else {
                return GenerateBadGatewayResponse(res, Data.message)
            }
        });
    };

    let DeleteItemFromCart = async (): Promise<any> => {
        await RunAnyQuery(`DELETE FROM cart_details WHERE id = ?`, [CartItemsData[0].id]).then((data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, 'The eezly item id field is required.');
            }
            GetTotalCartItems();
        })
    };

    let GetTotalCartItems = async (): Promise<any> => {
        await SelectQueryModule(dbCon, `cart_details A`, `COUNT(*) AS TotalItems`, `A.cart_id = ?`, null, null, null, [CartData[0].id]).then(async (Data: any) => {
            if (Data.status) {
                TotalCartItems = parseInt(Data.data[0].TotalItems);
                Pagination = await PaginationModule(req, process.env.BASE_URL + "/cart/removeCartItem", Page, NoOfRecords, TotalCartItems);
                GetCartItems();
            } else {
                return GenerateBadRequestResponse(res, 'The eezly item id field is required.');
            }
        });
    };

    let GetCartItems = async (): Promise<any> => {
        await SelectQueryModule(dbCon, `cart_details A JOIN eezly_items B ON A.eezly_item_id = B.id JOIN eezly_aisles C ON B.eezly_aisle_id = C.id`, `A.eezly_item_id, B.name, A.quantity, B.thumbnail, B.brand, B.size, B.eezly_aisle_id, C.name as aisle_name, B.grocery_items,B.grocery_items as raw_grocery_items`, `A.cart_id = ?`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, [CartData[0].id]).then((Data: any) => {
            if (Data.status) {
                CartItemsData = Data.data;
                for (let i in CartItemsData) {
                    itemIds.push(CartItemsData[i].eezly_item_id)
                }
                FetchStoresDataNew();
            } else {
                return GenerateBadRequestResponse(res, 'The eezly item id field is required.');
            }
        });
    };
    let FetchStoresDataNew = async (): Promise<any> => {
        let condition = ` A.eezly_item_id IN (?) AND G.cart_id = ?`;
        let sqlForItems: string = JoinSqlStatement(condition, "cart");
        await RunAnyQuery(sqlForItems, [itemIds, CartData[0].id]).then((data: any) => {
            return ComputeJoinSqlData(data.data);
        }).then((data: any) => {
            let finalArray: any = removeKeysFromJoinData(data);
            Pagination.status = true;
            Pagination.data = finalArray;
            let ResponseData: any = {
                status: true,
                message: 'Item removed from cart successfully',
                cart_id: CartData[0].id,
                cart_items: Pagination
            };
            return res.status(StatusCodes.OK).json(ResponseData);
        });
    }
    ValidationStep1();
});

app.delete('/clear', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;

    let DeleteCartData = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`DELETE carts, cart_details FROM carts INNER JOIN cart_details ON carts.id = cart_details.cart_id WHERE carts.customer_id = ? AND carts.status = ?;`, [User.user_id, CartStatus.current]);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Cart is cleared!');
    };

    DeleteCartData();
});

app.put('/submitAdminCart', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let CartId = req.query.cart_id as string;
    let CartData: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'submit_user_cart');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'The cart id', value: CartId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for valid Cart Id */
        let checkCartId: any = await SelectQueryModule(dbCon, 'carts', '*', `id = ?`, null, null, null, [CartId]);
        if (checkCartId.status) {
            if (checkCartId.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected cart id is invalid');
            }
            GetCartData();
        } else {
            return GenerateErrorResponse(res, checkCartId.message);
        }
    };

    let GetCartData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'carts A JOIN users B ON A.customer_id = B.id', 'A.*, B.fcm_token', `A.id = ? AND A.status = ?`, null, null, null, [CartId, CartStatus.submit]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'No submitted cart found');
            }
            CartData = data.data;
            UpdateCart();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let UpdateCart = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`UPDATE carts SET verification_date = ?, updated_at = ?, status = ? WHERE id = ?`, [DBDateFormatModule(), DBDateFormatModule(), CartStatus.validate, CartData[0].id]);
        if (data.status) {
            if (CartData[0].fcm_token !== '') {
                FCMCall();
            } else {
                Response();
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let FCMCall = (): any => {
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
            .then((response: any) => {
                Response();
            })
            .catch((error: any) => {
                return res.status(app.get("ErrorStatus")).json({
                    status: false,
                    message: error
                });
            });
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Cart verified successfully');
    };

    /* Start */
    CheckRolePermission();
});

app.post('/compareNoLogin', (req: Request, res: Response): any => {

    let Lang: any = (req.body.lang === '' || req.body.lang == null) ? 'en' : req.body.lang;
    let CartItems: any = (req.body.cart_items !== '' && req.body.cart_items != null && req.body.cart_items !== undefined) ? JSON.parse(req.body.cart_items) : null;
    let CartItemsIds: any = [];
    let CartItemsData: any = null;
    let CartItemList: any = [];
    let StoresToCompare: any = StoreIdsArray();
    let LastThursday: any = moment().startOf('week').add(-3, 'days'); //.format("YYYY-MM-DD");
    let BillArray: any = [];
    let BillDifference: number = 0;
    let BillPercentageMaxToMin: string = "";
    let Price: any = null;
    let OptimizedList: any = {
        'cheapest_items': [],
        'total_bill': 0,
        'optimized_saving': 0
    };
    let OptimizedItemsList: any = [];
    let OptimizedListTotalBill:number = 0;
    let OptimizedListSaving:number = 0;
    let expensivePrice: any = null;
    let cheapestPrice: any = null;
    let cheapGroceryitem: any = null;
    let UniqueAisles: any = [];
    let AisleItemList: any = [];
    /* Stores */
    let StoreModels: any = [];

    let IgaItems: any = [];
    let IgaAvailableItemsPrice: any = [];
    let IgaMissingItemsList: any = [];
    let IgaTotalBill: number = 0;

    let SupercItems: any = [];
    let SupercAvailableItemsPrice: any = [];
    let SupercMissingItemsList: any = [];
    let SupercTotalBill: number = 0;

    let MaxiItems: any = [];
    let MaxiAvailableItemsPrice: any = [];
    let MaxiMissingItemsList: any = [];
    let MaxiTotalBill: number = 0;

    let MetroItems: any = [];
    let MetroAvailableItemsPrice: any = [];
    let MetroMissingItemsList: any = [];
    let MetroTotalBill: number = 0;

    let ProvigoItems: any = [];
    let ProvigoAvailableItemsPrice: any = [];
    let ProvigoMissingItemsList: any = [];
    let ProvigoTotalBill: number = 0;

    let WalmartItems: any = [];
    let WalmartAvailableItemsPrice: any = [];
    let WalmartMissingItemsList: any = [];
    let WalmartTotalBill: number = 0;
    /* Stores */

    let ValidationStep1 = (): any => {
        // TODO Anmol
        if (CartItems === '' || CartItems == null) {
            return GenerateBadRequestResponse(res, 'The cart items field is required.');
        }
        if (CartItems.length === 0) {
            return GenerateBadRequestResponse(res, 'No cart item found.');
        }
        /* Generate Cart Item Id Array */
        CartItems.forEach((item: any) => {
            CartItemsIds.push(item.eezly_item_id);
        });
        FetchDataNew();
    };

    let FetchDataNew = async (): Promise<any> => {
        let condition = `A.eezly_item_id IN (?)`;
        let sqlForItems: string = JoinSqlStatementForCartWithoutLogin(condition, Lang);
        await RunAnyQuery(sqlForItems, [CartItemsIds]).then((data: any) => {
            return ComputeJoinSqlDataForCart(data.data);
        }).then((data: any) => {
            let finalArray: any = removeKeysFromJoinData(data);
            for (let i in finalArray) {
                for (let j in finalArray[i].grocery_items) {
                    switch (finalArray[i]['grocery_items'][j].storeId) {
                        case StoreIdObject.iga:
                            IgaItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.superc:
                            SupercItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.maxi:
                            MaxiItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.metro:
                            MetroItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.provigo:
                            ProvigoItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.walmart:
                            WalmartItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        default:
                            break;
                    }
                }
            }
            // Bind quantity with cart item data
            // Create a map of eezly_item_id to quantity from CartItems
            const cartItemMap = CartItems.reduce((map:any, item:any) => {
                map[item.eezly_item_id] = item.quantity;
                return map;
            }, {});

            // Update quantities in finalArray
            for (let i = 0; i < finalArray.length; i++) {
                if (cartItemMap.hasOwnProperty(finalArray[i].eezly_item_id)) {
                    finalArray[i].quantity = cartItemMap[finalArray[i].eezly_item_id];
                }
            }
            CartItemsData = finalArray;
        }).then((data: any) => {
            CartProcess();
        });
    };

    let CartProcess = (): any => {
        let Price: any = null;
        for (let a = 0; a < CartItemsData.length; a++) {
            let EGroceryItems: any = CartItemsData[a].grocery_items !== "" ? CartItemsData[a].grocery_items : [];
            let StoreIds: any = [];
            let StoreItemsIds: any = [];
            for (let b = 0; b < EGroceryItems.length; b++) {
                StoreIds.push(parseInt(EGroceryItems[b].storeId));
                StoreItemsIds.push(EGroceryItems[b].sku.toString());
            }
            // IGA
            if (StoreIds.includes(StoreIdObject.iga) && StoresToCompare.includes(StoreIdObject.iga)) {
                if (IgaItems.length > 0) {
                    let Key: number = StoreIds.indexOf(1);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                IgaMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Super C
            if (StoreIds.includes(StoreIdObject.superc) && StoresToCompare.includes(StoreIdObject.superc)) {
                if (SupercItems.length > 0) {
                    let Key: number = StoreIds.indexOf(2);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                SupercMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Maxi
            if (StoreIds.includes(StoreIdObject.maxi) && StoresToCompare.includes(StoreIdObject.maxi)) {
                if (MaxiItems.length > 0) {
                    let Key: number = StoreIds.indexOf(3);
                    let ItemId: string = StoreItemsIds[Key];
                    for (let c = 0; c < MaxiItems.length; c++) {
                        if (ItemId === MaxiItems[c].sku) {
                            // check if store item is outdated or not

                            MaxiAvailableItemsPrice.push(pushNoLoginStoreAvailabilityData(CartItemsData[a], MaxiItems[c], LastThursday)
                            );
                            if (Price !== '' && Price != null) {
                                MaxiTotalBill += parseFloat(Price);
                            }
                            break;
                        }
                    }
                }
            } else {
                MaxiMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Metro
            if (StoreIds.includes(StoreIdObject.metro) && StoresToCompare.includes(StoreIdObject.metro)) {
                if (MetroItems.length > 0) {
                    let Key: number = StoreIds.indexOf(4);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                MetroMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Provigo
            if (StoreIds.includes(StoreIdObject.provigo) && StoresToCompare.includes(StoreIdObject.provigo)) {
                if (ProvigoItems.length > 0) {
                    let Key: number = StoreIds.indexOf(5);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                ProvigoMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Walmart
            if (StoreIds.includes(StoreIdObject.walmart) && StoresToCompare.includes(StoreIdObject.walmart)) {
                if (WalmartItems.length > 0) {
                    let Key: number = StoreIds.indexOf(6);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                WalmartMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Create Optimized list
            expensivePrice = null;
            cheapestPrice = null;
            cheapGroceryitem = null;
            for (let d = 0; d < EGroceryItems.length; d++) {
                Price = GetPrice(EGroceryItems[d].regular_price, EGroceryItems[d].sale_price, CartItemsData[a].quantity);
                if (cheapestPrice == null || Price < cheapestPrice) {
                    cheapestPrice = Price;
                    cheapGroceryitem = EGroceryItems[d];
                }
                if (expensivePrice == null || Price > expensivePrice) {
                    expensivePrice = Price;
                }
            }
            OptimizedListTotalBill += cheapestPrice;
            OptimizedListSaving += (expensivePrice - cheapestPrice);
            OptimizedItemsList.push(pushOptimisedList2(cheapGroceryitem, cheapestPrice, LastThursday, CartItemsData[a].eezly_item_id));
            // Remove grocery items from response
            delete CartItemsData[a].grocery_items;
            delete CartItemsData[a].quantity;
        }

        OptimizedList['cheapest_items'] = OptimizedItemsList;
        OptimizedList['total_bill'] = OptimizedListTotalBill;
        OptimizedList['optimized_saving'] = OptimizedListSaving;

        /* Create cart item list */
        CartItemsData.forEach((item: any, index: number) => {
            if (UniqueAisles.indexOf(item.aisle_name) === -1) {
                UniqueAisles.push(item.aisle_name);
            }
        });
        UniqueAisles.forEach((item: any, index: number) => {
            AisleItemList = [];
            CartItemsData.forEach((c_item: any, c_index: number) => {
                if (item === c_item.aisle_name) {
                    AisleItemList.push(c_item);
                }
            });
            CartItemList.push({
                [item]: AisleItemList
            });
        });

        /* Set cart model */
        // 1 - IGA
        if (StoresToCompare.includes(StoreIdObject.iga)) {
            StoreModels.push({
                store_name: 'IGA',
                store_id: StoreIdObject.iga,
                available_item_price_list: IgaAvailableItemsPrice,
                missing_item_list: IgaMissingItemsList,
                total_bill: IgaTotalBill > 0 ? IgaTotalBill : null
            });
            if (IgaTotalBill != null && IgaTotalBill > 0) {
                BillArray.push(IgaTotalBill);
            }
        }
        // 2 - Super C
        if (StoresToCompare.includes(StoreIdObject.superc)) {
            StoreModels.push({
                store_name: 'Super C',
                store_id: StoreIdObject.superc,
                available_item_price_list: SupercAvailableItemsPrice,
                missing_item_list: SupercMissingItemsList,
                total_bill: SupercTotalBill > 0 ? SupercTotalBill : null
            });
            if (SupercTotalBill != null && SupercTotalBill > 0) {
                BillArray.push(SupercTotalBill);
            }
        }
        // 3 - Maxi
        if (StoresToCompare.includes(StoreIdObject.maxi)) {
            StoreModels.push({
                store_name: 'Maxi',
                store_id: StoreIdObject.maxi,
                available_item_price_list: MaxiAvailableItemsPrice,
                missing_item_list: MaxiMissingItemsList,
                total_bill: MaxiTotalBill > 0 ? MaxiTotalBill : null
            });
            if (MaxiTotalBill != null && MaxiTotalBill > 0) {
                BillArray.push(MaxiTotalBill);
            }
        }
        // 4 - Metro
        if (StoresToCompare.includes(StoreIdObject.metro)) {
            StoreModels.push({
                store_name: 'Metro',
                store_id: StoreIdObject.metro,
                available_item_price_list: MetroAvailableItemsPrice,
                missing_item_list: MetroMissingItemsList,
                total_bill: MetroTotalBill > 0 ? MetroTotalBill : null
            });
            if (MetroTotalBill != null && MetroTotalBill > 0) {
                BillArray.push(MetroTotalBill);
            }
        }
        // 5 - Provigo
        if (StoresToCompare.includes(StoreIdObject.provigo)) {
            StoreModels.push({
                store_name: 'Provigo',
                store_id: StoreIdObject.provigo,
                available_item_price_list: ProvigoAvailableItemsPrice,
                missing_item_list: ProvigoMissingItemsList,
                total_bill: ProvigoTotalBill > 0 ? ProvigoTotalBill : null
            });
            if (ProvigoTotalBill != null && ProvigoTotalBill > 0) {
                BillArray.push(ProvigoTotalBill);
            }
        }
        // 6 - Walmart
        if (StoresToCompare.includes(StoreIdObject.walmart)) {
            StoreModels.push({
                store_name: 'Walmart',
                store_id: StoreIdObject.walmart,
                available_item_price_list: WalmartAvailableItemsPrice,
                missing_item_list: WalmartMissingItemsList,
                total_bill: WalmartTotalBill > 0 ? WalmartTotalBill : null
            });
            if (WalmartTotalBill != null && WalmartTotalBill > 0) {
                BillArray.push(WalmartTotalBill);
            }
        }
        let MaximumBill: number = Math.max.apply(Math, BillArray);
        let MinimumBill: number = Math.min.apply(Math, BillArray);
        BillDifference = parseFloat((MaximumBill - MinimumBill).toFixed(2));
        if (MinimumBill > 0) {
            BillPercentageMaxToMin = Math.round(((MaximumBill * 100) / MinimumBill) - 100).toString() + "%";
        }
        Response();
    };

    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            cartItemList: CartItemList,
            storeModels: StoreModels,
            optimizedItemList: OptimizedList,
            differenceHighestToLowest: BillDifference,
            differenceHighestToLowestPercentage: BillPercentageMaxToMin,
        });
    };

    /* Start */
    ValidationStep1();
});

app.post('/compare', ApiAuth, (req: Request, res: Response): any => {

    let User = req.body.user;
    let Lang: any = (req.body.lang === '' || req.body.lang == null) ? 'en' : req.body.lang;
    let CartId: any = null;
    let CartData: any = null;
    let CartItemsData: any = null;
    let CartItemList: any = [];
    let CartItemsTotal: number = 0;
    let Stores = (req.body.stores !== '' && req.body.stores !== null && req.body.stores !== undefined) ? req.body.stores : '';
    let NoOfStores = (req.body.stores !== '' && req.body.stores !== null && req.body.stores !== undefined) ? Stores.split(",").length : 0;
    let StoresToCompare: any = StoreIdsArray();
    let LastThursday: any = moment().startOf('week').add(-3, 'days');//.format("YYYY-MM-DD");
    let BillArray: any = [];
    let BillDifference: number = 0;
    let BillPercentageMaxToMin: string = "";
    let Price: any = null;
    let OptimizedList: any = {
        'cheapest_items': [],
        'total_bill': 0,
        'optimized_saving': 0
    };
    let OptimizedItemsList: any = [];
    let OptimizedListTotalBill:number = 0;
    let OptimizedListSaving:number = 0;
    let expensivePrice: any = null;
    let cheapestPrice: any = null;
    let cheapGroceryitem: any = null;
    let UniqueAisles: any = [];
    let AisleItemList: any = [];
    /* Stores */
    let StoreModels: any = [];

    let IgaItems: any = [];
    let IgaAvailableItemsPrice: any = [];
    let IgaMissingItemsList: any = [];
    let IgaTotalBill: number = 0;

    let SupercItems: any = [];
    let SupercAvailableItemsPrice: any = [];
    let SupercMissingItemsList: any = [];
    let SupercTotalBill: number = 0;

    let MaxiItems: any = [];
    let MaxiAvailableItemsPrice: any = [];
    let MaxiMissingItemsList: any = [];
    let MaxiTotalBill: number = 0;

    let MetroItems: any = [];
    let MetroAvailableItemsPrice: any = [];
    let MetroMissingItemsList: any = [];
    let MetroTotalBill: number = 0;

    let ProvigoItems: any = [];
    let ProvigoAvailableItemsPrice: any = [];
    let ProvigoMissingItemsList: any = [];
    let ProvigoTotalBill: number = 0;

    let WalmartItems: any = [];
    let WalmartAvailableItemsPrice: any = [];
    let WalmartMissingItemsList: any = [];
    let WalmartTotalBill: number = 0;
    /* Stores */

    let ValidationStep1 = async (): Promise<any> => {
        /* Get User Current Cart Data */
        await SelectQueryModule(dbCon, `carts A`, "A.*", `A.customer_id = ? AND A.status = ?`, null, null, null, [User.user_id, CartStatus.current]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'No user current cart available.');
                }
                CartData = Data.data;
                CartId = CartData[0].id;
                FetchDataNew();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    // Submit User Current Cart
    let FetchDataNew = async (): Promise<any> => {
        let condition = ` G.cart_id = ?`;
        let sqlForItems: string = JoinSqlStatementForCart(condition, Lang);
        await RunAnyQuery(sqlForItems, [CartId]).then((data: any) => {
            return ComputeJoinSqlDataForCart(data.data);
        }).then((data: any) => {
            let finalArray: any = removeKeysFromJoinData(data);
            CartItemsTotal = finalArray.length;
            for (let i in finalArray) {
                for (let j in finalArray[i].grocery_items) {
                    switch (finalArray[i]['grocery_items'][j].storeId) {
                        case StoreIdObject.iga:
                            IgaItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.superc:
                            SupercItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.maxi:
                            MaxiItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.metro:
                            MetroItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.provigo:
                            ProvigoItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.walmart:
                            WalmartItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        default:
                            break;
                    }
                }
            }
            CartItemsData = finalArray;
        }).then((data: any) => {
            SubmitUserCart();
        });
    };

    let SubmitUserCart = (): any => {
        let sql = `UPDATE carts SET stores_to_compare = ?, no_of_stores = ?, no_of_items = ?, submission_date = ?, updated_at = ?, status = ? WHERE id = ?`;
        let values = [Stores, NoOfStores, CartItemsTotal, DBDateFormatModule(), DBDateFormatModule(), CartStatus.current, CartId];
        RunAnyQuery(sql, values).then((data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
            CartProcess();
        });
    };

    let CartProcess = (): any => {
        let ComparisonStores: any = (Stores !== '' && Stores != null) ? Stores.split(',') : [];
        let Price: any = null;
        for (let a = 0; a < CartItemsData.length; a++) {
            let EGroceryItems: any = CartItemsData[a].grocery_items !== "" ? CartItemsData[a].grocery_items : [];
            let StoreIds: any = [];
            let StoreItemsIds: any = [];
            for (let b = 0; b < EGroceryItems.length; b++) {
                StoreIds.push(parseInt(EGroceryItems[b].storeId));
                StoreItemsIds.push(EGroceryItems[b].sku.toString());
            }
            // IGA
            if (StoreIds.includes(StoreIdObject.iga) && StoresToCompare.includes(StoreIdObject.iga)) {
                if (IgaItems.length > 0) {
                    let Key: number = StoreIds.indexOf(1);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                IgaMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Super C
            if (StoreIds.includes(StoreIdObject.superc) && StoresToCompare.includes(StoreIdObject.superc)) {
                if (SupercItems.length > 0) {
                    let Key: number = StoreIds.indexOf(2);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                SupercMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Maxi
            if (StoreIds.includes(StoreIdObject.maxi) && StoresToCompare.includes(StoreIdObject.maxi)) {
                if (MaxiItems.length > 0) {
                    let Key: number = StoreIds.indexOf(3);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                MaxiMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Metro
            if (StoreIds.includes(StoreIdObject.metro) && StoresToCompare.includes(StoreIdObject.metro)) {
                if (MetroItems.length > 0) {
                    let Key: number = StoreIds.indexOf(4);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                MetroMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Provigo
            if (StoreIds.includes(StoreIdObject.provigo) && StoresToCompare.includes(StoreIdObject.provigo)) {
                if (ProvigoItems.length > 0) {
                    let Key: number = StoreIds.indexOf(5);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                ProvigoMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Walmart
            if (StoreIds.includes(StoreIdObject.walmart) && StoresToCompare.includes(StoreIdObject.walmart)) {
                if (WalmartItems.length > 0) {
                    let Key: number = StoreIds.indexOf(6);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                WalmartMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }

            // Create Optimized list
            expensivePrice = null;
            cheapestPrice = null;
            cheapGroceryitem = null;
            for (let d = 0; d < EGroceryItems.length; d++) {
                if (ComparisonStores.includes(EGroceryItems[d].storeId.toString())) {
                    Price = GetPrice(EGroceryItems[d].regular_price, EGroceryItems[d].sale_price, CartItemsData[a].quantity);
                    if (cheapestPrice == null || Price < cheapestPrice) {
                        cheapestPrice = Price;
                        cheapGroceryitem = EGroceryItems[d];
                    }
                    if (expensivePrice == null || Price > expensivePrice) {
                        expensivePrice = Price;
                    }
                }
            }
            OptimizedListTotalBill += cheapestPrice;
            OptimizedListSaving += (expensivePrice - cheapestPrice);
            OptimizedItemsList.push(pushOptimisedList2(cheapGroceryitem, cheapestPrice, LastThursday, CartItemsData[a].eezly_item_id));
            // Remove grocery items from response
            delete CartItemsData[a].grocery_items;
        }

        OptimizedList['cheapest_items'] = OptimizedItemsList;
        OptimizedList['total_bill'] = OptimizedListTotalBill;
        OptimizedList['optimized_saving'] = OptimizedListSaving;

        /* Create cart item list */
        CartItemsData.forEach((item: any, index: number) => {
            if (UniqueAisles.indexOf(item.aisle_name) === -1) {
                UniqueAisles.push(item.aisle_name);
            }
        });
        UniqueAisles.forEach((item: any, index: number) => {
            AisleItemList = [];
            CartItemsData.forEach((c_item: any, c_index: number) => {
                if (item === c_item.aisle_name) {
                    AisleItemList.push(c_item);
                }
            });
            CartItemList.push({
                [item]: AisleItemList
            });
        });

        /* Set cart model */
        // IGA
        StoreModels.push({
            store_name: 'IGA',
            store_id: StoreIdObject.iga,
            available_item_price_list: IgaAvailableItemsPrice,
            missing_item_list: IgaMissingItemsList,
            total_bill: IgaTotalBill > 0 ? IgaTotalBill : null
        });
        if (IgaTotalBill != null && IgaTotalBill > 0 && ComparisonStores.includes(StoreIdObject.iga)) {
            BillArray.push(IgaTotalBill);
        }
        // Super C
        StoreModels.push({
            store_name: 'Super C',
            store_id: StoreIdObject.superc,
            available_item_price_list: SupercAvailableItemsPrice,
            missing_item_list: SupercMissingItemsList,
            total_bill: SupercTotalBill > 0 ? SupercTotalBill : null
        });
        if (SupercTotalBill != null && SupercTotalBill > 0 && ComparisonStores.includes(StoreIdObject.superc)) {
            BillArray.push(SupercTotalBill);
        }
        // Maxi
        StoreModels.push({
            store_name: 'Maxi',
            store_id: StoreIdObject.maxi,
            available_item_price_list: MaxiAvailableItemsPrice,
            missing_item_list: MaxiMissingItemsList,
            total_bill: MaxiTotalBill > 0 ? MaxiTotalBill : null
        });
        if (MaxiTotalBill != null && MaxiTotalBill > 0 && ComparisonStores.includes(StoreIdObject.maxi)) {
            BillArray.push(MaxiTotalBill);
        }
        // Metro
        StoreModels.push({
            store_name: 'Metro',
            store_id: StoreIdObject.metro,
            available_item_price_list: MetroAvailableItemsPrice,
            missing_item_list: MetroMissingItemsList,
            total_bill: MetroTotalBill > 0 ? MetroTotalBill : null
        });
        if (MetroTotalBill != null && MetroTotalBill > 0 && ComparisonStores.includes(StoreIdObject.metro)) {
            BillArray.push(MetroTotalBill);
        }
        // Provigo
        StoreModels.push({
            store_name: 'Provigo',
            store_id: StoreIdObject.provigo,
            available_item_price_list: ProvigoAvailableItemsPrice,
            missing_item_list: ProvigoMissingItemsList,
            total_bill: ProvigoTotalBill > 0 ? ProvigoTotalBill : null
        });
        if (ProvigoTotalBill != null && ProvigoTotalBill > 0 && ComparisonStores.includes(StoreIdObject.provigo)) {
            BillArray.push(ProvigoTotalBill);
        }
        // Walmart
        StoreModels.push({
            store_name: 'Walmart',
            store_id: StoreIdObject.walmart,
            available_item_price_list: WalmartAvailableItemsPrice,
            missing_item_list: WalmartMissingItemsList,
            total_bill: WalmartTotalBill > 0 ? WalmartTotalBill : null
        });
        if (WalmartTotalBill != null && WalmartTotalBill > 0 && ComparisonStores.includes(StoreIdObject.walmart)) {
            BillArray.push(WalmartTotalBill);
        }

        let MaximumBill: number = Math.max.apply(Math, BillArray);
        let MinimumBill: number = Math.min.apply(Math, BillArray);
        BillDifference = parseFloat((MaximumBill - MinimumBill).toFixed(2));
        if (MinimumBill > 0) {
            BillPercentageMaxToMin = Math.round(100 - ((MinimumBill * 100) / MaximumBill)).toString() + "%";
        }

        Response();
    };

    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            cartId: CartId,
            cartItemList: CartItemList,
            storeModels: StoreModels,
            optimizedItemList: OptimizedList,
            differenceHighestToLowest: BillDifference,
            differenceHighestToLowestPercentage: BillPercentageMaxToMin,
        });
    };

    /* Start */
    ValidationStep1();
});

app.post('/compareValidatedCart', ApiAuth, (req: Request, res: Response): any => {

    let Lang: any = (req.body.lang === '' || req.body.lang == null) ? 'en' : req.body.lang;
    let CartId = req.body.cart_id;
    let CartData: any = null;
    let CartItemsData: any = null;
    let CartItemList: any = [];
    let CartItemsTotal: number = 0;
    let Stores:any = '';
    let StoresToCompare: any = StoreIdsArray();
    let LastThursday: any = moment().startOf('week').add(-3, 'days');//.format("YYYY-MM-DD");
    let BillArray: any = [];
    let BillDifference: number = 0;
    let BillPercentageMaxToMin: string = "";
    let Price: any = null;
    let OptimizedList: any = {
        'cheapest_items': [],
        'total_bill': 0,
        'optimized_saving': 0
    };
    let OptimizedItemsList: any = [];
    let OptimizedListTotalBill:number = 0;
    let OptimizedListSaving:number = 0;
    let expensivePrice: any = null;
    let cheapestPrice: any = null;
    let cheapGroceryitem: any = null;
    let UniqueAisles: any = [];
    let AisleItemList: any = [];
    /* Stores */
    let StoreModels: any = [];

    let IgaItems: any = [];
    let IgaAvailableItemsPrice: any = [];
    let IgaMissingItemsList: any = [];
    let IgaTotalBill: number = 0;

    let SupercItems: any = [];
    let SupercAvailableItemsPrice: any = [];
    let SupercMissingItemsList: any = [];
    let SupercTotalBill: number = 0;

    let MaxiItems: any = [];
    let MaxiAvailableItemsPrice: any = [];
    let MaxiMissingItemsList: any = [];
    let MaxiTotalBill: number = 0;

    let MetroItems: any = [];
    let MetroAvailableItemsPrice: any = [];
    let MetroMissingItemsList: any = [];
    let MetroTotalBill: number = 0;

    let ProvigoItems: any = [];
    let ProvigoAvailableItemsPrice: any = [];
    let ProvigoMissingItemsList: any = [];
    let ProvigoTotalBill: number = 0;

    let WalmartItems: any = [];
    let WalmartAvailableItemsPrice: any = [];
    let WalmartMissingItemsList: any = [];
    let WalmartTotalBill: number = 0;
    /* Stores */

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Cart id', value: CartId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Get User Current Cart Data */
        await SelectQueryModule(dbCon, `carts A`, "A.*", `A.id = ? AND A.status <> ?`, null, null, null, [CartId, CartStatus.current]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'The selected cart id is invalid.');
                }
                CartData = Data.data;
                Stores = Data.data[0].stores_to_compare;
                FetchData();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let FetchData = async (): Promise<any> => {
        let condition = ` G.cart_id = ?`;
        let sqlForItems: string = JoinSqlStatementForCart(condition, Lang);
        await RunAnyQuery(sqlForItems, [CartId]).then((data: any) => {
            return ComputeJoinSqlDataForCart(data.data);
        }).then((data: any) => {
            let finalArray: any = removeKeysFromJoinData(data);
            CartItemsTotal = finalArray.length;
            for (let i in finalArray) {
                for (let j in finalArray[i].grocery_items) {
                    switch (finalArray[i]['grocery_items'][j].storeId) {
                        case StoreIdObject.iga:
                            IgaItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.superc:
                            SupercItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.maxi:
                            MaxiItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.metro:
                            MetroItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.provigo:
                            ProvigoItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.walmart:
                            WalmartItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        default:
                            break;
                    }
                }
            }
            CartItemsData = finalArray;
        }).then((data: any) => {
            CartProcess();
        });
    };

    let CartProcess = async (): Promise<any> => {
        let ComparisonStores: any = (Stores !== '' && Stores != null) ? Stores.split(',') : [];
        let Price: any = null;
        for (let a = 0; a < CartItemsData.length; a++) {
            let EGroceryItems: any = CartItemsData[a].grocery_items !== "" ? CartItemsData[a].grocery_items : [];
            let StoreIds: any = [];
            let StoreItemsIds: any = [];
            for (let b = 0; b < EGroceryItems.length; b++) {
                StoreIds.push(parseInt(EGroceryItems[b].storeId));
                StoreItemsIds.push(EGroceryItems[b].sku.toString());
            }
            // IGA
            if (StoreIds.includes(StoreIdObject.iga) && StoresToCompare.includes(StoreIdObject.iga)) {
                if (IgaItems.length > 0) {
                    let Key: number = StoreIds.indexOf(1);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                IgaMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Super C
            if (StoreIds.includes(StoreIdObject.superc) && StoresToCompare.includes(StoreIdObject.superc)) {
                if (SupercItems.length > 0) {
                    let Key: number = StoreIds.indexOf(2);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                SupercMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Maxi
            if (StoreIds.includes(StoreIdObject.maxi) && StoresToCompare.includes(StoreIdObject.maxi)) {
                if (MaxiItems.length > 0) {
                    let Key: number = StoreIds.indexOf(3);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                MaxiMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Metro
            if (StoreIds.includes(StoreIdObject.metro) && StoresToCompare.includes(StoreIdObject.metro)) {
                if (MetroItems.length > 0) {
                    let Key: number = StoreIds.indexOf(4);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                MetroMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Provigo
            if (StoreIds.includes(StoreIdObject.provigo) && StoresToCompare.includes(StoreIdObject.provigo)) {
                if (ProvigoItems.length > 0) {
                    let Key: number = StoreIds.indexOf(5);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                ProvigoMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Walmart
            if (StoreIds.includes(StoreIdObject.walmart) && StoresToCompare.includes(StoreIdObject.walmart)) {
                if (WalmartItems.length > 0) {
                    let Key: number = StoreIds.indexOf(6);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                WalmartMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Create Optimized list
            expensivePrice = null;
            cheapestPrice = null;
            cheapGroceryitem = null;
            for (let d = 0; d < EGroceryItems.length; d++) {
                if (ComparisonStores.includes(EGroceryItems[d].storeId.toString())) {
                    Price = GetPrice(EGroceryItems[d].regular_price, EGroceryItems[d].sale_price, CartItemsData[a].quantity);
                    if (cheapestPrice == null || Price < cheapestPrice) {
                        cheapestPrice = Price;
                        cheapGroceryitem = EGroceryItems[d];
                    }
                    if (expensivePrice == null || Price > expensivePrice) {
                        expensivePrice = Price;
                    }
                }
            }
            OptimizedListTotalBill += cheapestPrice;
            OptimizedListSaving += (expensivePrice - cheapestPrice);
            OptimizedItemsList.push(pushOptimisedList2(cheapGroceryitem, cheapestPrice, LastThursday, CartItemsData[a].eezly_item_id));
            // Remove grocery items from response
            delete CartItemsData[a].grocery_items;
        }

        OptimizedList['cheapest_items'] = OptimizedItemsList;
        OptimizedList['total_bill'] = OptimizedListTotalBill;
        OptimizedList['optimized_saving'] = OptimizedListSaving;

        /* Create cart item list */
        CartItemsData.forEach((item: any, index: number) => {
            if (UniqueAisles.indexOf(item.aisle_name) === -1) {
                UniqueAisles.push(item.aisle_name);
            }
        });
        UniqueAisles.forEach((item: any, index: number) => {
            AisleItemList = [];
            CartItemsData.forEach((c_item: any, c_index: number) => {
                if (item === c_item.aisle_name) {
                    AisleItemList.push(c_item);
                }
            });
            CartItemList.push({
                [item]: AisleItemList
            });
        });

        /* Set cart model */
        // IGA
        StoreModels.push({
            store_name: 'IGA',
            store_id: StoreIdObject.iga,
            available_item_price_list: IgaAvailableItemsPrice,
            missing_item_list: IgaMissingItemsList,
            total_bill: IgaTotalBill > 0 ? IgaTotalBill : null
        });
        if (IgaTotalBill != null && IgaTotalBill > 0 && ComparisonStores.includes(StoreIdObject.iga)) {
            BillArray.push(IgaTotalBill);
        }
        // Super C
        StoreModels.push({
            store_name: 'Super C',
            store_id: StoreIdObject.superc,
            available_item_price_list: SupercAvailableItemsPrice,
            missing_item_list: SupercMissingItemsList,
            total_bill: SupercTotalBill > 0 ? SupercTotalBill : null
        });
        if (SupercTotalBill != null && SupercTotalBill > 0 && ComparisonStores.includes(StoreIdObject.superc)) {
            BillArray.push(SupercTotalBill);
        }
        // Maxi
        StoreModels.push({
            store_name: 'Maxi',
            store_id: StoreIdObject.maxi,
            available_item_price_list: MaxiAvailableItemsPrice,
            missing_item_list: MaxiMissingItemsList,
            total_bill: MaxiTotalBill > 0 ? MaxiTotalBill : null
        });
        if (MaxiTotalBill != null && MaxiTotalBill > 0 && ComparisonStores.includes(StoreIdObject.maxi)) {
            BillArray.push(MaxiTotalBill);
        }
        // Metro
        StoreModels.push({
            store_name: 'Metro',
            store_id: StoreIdObject.metro,
            available_item_price_list: MetroAvailableItemsPrice,
            missing_item_list: MetroMissingItemsList,
            total_bill: MetroTotalBill > 0 ? MetroTotalBill : null
        });
        if (MetroTotalBill != null && MetroTotalBill > 0 && ComparisonStores.includes(StoreIdObject.metro)) {
            BillArray.push(MetroTotalBill);
        }
        // Provigo
        StoreModels.push({
            store_name: 'Provigo',
            store_id: StoreIdObject.provigo,
            available_item_price_list: ProvigoAvailableItemsPrice,
            missing_item_list: ProvigoMissingItemsList,
            total_bill: ProvigoTotalBill > 0 ? ProvigoTotalBill : null
        });
        if (ProvigoTotalBill != null && ProvigoTotalBill > 0 && ComparisonStores.includes(StoreIdObject.provigo)) {
            BillArray.push(ProvigoTotalBill);
        }
        // Walmart
        StoreModels.push({
            store_name: 'Walmart',
            store_id: StoreIdObject.walmart,
            available_item_price_list: WalmartAvailableItemsPrice,
            missing_item_list: WalmartMissingItemsList,
            total_bill: WalmartTotalBill > 0 ? WalmartTotalBill : null
        });
        if (WalmartTotalBill != null && WalmartTotalBill > 0 && ComparisonStores.includes(StoreIdObject.walmart)) {
            BillArray.push(WalmartTotalBill);
        }

        let MaximumBill: number = Math.max.apply(Math, BillArray);
        let MinimumBill: number = Math.min.apply(Math, BillArray);
        BillDifference = parseFloat((MaximumBill - MinimumBill).toFixed(2));
        if (MinimumBill > 0) {
            BillPercentageMaxToMin = Math.round(((MaximumBill * 100) / MinimumBill) - 100).toString() + "%";
        }
        UpdateCartStatusToValidated();
    };

    let UpdateCartStatusToValidated = async (): Promise<any> => {
        let sql = `UPDATE carts SET verification_date = ?, updated_at = ?, status = ? WHERE id = ?`;
        let values = [DBDateFormatModule(), DBDateFormatModule(), CartStatus.validate, CartData[0].id];
        await RunAnyQuery(sql, values).then((data: any) => {
            if (!data.status) {
                return GenerateErrorResponse(res, data.message);
            }
            Response();
        });
    };

    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            cartItemList: CartItemList,
            storeModels: StoreModels,
            optimizedItemList: OptimizedList,
            differenceHighestToLowest: BillDifference,
            differenceHighestToLowestPercentage: BillPercentageMaxToMin,
        });
    };

    /* Start */
    ValidationStep1();
});

app.post('/compareAdmin', ApiAuth, (req: Request, res: Response): any => {

    let User = req.body.user;
    let Lang: any = (req.body.lang === '' || req.body.lang == null) ? 'en' : req.body.lang;
    let CartId = req.body.cart_id;
    let CartData: any = null;
    let CartItemsData: any = null;
    let CartItemList: any = [];
    let Stores = '';
    let StoresToCompare: any = StoreIdsArray();
    let LastThursday: any = moment().startOf('week').add(-3, 'days');//.format("YYYY-MM-DD");
    let OptimizedList: any = {
        'cheapest_items': [],
        'total_bill': 0,
        'optimized_saving': 0
    };
    let OptimizedItemsList: any = [];
    let OptimizedListTotalBill:number = 0;
    let OptimizedListSaving:number = 0;
    let expensivePrice: any = null;
    let cheapestPrice: any = null;
    let cheapGroceryitem: any = null;
    let BillArray: any = [];
    let BillDifference: number = 0;
    let BillPercentageMaxToMin: string = "";
    let Price: any = null;
    let UniqueAisles: any = [];
    let AisleItemList: any = [];

    /* Stores */
    let StoreModels: any = [];

    let IgaItems: any = [];
    let IgaAvailableItemsPrice: any = [];
    let IgaMissingItemsList: any = [];
    let IgaTotalBill: number = 0;

    let SupercItems: any = [];
    let SupercAvailableItemsPrice: any = [];
    let SupercMissingItemsList: any = [];
    let SupercTotalBill: number = 0;

    let MaxiItems: any = [];
    let MaxiAvailableItemsPrice: any = [];
    let MaxiMissingItemsList: any = [];
    let MaxiTotalBill: number = 0;

    let MetroItems: any = [];
    let MetroAvailableItemsPrice: any = [];
    let MetroMissingItemsList: any = [];
    let MetroTotalBill: number = 0;

    let ProvigoItems: any = [];
    let ProvigoAvailableItemsPrice: any = [];
    let ProvigoMissingItemsList: any = [];
    let ProvigoTotalBill: number = 0;

    let WalmartItems: any = [];
    let WalmartAvailableItemsPrice: any = [];
    let WalmartMissingItemsList: any = [];
    let WalmartTotalBill: number = 0;
    /* Stores */

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        CheckPermissionModule(User.role_id, 'submit_user_cart').then((Data: any) => {
            if (Data.status) {
                ValidationStep1();
            } else {
                return GenerateBadRequestResponse(res, 'Permission denied');
            }
        });
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Cart id', value: CartId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for valid Cart Id */
        await SelectQueryModule(dbCon, `carts A`, "A.*", `A.id = ? AND A.status <> ?`, null, null, null, [CartId, CartStatus.current]).then((Data: any) => {
            if (Data.status) {
                if (Data.data.length === 0) {
                    return GenerateBadRequestResponse(res, 'The selected cart id is invalid.');
                }
                CartData = Data.data;
                Stores = Data.data[0].stores_to_compare;
                FetchDataNew();
            } else {
                return GenerateBadRequestResponse(res, Data.message);
            }
        });
    };

    let FetchDataNew = async (): Promise<any> => {
        let condition = ` G.cart_id = ?`;
        let sqlForItems: string = JoinSqlStatementForCart(condition, Lang);
        await RunAnyQuery(sqlForItems, [CartId]).then((data: any) => {
            return ComputeJoinSqlDataForCart(data.data);
        }).then((data: any) => {
            let finalArray: any = removeKeysFromJoinData(data);
            for (let i in finalArray) {
                for (let j in finalArray[i].grocery_items) {
                    switch (finalArray[i]['grocery_items'][j].storeId) {
                        case StoreIdObject.iga:
                            IgaItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.superc:
                            SupercItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.maxi:
                            MaxiItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.metro:
                            MetroItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.provigo:
                            ProvigoItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        case StoreIdObject.walmart:
                            WalmartItems.push(finalArray[i]['grocery_items'][j]);
                            break;
                        default:
                            break;
                    }
                }
            }
            CartItemsData = finalArray;
        }).then((data: any) => {
            CartProcess();
        });
    };

    let CartProcess = async (): Promise<any> => {
        let ComparisonStores: any = (Stores !== '' && Stores != null) ? Stores.split(',') : [];
        let Price: any = null;
        for (let a = 0; a < CartItemsData.length; a++) {
            let EGroceryItems: any = CartItemsData[a].grocery_items !== "" ? CartItemsData[a].grocery_items : [];
            let StoreIds: any = [];
            let StoreItemsIds: any = [];
            for (let b = 0; b < EGroceryItems.length; b++) {
                StoreIds.push(parseInt(EGroceryItems[b].storeId));
                StoreItemsIds.push(EGroceryItems[b].sku.toString());
            }
            // IGA
            if (StoreIds.includes(StoreIdObject.iga) && StoresToCompare.includes(StoreIdObject.iga)) {
                if (IgaItems.length > 0) {
                    let Key: number = StoreIds.indexOf(1);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                IgaMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Super C
            if (StoreIds.includes(StoreIdObject.superc) && StoresToCompare.includes(StoreIdObject.superc)) {
                if (SupercItems.length > 0) {
                    let Key: number = StoreIds.indexOf(2);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                SupercMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Maxi
            if (StoreIds.includes(StoreIdObject.maxi) && StoresToCompare.includes(StoreIdObject.maxi)) {
                if (MaxiItems.length > 0) {
                    let Key: number = StoreIds.indexOf(3);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                MaxiMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Metro
            if (StoreIds.includes(StoreIdObject.metro) && StoresToCompare.includes(StoreIdObject.metro)) {
                if (MetroItems.length > 0) {
                    let Key: number = StoreIds.indexOf(4);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                MetroMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Provigo
            if (StoreIds.includes(StoreIdObject.provigo) && StoresToCompare.includes(StoreIdObject.provigo)) {
                if (ProvigoItems.length > 0) {
                    let Key: number = StoreIds.indexOf(5);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                ProvigoMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Walmart
            if (StoreIds.includes(StoreIdObject.walmart) && StoresToCompare.includes(StoreIdObject.walmart)) {
                if (WalmartItems.length > 0) {
                    let Key: number = StoreIds.indexOf(6);
                    let ItemId: string = StoreItemsIds[Key];
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
            } else {
                WalmartMissingItemsList.push(CartItemsData[a].eezly_item_id);
            }
            // Create Optimized list
            expensivePrice = null;
            cheapestPrice = null;
            cheapGroceryitem = null;
            for (let d = 0; d < EGroceryItems.length; d++) {
                if (ComparisonStores.includes(EGroceryItems[d].storeId.toString())) {
                    Price = GetPrice(EGroceryItems[d].regular_price, EGroceryItems[d].sale_price, CartItemsData[a].quantity);
                    if (cheapestPrice == null || Price < cheapestPrice) {
                        cheapestPrice = Price;
                        cheapGroceryitem = EGroceryItems[d];
                    }
                    if (expensivePrice == null || Price > expensivePrice) {
                        expensivePrice = Price;
                    }
                }
            }
            OptimizedListTotalBill += cheapestPrice;
            OptimizedListSaving += (expensivePrice - cheapestPrice);
            OptimizedItemsList.push(pushOptimisedList2(cheapGroceryitem, cheapestPrice, LastThursday, CartItemsData[a].eezly_item_id));
            // Remove grocery items from response
            delete CartItemsData[a].grocery_items;
        }

        OptimizedList['cheapest_items'] = OptimizedItemsList;
        OptimizedList['total_bill'] = OptimizedListTotalBill;
        OptimizedList['optimized_saving'] = OptimizedListSaving;

        /* Create cart item list */
        CartItemsData.forEach((item: any, index: number) => {
            if (UniqueAisles.indexOf(item.aisle_name) === -1) {
                UniqueAisles.push(item.aisle_name);
            }
        });
        UniqueAisles.forEach((item: any, index: number) => {
            AisleItemList = [];
            CartItemsData.forEach((c_item: any, c_index: number) => {
                if (item === c_item.aisle_name) {
                    AisleItemList.push(c_item);
                }
            });
            CartItemList.push({
                [item]: AisleItemList
            });
        });

        /* Set cart model */
        // IGA
        StoreModels.push({
            store_name: 'IGA',
            store_id: StoreIdObject.iga,
            available_item_price_list: IgaAvailableItemsPrice,
            missing_item_list: IgaMissingItemsList,
            total_bill: IgaTotalBill > 0 ? IgaTotalBill : null
        });
        if (IgaTotalBill != null && IgaTotalBill > 0 && ComparisonStores.includes(StoreIdObject.iga)) {
            BillArray.push(IgaTotalBill);
        }
        // Super C
        StoreModels.push({
            store_name: 'Super C',
            store_id: StoreIdObject.superc,
            available_item_price_list: SupercAvailableItemsPrice,
            missing_item_list: SupercMissingItemsList,
            total_bill: SupercTotalBill > 0 ? SupercTotalBill : null
        });
        if (SupercTotalBill != null && SupercTotalBill > 0 && ComparisonStores.includes(StoreIdObject.superc)) {
            BillArray.push(SupercTotalBill);
        }
        // Maxi
        StoreModels.push({
            store_name: 'Maxi',
            store_id: StoreIdObject.maxi,
            available_item_price_list: MaxiAvailableItemsPrice,
            missing_item_list: MaxiMissingItemsList,
            total_bill: MaxiTotalBill > 0 ? MaxiTotalBill : null
        });
        if (MaxiTotalBill != null && MaxiTotalBill > 0 && ComparisonStores.includes(StoreIdObject.maxi)) {
            BillArray.push(MaxiTotalBill);
        }
        // Metro
        StoreModels.push({
            store_name: 'Metro',
            store_id: StoreIdObject.metro,
            available_item_price_list: MetroAvailableItemsPrice,
            missing_item_list: MetroMissingItemsList,
            total_bill: MetroTotalBill > 0 ? MetroTotalBill : null
        });
        if (MetroTotalBill != null && MetroTotalBill > 0 && ComparisonStores.includes(StoreIdObject.metro)) {
            BillArray.push(MetroTotalBill);
        }
        // Provigo
        StoreModels.push({
            store_name: 'Provigo',
            store_id: StoreIdObject.provigo,
            available_item_price_list: ProvigoAvailableItemsPrice,
            missing_item_list: ProvigoMissingItemsList,
            total_bill: ProvigoTotalBill > 0 ? ProvigoTotalBill : null
        });
        if (ProvigoTotalBill != null && ProvigoTotalBill > 0 && ComparisonStores.includes(StoreIdObject.provigo)) {
            BillArray.push(ProvigoTotalBill);
        }
        // Walmart
        StoreModels.push({
            store_name: 'Walmart',
            store_id: StoreIdObject.walmart,
            available_item_price_list: WalmartAvailableItemsPrice,
            missing_item_list: WalmartMissingItemsList,
            total_bill: WalmartTotalBill > 0 ? WalmartTotalBill : null
        });
        if (WalmartTotalBill != null && WalmartTotalBill > 0 && ComparisonStores.includes(StoreIdObject.walmart)) {
            BillArray.push(WalmartTotalBill);
        }

        let MaximumBill: number = Math.max.apply(Math, BillArray);
        let MinimumBill: number = Math.min.apply(Math, BillArray);
        BillDifference = parseFloat((MaximumBill - MinimumBill).toFixed(2));
        if (MinimumBill > 0) {
            BillPercentageMaxToMin = Math.round(100 - ((MinimumBill * 100) / MaximumBill)).toString() + "%";
        }
        Response();
    };

    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            cartItemList: CartItemList,
            storeModels: StoreModels,
            optimizedItemList: OptimizedList,
            differenceHighestToLowest: BillDifference,
            differenceHighestToLowestPercentage: BillPercentageMaxToMin,
        });
    };

    /* Start */
    CheckRolePermission();
});

// Calculate Price
function GetPrice(regular_price: any, sale_price: any, quantity: number): any {
    let price: any = null;
    if (regular_price !== '' && parseFloat(regular_price) > 0) {
        // condition when regular price is available
        if (sale_price !== '' && parseFloat(sale_price) > 0 && parseFloat(sale_price) < parseFloat(regular_price)) {
            price = sale_price;
        } else {
            price = regular_price;
        }
    } else {
        // condition when regular price is 0
        if (sale_price !== '' && parseFloat(sale_price) > 0) {
            price = sale_price;
        } else {
            price = null;
        }
    }
    return (price !== '' && price != null) ? price * quantity : price;
}

function pushStoreAvailabilityData(CartItemsData: any, StoreItems: any, LastThursday: any) {
    let OutDatedStatus = moment(StoreItems.updated_at) < LastThursday;
    let Price = GetPrice(StoreItems.regular_price, StoreItems.sale_price, CartItemsData.quantity);
    return (
        {
            eezly_item_id: CartItemsData.eezly_item_id,
            store_item_id: StoreItems.sku,
            regular_price: parseFloat(StoreItems.regular_price) * CartItemsData.quantity,
            sale_price: parseFloat(StoreItems.sale_price) * CartItemsData.quantity,
            price: (Price !== '' && Price != null) ? parseFloat(Price) : Price,
            outdated_status: OutDatedStatus,
        }
    )
}

function pushNoLoginStoreAvailabilityData(CartItemsData: any, StoreItems: any, LastThursday: any) {
    let OutDatedStatus = moment(StoreItems.updated_at) < LastThursday;
    let Price = GetPrice(StoreItems.regular_price, StoreItems.sale_price, CartItemsData.quantity);
    return (
        {
            eezly_item_id: CartItemsData.eezly_item_id,
            store_item_id: StoreItems.sku,
            regular_price: StoreItems.regular_price,
            sale_price: StoreItems.sale_price,
            price: Price,
            outdated_status: OutDatedStatus,
        }
    )
}

function pushOptimisedList(storeName: any, storeId: any, itemAvailable: any, LastThursday: any) {
    let OutDatedStatus = moment(itemAvailable.updated_at) < LastThursday;
    return (
        {
            store_name: storeName,
            store_id: storeId,
            eezly_item_id: itemAvailable[0].eezly_item_id,
            store_item_id: itemAvailable[0].store_item_id,
            regular_price: itemAvailable[0].regular_price,
            sale_price: itemAvailable[0].sale_price,
            price: itemAvailable[0].price,
            outdated_status: OutDatedStatus,
        }
    );
}

function pushOptimisedList2(cheapItem: any, price: number, LastThursday: any, eezlyItemId: any) {
    let OutDatedStatus = moment(cheapItem.updated_at) < LastThursday;
    return (
        {
            store_name: cheapItem.store_name,
            store_id: cheapItem.storeId,
            eezly_item_id: eezlyItemId,
            store_item_id: cheapItem.store_id,
            regular_price: parseFloat(cheapItem.regular_price),
            sale_price: parseFloat(cheapItem.sale_price),
            price: price,
            outdated_status: OutDatedStatus,
        }
    );
}

function returnSubArray(element: any) {
    return {
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
}

function getSkus(CartItemsData: any) {
    var temp;
    var e;
    var skus: any = [];
    for (let i = 0; i < CartItemsData.length; i++) {
        temp = JSON.parse(CartItemsData[i]['grocery_items']);
        for (e = 0; e < temp.length; e++) {
            skus.push(temp[e].store_item);
        }
    }
    return skus;
}

function getCartItemArray(data: any, CartItemsData: any) {
    var GroceryItems: any = [];
    data.forEach((element: any, index: any) => {
        for (let a = 0; a < CartItemsData.length; a++) {
            if (CartItemsData[a].raw_grocery_items !== null && CartItemsData[a].raw_grocery_items !== "") {
                let EGroceryItems = JSON.parse(CartItemsData[a].raw_grocery_items);
                for (let i = 0; i < EGroceryItems.length; i++) {

                    let SubArray: any = {
                        store_id: EGroceryItems[i].store_id,
                        store_name: EGroceryItems[i].store_name
                    };
                    if (element.sku === EGroceryItems[i].store_item) {
                        SubArray["item_details"] = returnSubArray(element);
                        GroceryItems.push(SubArray);
                    }

                }
                if (GroceryItems.length > 0) {
                    CartItemsData[a].grocery_items = GroceryItems;
                }
                GroceryItems = [];
            }
        }
    })
    return CartItemsData;
}

module.exports = app;
