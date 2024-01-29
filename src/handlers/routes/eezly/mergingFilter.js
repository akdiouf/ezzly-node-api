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
const ApiAuth = require("../../lib/auth");
// Get Eezly Aisles
app.get('/getEezlyAisles', ApiAuth, (req, res) => {
    let User = req.body.user;
    let Brand = req.query.brand;
    let Size = req.query.size;
    let Store = req.query.store;
    let BrandCondition = '';
    let SizesCondition = '';
    let StoreConditions = !(Store) ? '' : `AND grocery_items LIKE '%"store_id":${Store}%'`;
    BrandCondition = filterCodeCondition(Brand, 'brand');
    SizesCondition = filterCodeCondition(Size, 'size');
    let BrandWhereCondition = BrandCondition;
    let SizeWhereCondition = Size ? Brand ? ` AND ${SizesCondition}` : ` ${SizesCondition}` : ``;
    let whereCondition = (BrandWhereCondition !== `` || SizeWhereCondition !== ``) ? `${BrandWhereCondition} ${SizeWhereCondition} AND eezly_aisle_id IS NOT NULL ${StoreConditions} ` : `eezly_aisle_id IS NOT NULL ${StoreConditions}`;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'merge_eezly_items');
        if (data.status) {
            FetchData();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `eezly_items AS A JOIN eezly_aisles AS B ON A.eezly_aisle_id = B.id`, `DISTINCT A.eezly_aisle_id AS id, B.name`, whereCondition, null, ` ORDER BY id ASC`, null);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (data) => {
        return (0, common_modules_1.GenerateSuccessResponseWithData)(res, data);
    };
    /* Start */
    CheckRolePermission();
});
// Get Eezly Brands
app.get('/getEezlyBrands', ApiAuth, (req, res) => {
    let User = req.body.user;
    let AisleId = req.query.eezly_aisle_id;
    let Size = req.query.size;
    let Store = req.query.store;
    let AisleCondition = '';
    let SizesCondition = '';
    AisleCondition = filterCodeCondition(AisleId, 'eezly_aisle_id');
    SizesCondition = filterCodeCondition(Size, 'size');
    let StoreConditions = !(Store) ? "" : `AND grocery_items LIKE '%"store_id":${Store}%'`;
    let AisleWhereCondition = AisleCondition;
    let SizeWhereCondition = Size ? (AisleId) ? ` AND ${SizesCondition}` : ` ${SizesCondition}` : ``;
    let whereCondition = (AisleWhereCondition !== `` || SizeWhereCondition !== ``) ? `${AisleWhereCondition} ${SizeWhereCondition} AND brand IS NOT NULL AND brand <> '' AND brand <> 'null' ${StoreConditions}` : `brand IS NOT NULL AND brand <> '' AND brand <> 'null' ${StoreConditions}`;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'merge_eezly_items');
        if (data.status) {
            FetchData();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_items AS A', 'DISTINCT A.brand', whereCondition, null, null, null);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (data) => {
        return (0, common_modules_1.GenerateSuccessResponseWithData)(res, data);
    };
    /* Start */
    CheckRolePermission();
});
// Get Eezly Sizes
app.get('/getEezlySizes', ApiAuth, (req, res) => {
    let User = req.body.user;
    let AisleId = req.query.eezly_aisle_id;
    let Brand = req.query.brand;
    let Store = req.query.store;
    let AisleCondition = '';
    let BrandsCondition = '';
    let StoreConditions = !(Store) ? "" : `AND grocery_items LIKE '%"store_id":${Store}%'`;
    AisleCondition = filterCodeCondition(AisleId, 'eezly_aisle_id');
    BrandsCondition = filterCodeCondition(Brand, 'brand');
    let AisleWhereCondition = AisleCondition;
    let BrandWhereCondition = Brand ? (AisleId) ? ` AND ${BrandsCondition}` : ` ${BrandsCondition}` : ``;
    let whereCondition = (AisleWhereCondition !== `` || BrandWhereCondition !== ``) ? `${AisleWhereCondition} ${BrandWhereCondition} AND size IS NOT NULL AND size <> '' AND size <> 'null' ${StoreConditions}` : `size IS NOT NULL AND size <> '' AND size <> 'null' ${StoreConditions}`;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'merge_eezly_items');
        if (data.status) {
            FetchData();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `eezly_items AS A`, `DISTINCT A.size`, whereCondition, null, null, null);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (data) => {
        return (0, common_modules_1.GenerateSuccessResponseWithData)(res, data);
    };
    /* Start */
    CheckRolePermission();
});
function filterCodeCondition(conditionVar, conditionFor) {
    if (conditionVar != "") {
        let newBrandsIds = (conditionVar !== '' && conditionVar != null) ? conditionVar.split(",") : [];
        return (newBrandsIds.length > 0) ? (`${conditionFor} IN (${newBrandsIds.map((d) => { return `'${d}'`; }).join(',')})`) : ``;
    }
    else {
        return `${conditionFor} = ''`;
    }
}
module.exports = app;
