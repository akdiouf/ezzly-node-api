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
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
const formData = require('express-form-data');
const bcrypt = require("bcryptjs");
const bcrypt_salt_rounds = 10;
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
app.put("/resetPassword", ApiAuth, (req, res) => {
    let User = req.body.user;
    let UserId = req.query.user_id;
    let Password = req.query.newPassword;
    let UserData = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'reset_user_password');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        // Validation
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'User id', value: UserId, type: 'Empty' },
            { field: 'Password', value: Password, type: 'Empty' },
            { field: 'Password', value: Password, type: 'Length' },
        ]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for User Id exists */
        ValidationStep2();
    });
    let ValidationStep2 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `users`, `id, username, email, fullName, role_id, last_logged_in, created_at`, `id = '${UserId}' AND deleted_at IS NULL`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'User id not exist');
            }
            else {
                UserData = data.data;
                ResetPassword();
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let ResetPassword = () => __awaiter(void 0, void 0, void 0, function* () {
        let Hash = yield bcrypt.hash(Password, bcrypt_salt_rounds);
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE users SET password = '${Hash}', updated_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = '${UserId}'`);
        if (data.status) {
            GetUserRole();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetUserRole = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `roles`, `title`, `id = '${UserData[0].role_id}'`, null, null, null);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (data) => {
        return res.status(app.get("SuccessStatus")).json({
            status: true,
            message: 'Reset password successfully',
            user_id: UserData[0].id,
            username: UserData[0].username,
            email: UserData[0].email,
            fullName: UserData[0].fullName,
            role: data[0].title,
            last_logged_in: moment(UserData[0].last_logged_in).format("Y-MM-DD hh:mm:ss A"),
            created_at: UserData[0].created_at,
        });
    };
    /* Start */
    if (User.user_id == UserId) {
        ValidationStep1();
    }
    else {
        CheckRolePermission();
    }
});
app.get("/getUserDetail", ApiAuth, (req, res) => {
    let User = req.body.user;
    let UserId = req.query.user_id;
    let UserData = null;
    let CheckRolePermission = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for user role permission */
        let data = yield (0, common_modules_1.CheckPermissionModule)(User.role_id, 'get_user_details');
        if (data.status) {
            ValidationStep1();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Permission denied');
        }
    });
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'User id', value: UserId, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        /* Check for User Id exists */
        GetUserData();
    });
    let GetUserData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `users`, `id, username, email, fullName, role_id, last_logged_in, created_at`, `id = '${UserId}' AND deleted_at IS NULL`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'User id not exist');
            }
            else {
                UserData = data.data;
                GetUserRole();
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetUserRole = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `roles`, `title`, `id = '${UserData[0].role_id}'`, null, null, null);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (data) => {
        return res.status(app.get("SuccessStatus")).json({
            status: true,
            user_id: UserData[0].id,
            username: UserData[0].username,
            email: UserData[0].email,
            fullName: UserData[0].fullName,
            role: data[0].title,
            last_logged_in: moment(UserData[0].last_logged_in).format("Y-MM-DD hh:mm:ss A"),
            created_at: UserData[0].created_at,
        });
    };
    /*Start*/
    CheckRolePermission();
});
module.exports = app;
