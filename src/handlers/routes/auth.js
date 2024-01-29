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
const db_modules_1 = require("../modules/db.modules");
const crud_modules_1 = require("../modules/crud.modules");
const common_modules_1 = require("../modules/common.modules");
const http_status_codes_1 = require("http-status-codes");
const validator_modules_1 = require("../modules/validator.modules");
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
const formData = require('express-form-data');
const cors = require('cors');
app.use(formData.parse());
app.use(cors());
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const bcrypt_salt_rounds = 10;
const JWT_TOKEN_KEY = process.env.JWT_SECRET_KEY;
const moment = require("moment");
app.post("/register", (req, res) => {
    let FullName = req.body.fullName;
    let Username = req.body.username;
    let Password = req.body.password;
    let Email = req.body.email;
    let FcmToken = req.body.fcm_token;
    let Role = 3;
    let RoleTitle = 'Clients';
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([
            { field: 'Full Name', value: FullName, type: 'Empty' },
            { field: 'Username', value: Username, type: 'Empty' },
            { field: 'Password', value: Password, type: 'Empty' },
            { field: 'Password', value: Password, type: 'Length' },
            { field: 'Email', value: Email, type: 'Empty' }
        ]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        ValidationStep2();
    });
    let ValidationStep2 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for unique username */
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'users', '*', `username = '${Username}'`, null, null, null);
        if (data.status) {
            if (data.data.length > 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Username already exists');
            }
            else {
                ValidationStep3();
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let ValidationStep3 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for unique email */
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'users', '*', `email = '${Email}'`, null, null, null);
        if (data.status) {
            if (data.data.length > 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Email address already exists');
            }
            else {
                StoreData();
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let StoreData = () => __awaiter(void 0, void 0, void 0, function* () {
        let Hash = yield bcrypt.hash(Password, bcrypt_salt_rounds);
        let sql = `INSERT INTO users (fullName, username, email, password, role_id, last_logged_in, fcm_token, created_at, updated_at) VALUE ('${FullName}', '${Username}', '${Email}', '${Hash}', '${Role}', '${app.get("DBDateFormat")()}', '${FcmToken}', '${app.get("DBDateFormat")()}', '${app.get("DBDateFormat")()}')`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            Response(data.data.insertId);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (UserId) => {
        let AccessToken = jwt.sign({
            user_id: UserId,
            username: Username,
            email: Email
        }, JWT_TOKEN_KEY, {
            expiresIn: "24h",
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            message: 'success!',
            access_token: AccessToken,
            token_type: 'Bearer',
            user_id: UserId,
            fullName: FullName,
            username: Username,
            email: Email,
            role: RoleTitle,
            last_logged_in: moment().format("Y-MM-DD hh:mm:ss A"),
            fcm_token: FcmToken,
            created_at: (0, common_modules_1.DBDateFormatModule)()
        });
    };
    /* Start */
    ValidationStep1();
});
app.post("/login", (req, res) => {
    let Username = req.body.username;
    let Password = req.body.password;
    let FcmToken = req.body.fcm_token;
    let LastLoggedIn = '';
    let UserData = [];
    let PermissionArr = [];
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Username', value: Username, type: 'Empty' }, { field: 'Password', value: Password, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        LoginAttempt();
    });
    let LoginAttempt = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for username */
        UserData = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'users A INNER JOIN roles B ON A.role_id = B.id', 'A.*, B.title AS Role', `A.username = '${Username}' AND deleted_at IS NULL`, null, null, null);
        if (UserData.status) {
            if (UserData.data.length === 0) {
                return (0, common_modules_1.GenerateUnauthorizedResponse)(res, 'Unauthorized');
            }
            else {
                /* Check for Password */
                bcrypt.compare(Password, UserData.data[0].password).then((res) => {
                    if (!res) {
                        return (0, common_modules_1.GenerateUnauthorizedResponse)(res, 'Unauthorized');
                    }
                    else {
                        /* Update Last Logged In */
                        UpdateLastLoggedIn();
                    }
                }).catch((err) => {
                    return (0, common_modules_1.GenerateUnauthorizedResponse)(res, 'Unauthorized');
                });
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, UserData.message);
        }
    });
    let UpdateLastLoggedIn = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE users SET last_logged_in = '${(0, common_modules_1.DBDateFormatModule)()}', updated_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE username = '${Username}'`);
        if (data.status) {
            GetPermissionList();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetPermissionList = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'permissions', 'permission', `(FIND_IN_SET('${UserData.data[0].role_id}', roles) > 0)`, null, null, null);
        if (data.status) {
            for (let i = 0; i < data.data.length; i++) {
                PermissionArr.push(data.data[i].permission);
            }
            Response();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
    });
    let Response = () => {
        let AccessToken = jwt.sign({
            user_id: UserData.data[0].id,
            username: Username,
            email: UserData.data[0].email,
            role_id: UserData.data[0].role_id,
        }, JWT_TOKEN_KEY, {
            expiresIn: "365d",
        });
        if (UserData.data[0].Role === 'Clients') {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                status: true,
                access_token: AccessToken,
                token_type: 'Bearer',
                user_id: UserData.data[0].id,
                fullName: UserData.data[0].fullName,
                fcm_token: FcmToken
            });
        }
        else {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                status: true,
                access_token: AccessToken,
                token_type: 'Bearer',
                user_id: UserData.data[0].id,
                fullName: UserData.data[0].fullName,
                fcm_token: FcmToken,
                permissions: PermissionArr
            });
        }
    };
    /* Start */
    ValidationStep1();
});
module.exports = app;
