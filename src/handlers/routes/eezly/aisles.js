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
const validator_modules_1 = require("../../modules/validator.modules");
const crud_modules_1 = require("../../modules/crud.modules");
const db_modules_1 = require("../../modules/db.modules");
const http_status_codes_1 = require("http-status-codes");
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
// Create Eezly Aisle
app.post("/create", ApiAuth, (req, res) => {
    let User = req.body.user;
    let Name = req.body.name;
    let Name_fr = req.body.name_fr;
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
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Name', value: Name, type: 'Empty' },
            { field: 'Name', value: Name, type: 'Length maximum 255 characters' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for Unique Name */
        let uniqueNameCheck = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_aisles', '*', `name = '${Name}' or name_fr = '${Name_fr}'`, null, null, null);
        if (uniqueNameCheck.status) {
            if (uniqueNameCheck.data.length > 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Name must be unique');
            }
            StoreData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, uniqueNameCheck.message);
        }
    });
    let StoreData = () => __awaiter(void 0, void 0, void 0, function* () {
        let sql = `INSERT INTO eezly_aisles (name, name_fr, created_by, updated_by, created_at, updated_at) VALUE ('${Name}', '${Name_fr}', '${User.user_id}', '${User.user_id}', '${(0, common_modules_1.DBDateFormatModule)()}', '${(0, common_modules_1.DBDateFormatModule)()}')`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Eezly aisle added successfully');
    };
    /* Start */
    CheckRolePermission();
});
// Get Eezly Aisles
app.get("/", (req, res) => {
    let User = req.body.user;
    let Lang = (req.query.lang === '' || req.query.lang == null) ? 'en' : req.query.lang;
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        const columns = `id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(name_fr, name)
                    END AS name, thumbnail`;
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'eezly_aisles', columns, null, null, null, null);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (data) => {
        // TODO: @adeel need to modify response to follow same pattern status, data
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            aisleList: data
        });
    };
    // Start
    FetchData();
});
module.exports = app;
