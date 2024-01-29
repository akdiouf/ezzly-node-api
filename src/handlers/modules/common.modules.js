"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreTableNameObject = exports.StoreIdObject = exports.StoreNameObject = exports.StoreNamesArray = exports.capitalizeFirstLetter = exports.GenerateSuccessResponseWithData = exports.GenerateSuccessResponse = exports.GenerateErrorResponse = exports.GenerateForbiddenErrorResponse = exports.GenerateBadGatewayResponse = exports.GenerateUnauthorizedResponse = exports.GenerateBadRequestResponse = exports.GetGeneralSettings = exports.PaginationModule = exports.CheckPermissionModule = exports.RandomNumberModule = exports.DBDateFormatModule = void 0;
const db_modules_1 = require("./db.modules");
const http_status_codes_1 = require("http-status-codes");
let DBDateFormatModule = () => {
    const dateObject = new Date();
    const date = dateObject.getDate() < 10 ? "0" + dateObject.getDate() : dateObject.getDate();
    const month = (dateObject.getMonth() + 1) < 10 ? "0" + (dateObject.getMonth() + 1) : (dateObject.getMonth() + 1);
    const year = dateObject.getFullYear();
    const hours = dateObject.getHours() < 10 ? "0" + dateObject.getHours() : dateObject.getHours();
    const minutes = dateObject.getMinutes() < 10 ? "0" + dateObject.getMinutes() : dateObject.getMinutes();
    const seconds = dateObject.getSeconds() < 10 ? "0" + dateObject.getSeconds() : dateObject.getSeconds();
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
};
exports.DBDateFormatModule = DBDateFormatModule;
let RandomNumberModule = (Min, Max) => {
    return Math.round(Math.random() * (Max - Min) + Min);
};
exports.RandomNumberModule = RandomNumberModule;
let CheckPermissionModule = (Role, Permission) => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT COUNT(*) AS Total FROM permissions WHERE permission = '${Permission}' AND (FIND_IN_SET('${Role}', roles) > 0)`;
        db_modules_1.dbCon.query(sql, (err, result) => {
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
exports.CheckPermissionModule = CheckPermissionModule;
let PaginationModule = (req, RequestUrl, Page, NoOfRecords, TotalRecords) => {
    let TotalPages = Math.ceil(TotalRecords / NoOfRecords);
    if (TotalPages === 0) {
        TotalPages = 1;
    }
    let From = 0;
    let To = 0;
    let Links = [];
    let FirstPageUrl = "";
    let PreviousPageUrl = "";
    let NextPageUrl = "";
    let LastPageUrl = "";
    let LastPage = TotalPages;
    Links.push({
        url: null,
        label: "&laquo; Previous",
        active: false
    });
    for (let i = 1; i <= TotalPages; i++) {
        (TotalPages === i) ? LastPageUrl = RequestUrl + "?page=" + i : LastPageUrl = null;
        if (i === Page) {
            Links.push({
                url: RequestUrl + "?page=" + i,
                label: i.toString(),
                active: true
            });
        }
        else {
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
    }
    else {
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
exports.PaginationModule = PaginationModule;
let GetGeneralSettings = () => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM settings WHERE id = 1`;
        db_modules_1.dbCon.query(sql, (err, data) => {
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
exports.GetGeneralSettings = GetGeneralSettings;
let GenerateBadRequestResponse = (response, data) => {
    return response.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
        status: false,
        message: data
    });
};
exports.GenerateBadRequestResponse = GenerateBadRequestResponse;
let GenerateUnauthorizedResponse = (response, data) => {
    return response.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: data
    });
};
exports.GenerateUnauthorizedResponse = GenerateUnauthorizedResponse;
let GenerateBadGatewayResponse = (response, data) => {
    return response.status(http_status_codes_1.StatusCodes.BAD_GATEWAY).json({
        status: false,
        message: data
    });
};
exports.GenerateBadGatewayResponse = GenerateBadGatewayResponse;
let GenerateForbiddenErrorResponse = (response, data) => {
    return response.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
        status: false,
        message: data
    });
};
exports.GenerateForbiddenErrorResponse = GenerateForbiddenErrorResponse;
let GenerateErrorResponse = (response, data) => {
    return response.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: data
    });
};
exports.GenerateErrorResponse = GenerateErrorResponse;
let GenerateSuccessResponse = (response, data) => {
    return response.status(http_status_codes_1.StatusCodes.OK).json({
        status: true,
        message: data
    });
};
exports.GenerateSuccessResponse = GenerateSuccessResponse;
let GenerateSuccessResponseWithData = (response, data) => {
    return response.status(http_status_codes_1.StatusCodes.OK).json({
        status: true,
        data: data
    });
};
exports.GenerateSuccessResponseWithData = GenerateSuccessResponseWithData;
let capitalizeFirstLetter = (sentence) => {
    if (!sentence)
        return sentence;
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};
exports.capitalizeFirstLetter = capitalizeFirstLetter;
let StoreNamesArray = () => {
    return ['iga_items', 'superc_items', 'maxi_items', 'metro_items', 'provigo_items', 'walmart_items'];
};
exports.StoreNamesArray = StoreNamesArray;
exports.StoreNameObject = {
    iga: "iga",
    superc: "superc",
    maxi: "maxi",
    metro: "metro",
    provigo: "provigo",
    walmart: "walmart"
};
exports.StoreIdObject = {
    iga: 1,
    superc: 2,
    maxi: 3,
    metro: 4,
    provigo: 5,
    walmart: 6
};
exports.StoreTableNameObject = {
    iga: "iga_items",
    superc: "superc_items",
    maxi: "maxi_items",
    metro: "metro_items",
    provigo: "provigo_items",
    walmart: "walmart_items"
};
exports.default = {
    DBDateFormatModule: exports.DBDateFormatModule,
    RandomNumberModule: exports.RandomNumberModule,
    CheckPermissionModule: exports.CheckPermissionModule,
    PaginationModule: exports.PaginationModule,
    GetGeneralSettings: exports.GetGeneralSettings,
    GenerateBadRequestResponse: exports.GenerateBadRequestResponse,
    GenerateUnauthorizedResponse: exports.GenerateUnauthorizedResponse,
    GenerateBadGatewayResponse: exports.GenerateBadGatewayResponse,
    GenerateForbiddenErrorResponse: exports.GenerateForbiddenErrorResponse,
    GenerateErrorResponse: exports.GenerateErrorResponse,
    GenerateSuccessResponse: exports.GenerateSuccessResponse,
    StoreNamesArray: exports.StoreNamesArray,
    capitalizeFirstLetter: exports.capitalizeFirstLetter,
    StoreNameObject: exports.StoreNameObject,
    StoreIdObject: exports.StoreIdObject,
    StoreTableNameObject: exports.StoreTableNameObject
};
