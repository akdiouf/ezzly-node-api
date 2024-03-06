import { RunAnyQuery } from "./crud.modules";
import { dbCon } from "./db.modules";
import { StatusCodes } from 'http-status-codes';

export let DBDateFormatModule = (): string => {
    const dateObject = new Date();
    const date = dateObject.getDate() < 10 ? "0" + dateObject.getDate() : dateObject.getDate();
    const month = (dateObject.getMonth() + 1) < 10 ? "0" + (dateObject.getMonth() + 1) : (dateObject.getMonth() + 1);
    const year = dateObject.getFullYear();
    const hours = dateObject.getHours() < 10 ? "0" + dateObject.getHours() : dateObject.getHours();
    const minutes = dateObject.getMinutes() < 10 ? "0" + dateObject.getMinutes() : dateObject.getMinutes();
    const seconds = dateObject.getSeconds() < 10 ? "0" + dateObject.getSeconds() : dateObject.getSeconds();
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
};

export let RandomNumberModule = (Min: number, Max: number): number => {
    return Math.round(Math.random() * (Max - Min) + Min);
};

export let CheckPermissionModule = (Role: number, Permission: string): any => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT COUNT(*) AS Total FROM permissions WHERE permission = '${Permission}' AND (FIND_IN_SET('${Role}', roles) > 0)`;
        dbCon.query(sql, (err: Error, result: any) => {
            if (err) {
                resolve({
                    status: false
                });
            }
            resolve({
                status: result[0].Total > 0
            });
        });
    });
};

export let PaginationModule = (req: any, RequestUrl: string, Page: number, NoOfRecords: number, TotalRecords: number): any => {
    let TotalPages = Math.ceil(TotalRecords / NoOfRecords);
    if (TotalPages === 0) {
        TotalPages = 1;
    }
    let From: any = 0;
    let To: any = 0;
    let Links = [];
    let FirstPageUrl: any = "";
    let PreviousPageUrl: any = "";
    let NextPageUrl: any = "";
    let LastPageUrl: any = "";
    let LastPage: any = TotalPages;
    Links.push({
        url: null,
        label: "&laquo; Previous",
        active: false
    });
    for (let i: number = 1; i <= TotalPages; i++) {
        (TotalPages === i) ? LastPageUrl = RequestUrl + "?page=" + i : LastPageUrl = null;
        if (i === Page) {
            Links.push({
                url: RequestUrl + "?page=" + i,
                label: i.toString(),
                active: true
            });
        } else {
            Links.push({
                url: RequestUrl + "?page=" + i,
                label: i.toString(),
                active: false
            });
        }
    }
    FirstPageUrl = RequestUrl + "?page=1";
    (Page - 1 === 0) ? PreviousPageUrl = null : PreviousPageUrl = RequestUrl + "?page=" + (Page - 1);
    (Page === TotalPages) ? NextPageUrl = null : NextPageUrl = RequestUrl + "?page=" + (Page + 1);
    Links.push({
        url: NextPageUrl,
        label: "Next &raquo;",
        active: false
    });
    From = ((Page - 1) * NoOfRecords) + 1;
    if (NoOfRecords < TotalRecords) {
        To = NoOfRecords * Page;
        if (To > TotalRecords) {
            To = TotalRecords;
        }
    } else {
        To = TotalRecords;
    }
    if (TotalRecords === 0) {
        From = null;
        To = null;
        PreviousPageUrl = null;
        NextPageUrl = null;
        LastPageUrl = FirstPageUrl;
        LastPage = 1;
    }
    return {
        status: null,
        current_page: Page,
        data: null,
        first_page_url: FirstPageUrl,
        from: From,
        last_page: LastPage,
        last_page_url: LastPageUrl,
        links: Links,
        next_page_url: NextPageUrl,
        path: RequestUrl,
        per_page: NoOfRecords,
        prev_page_url: PreviousPageUrl,
        to: To,
        total: TotalRecords
    };
};

export let GetGeneralSettings = (): any => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM settings WHERE id = 1`;
        dbCon.query(sql, (err: Error, data: any) => {
            if (err) {
                resolve({
                    status: false,
                    message: err.message
                });
            }
            resolve({
                status: true,
                data: data
            });
        });
    });
};

// export let GetJoinAllData

export let GenerateBadRequestResponse = (response: any, data: string): any => {
    return response.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: data
    });
};

export let GenerateUnauthorizedResponse = (response: any, data: string): any => {
    return response.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: data
    });
};

export let GenerateBadGatewayResponse = (response: any, data: string): any => {
    return response.status(StatusCodes.BAD_GATEWAY).json({
        status: false,
        message: data
    });
};

export let GenerateForbiddenErrorResponse = (response: any, data: string): any => {
    return response.status(StatusCodes.FORBIDDEN).json({
        status: false,
        message: data
    });
};

export let GenerateErrorResponse = (response: any, data: any): any => {
    return response.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: data
    });
};

export let GenerateSuccessResponse = (response: any, data: any): any => {
    return response.status(StatusCodes.OK).json({
        status: true,
        message: data
    });
};

export let GenerateSuccessResponseWithData = (response: any, data: any): any => {
    return response.status(StatusCodes.OK).json({
        status: true,
        data: data
    });
};

export let capitalizeFirstLetter = (sentence: string) => {
    if (!sentence) return sentence;
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};

export let StoreIdsArray = (): number[] => {
    return [1, 2, 3, 4, 5, 6];
};

export let StoreNamesArray = () => {
    return ['iga_items', 'superc_items', 'maxi_items', 'metro_items', 'provigo_items', 'walmart_items'];
};

export let GetStroesFromDb = async () => {
    let sqlForItems = `select id,name from stores`;
    let storesReturn = await RunAnyQuery(sqlForItems, []).then((data: any) => {
        let ids: Array<any> = [];
        for (let id in data.data) {
            ids[data.data[id].id] = data.data[id].name;
        }
        return ids
    })
    return storesReturn;
}

export let StoreNamesArrayWithIds: any = ['iga_items', 'superc_items', 'maxi_items', 'metro_items', 'provigo_items', 'walmart_items'];

export let JoinSqlStatement = (conditions: any, page: any = null) => {
    conditions = conditions != null ? `where ${conditions}` : "";
    let storeSelect = `C.storeId as storeId, C.aisle as s_aisle, C.category as s_category, C.subCategory as s_subCategory, C.sku as s_sku, C.name as s_name , C.french_name as s_french_name, C.brand as s_brand, C.regular_price as s_regular_price, C.sale_price as s_sale_price, C.image as s_image, C.url as s_url , C.size_label as s_size_label, C.size as s_size,C.updated_at as s_updated_at`;
    let cartItems = (page == 'cart') ? `,G.cart_id , G.quantity ` : ``;
    let cartJoin = (page == 'cart') ? ` LEFT JOIN cart_details as G on G.eezly_item_id = A.eezly_item_id ` : ``;
    let sqlForItems = `select A.id,A.store_item_id,A.eezly_item_id,B.*,${storeSelect},D.fullName as created_by,F.fullName as updated_by ,E.Name as aisle_name ${cartItems} `
    sqlForItems += ` from eezly_items_grocery_items_list as A `;
    sqlForItems += `LEFT JOIN eezly_items as B on A.eezly_item_id = B.id`;
    sqlForItems += ` LEFT JOIN stores_items as C on A.store_item_id = C.id `;
    sqlForItems += ` LEFT JOIN users as D on B.created_by = D.id `;
    sqlForItems += ` LEFT JOIN eezly_aisles as E on B.eezly_aisle_id = E.id `;
    sqlForItems += ` LEFT JOIN users as F on B.updated_by = F.id `;
    sqlForItems += ` ${cartJoin} `
    sqlForItems += ` ${conditions} `;
    return sqlForItems;
}

export let JoinSqlStatementForCart = (conditions: any, lang: string) => {
    conditions = conditions != null ? `where ${conditions}` : "";

    let storeSelect = `C.storeId as storeId, C.aisle as s_aisle, C.category as s_category, C.subCategory as s_subCategory, C.sku as s_sku, C.name as s_name , C.french_name as s_french_name, C.brand as s_brand, C.regular_price as s_regular_price, C.sale_price as s_sale_price, C.image as s_image, C.url as s_url , C.size_label as s_size_label, C.size as s_size,C.updated_at as s_updated_at`;
    let eezlyItemSelect = `G.eezly_item_id,
                CASE
                    WHEN '${lang}' = 'en' THEN B.name
                    WHEN '${lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                END AS name, G.quantity, B.thumbnail, B.brand, B.size,
                CASE
                    WHEN '${lang}' = 'en' THEN E.name
                    WHEN '${lang}' = 'fr' THEN COALESCE(E.name_fr, E.name)
                END AS aisle_name, B.grocery_items`;
    let sqlForItems = `select  A.id,A.store_item_id,A.eezly_item_id,${eezlyItemSelect},${storeSelect},D.fullName as created_by,F.fullName as updated_by ,E.Name as aisle_name `
    sqlForItems += ` From cart_details G `
    sqlForItems += ` LEFT JOIN eezly_items_grocery_items_list as A on A.eezly_item_id = G.eezly_item_id `;
    sqlForItems += ` LEFT JOIN eezly_items as B on A.eezly_item_id = B.id`;
    sqlForItems += ` LEFT JOIN stores_items as C on A.store_item_id = C.id `;
    sqlForItems += ` LEFT JOIN users as D on B.created_by = D.id `;
    sqlForItems += ` LEFT JOIN eezly_aisles as E on B.eezly_aisle_id = E.id `;
    sqlForItems += ` LEFT JOIN users as F on B.updated_by = F.id `;
    sqlForItems += ` ${conditions} `;
    return sqlForItems;
}

export let JoinSqlStatementForCartWithoutLogin = (conditions: any, lang: string) => {
    conditions = conditions != null ? `where ${conditions}` : "";

    let storeSelect = `C.storeId as storeId, C.aisle as s_aisle, C.category as s_category, C.subCategory as s_subCategory, C.sku as s_sku, C.name as s_name , C.french_name as s_french_name, C.brand as s_brand, C.regular_price as s_regular_price, C.sale_price as s_sale_price, C.image as s_image, C.url as s_url , C.size_label as s_size_label, C.size as s_size,C.updated_at as s_updated_at`;
    let eezlyItemSelectNew = `B.id, B.id as eezly_item_id,
                CASE
                    WHEN '${lang}' = 'en' THEN B.name
                    WHEN '${lang}' = 'fr' THEN COALESCE(B.name_fr, B.name)
                END AS name, B.thumbnail, B.brand, B.size,
                CASE
                    WHEN '${lang}' = 'en' THEN E.name
                    WHEN '${lang}' = 'fr' THEN COALESCE(E.name_fr, E.name)
                END AS aisle_name,B.grocery_items`;
    let sqlForItems = `select  A.id,A.store_item_id,A.eezly_item_id,${eezlyItemSelectNew},${storeSelect},D.fullName as created_by,F.fullName as updated_by ,E.Name as aisle_name `
    sqlForItems += ` From eezly_items_grocery_items_list as A `
    // sqlForItems += ` LEFT JOIN eezly_items_grocery_items_list as A on A.eezly_item_id = G.eezly_item_id `;
    sqlForItems += ` LEFT JOIN eezly_items as B on A.eezly_item_id = B.id`;
    sqlForItems += ` LEFT JOIN stores_items as C on A.store_item_id = C.id `;
    sqlForItems += ` LEFT JOIN users as D on B.created_by = D.id `;
    sqlForItems += ` LEFT JOIN eezly_aisles as E on B.eezly_aisle_id = E.id `;
    sqlForItems += ` LEFT JOIN users as F on B.updated_by = F.id `;
    sqlForItems += ` ${conditions} `;
    return sqlForItems;
}

export let EezlyGetItemsIds = async (pageNumber: any, noOfRecords: any, conditions: any, values: any[]) => {
    pageNumber = pageNumber != null ? pageNumber = pageNumber : 1;
    let start: any = (pageNumber - 1) * noOfRecords;
    conditions = conditions != null ? `where ${conditions}` : "";
    let sqlForItems = `select id from eezly_items`
    sqlForItems += ` ${conditions} `;
    sqlForItems += ` limit ${start},${noOfRecords} `;
    let conditionReturn = await RunAnyQuery(sqlForItems, values).then((data: any) => {
        let ids: any = [];
        for (let id in data.data) {
            ids.push(data.data[id].id)
        }
        return ids;
    }).then((inConditions: any) => {
        return inConditions;
    })
    return conditionReturn;
}

export let ComputeJoinSqlData = async (data: any) => {
    const EGroceryItems = data;
    const newArray: any = {};
    let storesArrays = await GetStroesFromDb();
    if (storesArrays) {

        for (let i = 0; i < EGroceryItems.length; i++) {
            EGroceryItems[i].id = EGroceryItems[i].eezly_item_id;
            let SubArray: any = {
                storeId: EGroceryItems[i].storeId,
                store_id: EGroceryItems[i].store_item_id,
                store_name: storesArrays[EGroceryItems[i].storeId]
            };
            SubArray["item_details"] = {
                id: EGroceryItems[i].store_item_id,
                category: EGroceryItems[i].s_category,
                aisle: EGroceryItems[i].s_aisle,
                subCategory: EGroceryItems[i].s_subCategory,
                sku: EGroceryItems[i].s_sku,
                name: EGroceryItems[i].s_name,
                french_name: EGroceryItems[i].s_french_name,
                brand: EGroceryItems[i].s_brand,
                regular_price: EGroceryItems[i].s_regular_price,
                sale_price: EGroceryItems[i].s_sale_price,
                image: EGroceryItems[i].s_image,
                url: EGroceryItems[i].s_url,
                size_label: EGroceryItems[i].s_size_label,
                size: EGroceryItems[i].s_size,
                updated_at: EGroceryItems[i].s_updated_at
            };
            //EGroceryItems[i].s_updated_at ? SubArray["item_details"].s_updated_at = EGroceryItems[i].s_updated_at : null;
            EGroceryItems[i].grocery_items = [SubArray];
            delete EGroceryItems[i].storeId;
            delete EGroceryItems[i].s_category;
            delete EGroceryItems[i].s_aisle;
            delete EGroceryItems[i].s_subCategory;
            delete EGroceryItems[i].s_sku;
            delete EGroceryItems[i].s_name;
            delete EGroceryItems[i].s_french_name;
            delete EGroceryItems[i].s_brand;
            delete EGroceryItems[i].s_regular_price;
            delete EGroceryItems[i].s_sale_price;
            delete EGroceryItems[i].s_image;
            delete EGroceryItems[i].s_url;
            delete EGroceryItems[i].s_size_label;
            delete EGroceryItems[i].s_size;
            delete EGroceryItems[i].s_updated_at
            if (newArray[EGroceryItems[i].eezly_item_id]) {
                let temp: any = [];
                let length = newArray[EGroceryItems[i].eezly_item_id].grocery_items.length;
                for (let j = 0; j < length; j++) {
                    temp.push(newArray[EGroceryItems[i].eezly_item_id].grocery_items[j]);
                }
                temp.push(EGroceryItems[i].grocery_items[0]);
                newArray[EGroceryItems[i].eezly_item_id].grocery_items = temp;
            } else {
                newArray[EGroceryItems[i].eezly_item_id] = EGroceryItems[i];
            }
        }
    }
    return newArray;
}

export let ComputeJoinSqlDataForCart = async (data: any) => {
    const EGroceryItems = data;
    const newArray: any = {};
    let storesArrays = await GetStroesFromDb();
    if (storesArrays) {
        for (let i = 0; i < EGroceryItems.length; i++) {
            EGroceryItems[i].id = EGroceryItems[i].eezly_item_id;
            let SubArray: any = {
                storeId: EGroceryItems[i].storeId,
                store_id: EGroceryItems[i].store_item_id,
                store_name: storesArrays[EGroceryItems[i].storeId],
                category: EGroceryItems[i].s_category,
                aisle: EGroceryItems[i].s_aisle,
                subCategory: EGroceryItems[i].s_subCategory,
                sku: EGroceryItems[i].s_sku,
                name: EGroceryItems[i].s_name,
                french_name: EGroceryItems[i].s_french_name,
                brand: EGroceryItems[i].s_brand,
                regular_price: EGroceryItems[i].s_regular_price,
                sale_price: EGroceryItems[i].s_sale_price,
                image: EGroceryItems[i].s_image,
                url: EGroceryItems[i].s_url,
                size_label: EGroceryItems[i].s_size_label,
                size: EGroceryItems[i].s_size,
                updated_at: EGroceryItems[i].s_updated_at
            }
            //EGroceryItems[i].s_updated_at ? SubArray["item_details"].s_updated_at = EGroceryItems[i].s_updated_at : null;
            EGroceryItems[i].grocery_items = [SubArray];
            delete EGroceryItems[i].storeId;
            delete EGroceryItems[i].s_category;
            delete EGroceryItems[i].s_aisle;
            delete EGroceryItems[i].s_subCategory;
            delete EGroceryItems[i].s_sku;
            delete EGroceryItems[i].s_name;
            delete EGroceryItems[i].s_french_name;
            delete EGroceryItems[i].s_brand;
            delete EGroceryItems[i].s_regular_price;
            delete EGroceryItems[i].s_sale_price;
            delete EGroceryItems[i].s_image;
            delete EGroceryItems[i].s_url;
            delete EGroceryItems[i].s_size_label;
            delete EGroceryItems[i].s_size;
            delete EGroceryItems[i].s_updated_at
            delete EGroceryItems[i].description;
            delete EGroceryItems[i].description_fr;
            delete EGroceryItems[i].ingredients;
            delete EGroceryItems[i].ingredients_fr;
            delete EGroceryItems[i].nutritional_info;
            delete EGroceryItems[i].nutritional_info_fr;
            delete EGroceryItems[i].photos;
            delete EGroceryItems[i].listed;
            delete EGroceryItems[i].consolidated_date;
            delete EGroceryItems[i].created_by;
            delete EGroceryItems[i].updated_by;
            delete EGroceryItems[i].deleted_at;
            if (newArray[EGroceryItems[i].eezly_item_id]) {
                let temp: any = [];
                let length = newArray[EGroceryItems[i].eezly_item_id].grocery_items.length;
                for (let j = 0; j < length; j++) {
                    temp.push(newArray[EGroceryItems[i].eezly_item_id].grocery_items[j]);
                }
                temp.push(EGroceryItems[i].grocery_items[0]);
                newArray[EGroceryItems[i].eezly_item_id].grocery_items = temp;
            } else {
                newArray[EGroceryItems[i].eezly_item_id] = EGroceryItems[i];
            }
        }
    }
    return newArray;
}

export let removeKeysFromJoinData = (data: any) => {
    let finalArray: any = [];
    Object.keys(data).forEach((key: any) => {
        finalArray.push(data[key])
    })
    return finalArray;
}

export let multiDimensionalUniqueStoreArray = (arr: any) => {
    var uniques: any = [];
    var itemsFound: any = {};
    for (var i = 0, l = arr.length; i < l; i++) {
        var stringified = JSON.stringify(arr[i]);
        var storeid = arr[i]['store_id'];
        if (itemsFound[storeid]) { continue; }
        uniques.push(arr[i]);
        itemsFound[storeid] = true;
    }
    return uniques;
}

export let StoreNameObject: any = {
    iga: "iga",
    superc: "superc",
    maxi: "maxi",
    metro: "metro",
    provigo: "provigo",
    walmart: "walmart"
};

export let StoreIdObject: any = {
    iga: 1,
    superc: 2,
    maxi: 3,
    metro: 4,
    provigo: 5,
    walmart: 6
};

export let StoreTableNameObject: any = {
    iga: "iga_items",
    superc: "superc_items",
    maxi: "maxi_items",
    metro: "metro_items",
    provigo: "provigo_items",
    walmart: "walmart_items"
};

export let CartStatus: any = {
    current: 1,
    submit: 2,
    validate: 3
};

export default {
    DBDateFormatModule,
    RandomNumberModule,
    CheckPermissionModule,
    PaginationModule,
    GetGeneralSettings,
    GenerateBadRequestResponse,
    GenerateUnauthorizedResponse,
    GenerateBadGatewayResponse,
    GenerateForbiddenErrorResponse,
    GenerateErrorResponse,
    GenerateSuccessResponse,
    StoreNamesArray,
    capitalizeFirstLetter,
    StoreIdsArray,
    multiDimensionalUniqueStoreArray,
    EezlyGetItemsIds,
    StoreNameObject,
    StoreIdObject,
    StoreTableNameObject,
    CartStatus
};