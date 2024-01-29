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
const db_modules_1 = require("../../modules/db.modules");
const common_modules_1 = require("../../modules/common.modules");
const http_status_codes_1 = require("http-status-codes");
const validator_modules_1 = require("../../modules/validator.modules");
const crud_modules_1 = require("../../modules/crud.modules");
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
const ApiAuth = require("../../lib/auth");
app.post("/create", ApiAuth, (req, res) => {
    let User = req.body.user;
    let Name = req.body.name;
    let Thumbnail = req.body.thumbnail;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_store');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Name', value: Name, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for Unique Name */
        let checkUniqueName = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'stores', '*', `name = '${Name}' AND deleted_at IS NULL`, null, null, null);
        if (checkUniqueName.status) {
            if (checkUniqueName.data.length > 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Name must be unique');
            }
            StoreData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, checkUniqueName.message);
        }
    });
    let StoreData = () => __awaiter(void 0, void 0, void 0, function* () {
        Thumbnail = (Thumbnail === '' || Thumbnail == null) ? '' : Thumbnail;
        let sql = `INSERT INTO stores (name, thumbnail, created_by, created_at) VALUE ('${Name}','${Thumbnail}', '${User.user_id}', '${(0, common_modules_1.DBDateFormatModule)()}')`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Store created successfully');
    };
    /* Start */
    CheckRolePermission();
});
app.get("/", (req, res) => {
    let User = req.body.user;
    let Stores = null;
    let Fetch = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'stores', 'id, name, thumbnail, isEnabled', `deleted_at IS NULL`, null, null, null);
        if (data.status) {
            Stores = data.data;
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        // TODO @adeel needs to change the response with same pattern status and message
        return res.status(http_status_codes_1.StatusCodes.OK).json(Stores);
    };
    /* Start */
    Fetch();
});
app.get("/search", ApiAuth, (req, res) => {
    let User = req.body.user;
    let NoOfRecords = req.query.no_of_records;
    let Store = req.query.store;
    let Search = req.query.search;
    let SearchCondition = "";
    if (req.query.search) {
        Search = req.query.search;
        if (Search !== "") {
            let NameValues = Search.split(" ");
            SearchCondition += ` AND (`;
            for (let i = 0; i < NameValues.length; i++) {
                SearchCondition += `(A.name LIKE '%${NameValues[i]}%' OR A.french_name LIKE '%${NameValues[i]}%')`;
                if ((i + 1) !== NameValues.length) {
                    SearchCondition += ` OR `;
                }
            }
            SearchCondition += `)`;
        }
    }
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_store');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'The no of records field', value: NoOfRecords, type: 'Empty' }, { field: 'The store field', value: Store, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        let itemExists = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'stores', '*', `name = '${Store}'`, null, null, null);
        if (itemExists.status) {
            if (itemExists.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'The selected store is invalid');
            }
            Paginate();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, itemExists.message);
        }
    });
    let Paginate = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `${Store}_items A`, 'COUNT(*) AS Total', `1 ${SearchCondition}`, null, null, null);
        if (data.status) {
            Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/stores/search", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `${Store}_items A`, `A.id, A.category, A.aisle, A.subCategory, A.sku, A.name, A.french_name, A.brand, A.regular_price, A.sale_price, A.image, A.url, A.size_label, A.size, A.created_at, A.updated_at`, `1 ${SearchCondition}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (data) => {
        Pagination.status = true;
        Pagination.data = data;
        return res.status(http_status_codes_1.StatusCodes.OK).json(Pagination);
    };
    /* Start */
    CheckRolePermission();
});
module.exports = app;
