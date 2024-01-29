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
const http_status_codes_1 = require("http-status-codes");
const validator_modules_1 = require("../../modules/validator.modules");
const crud_modules_1 = require("../../modules/crud.modules");
const db_modules_1 = require("../../modules/db.modules");
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
    let StoreId = req.body.store_id;
    let Name = req.body.name;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_eezly_aisles');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Store id', value: StoreId, type: 'Empty' },
            { field: 'Name', value: Name, type: 'Empty' }, { field: 'Name', value: Name, type: 'Length maximum 255 characters' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for Store Id exists */
        let storeIdExists = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'stores', '*', `id = '${StoreId}' AND deleted_at IS NULL`, null, null, null);
        if (storeIdExists.status) {
            if (storeIdExists.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid store id');
            }
            /* Check for Unique Store Aisle Name */
            let checkUniqueData = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles', '*', `store_id = '${StoreId}' AND name = '${Name}' AND deleted_at IS NULL`, null, null, null);
            if (checkUniqueData.status) {
                if (checkUniqueData.length > 0) {
                    return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Store aisle already exists');
                }
                StoreData();
            }
            else {
                return (0, common_modules_1.GenerateErrorResponse)(res, checkUniqueData.message);
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, storeIdExists.message);
        }
    });
    let StoreData = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `INSERT INTO store_aisles (name, store_id, created_by, created_at) VALUE ('${Name}', '${StoreId}', '${User.user_id}', '${(0, common_modules_1.DBDateFormatModule)()}')`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Store aisle added successfully');
    };
    /* Start */
    CheckRolePermission();
});
app.get("/", ApiAuth, (req, res) => {
    let User = req.body.user;
    let StoreAisles = null;
    let NoOfRecords = req.query.no_of_records;
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let Paginate = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles', 'COUNT(*) AS Total', `deleted_at IS NULL`, null, null, null);
        if (data.status) {
            Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/store_aisles", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles A', `A.*, (SELECT B.fullName FROM users B WHERE A.created_by = B.id) AS createdBy, (SELECT C.fullName FROM users C WHERE A.updated_by = C.id) AS updatedBy, (SELECT D.name FROM stores D WHERE A.store_id = D.id) AS store_name`, `A.deleted_at IS NULL`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`);
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
    Paginate();
});
app.get("/get_aisles", ApiAuth, (req, res) => {
    let User = req.body.user;
    let StoreId = req.query.store_id;
    let NoOfRecords = req.query.no_of_records;
    let StoreAisles = null;
    /* Pagination */
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_eezly_aisles');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Store id', value: StoreId, type: 'Empty' },
            { field: 'No of record', value: NoOfRecords, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for Store if exists */
        let storeExists = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'stores', '*', `id = '${StoreId}' AND deleted_at IS NULL`, null, null, null);
        if (storeExists.status) {
            if (data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid store id');
            }
            Paginate();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, storeExists.message);
        }
    });
    let Paginate = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles', 'COUNT(*) AS Total', `store_id = '${StoreId}' AND deleted_at IS NULL`, null, null, null);
        if (data.status) {
            Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/store_aisles/get_aisles", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles A', `A.*, (SELECT B.fullName FROM users B WHERE A.created_by = B.id) AS createdBy, (SELECT C.fullName FROM users C WHERE A.updated_by = C.id) AS updatedBy, (SELECT D.name FROM stores D WHERE A.store_id = D.id) AS store_name`, `A.store_id = '${StoreId}' AND A.deleted_at IS NULL`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`);
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
app.put("/assign_aisle", ApiAuth, (req, res) => {
    let User = req.body.user;
    let StoreAisleId = req.query.store_aisle_id;
    let EezlyAisleId = req.query.eezly_aisle_id;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_eezly_aisles');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([
            { field: 'Store aisle id', value: StoreAisleId, type: 'Empty' },
            { field: 'Eezly aisle id', value: EezlyAisleId, type: 'Empty' }
        ]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for Store Aisle id exists */
        data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles', '*', `id = '${StoreAisleId}' AND deleted_at IS NULL`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid store aisle id');
            }
            ValidateStep2();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let ValidateStep2 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for Eezly Aisle id exists */
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_aisles', '*', `id = '${EezlyAisleId}'`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid Eezly aisle id');
            }
            AssignAisle();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let AssignAisle = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE store_aisles SET eezly_aisle_id = '${EezlyAisleId}', updated_by = '${User.user_id}', updated_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = '${StoreAisleId}'`);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Store aisle updated successfully');
    };
    /* Start */
    CheckRolePermission();
});
app.delete("/delete", ApiAuth, (req, res) => {
    let User = req.body.user;
    let StoreAisleId = req.query.store_aisle_id;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'create_eezly_aisles');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Store aisle id', value: StoreAisleId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for Store aisle id exists */
        let storeIdExists = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'store_aisles', '*', `id = '${StoreAisleId}' AND deleted_at IS NULL`, null, null, null);
        if (storeIdExists.status) {
            if (storeIdExists.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Invalid store aisle id');
            }
            DeleteRecord();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, storeIdExists.message);
        }
    });
    let DeleteRecord = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE store_aisles SET deleted_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = '${StoreAisleId}'`);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Store aisle deleted successfully');
    };
    /* Start */
    CheckRolePermission();
});
module.exports = app;
