import express, { Request, Response, Application } from 'express';
import { dbCon } from '../modules/db.modules';
import { RunAnyQuery, SelectQueryModule } from '../modules/crud.modules';
import {
    DBDateFormatModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateUnauthorizedResponse
} from "../modules/common.modules";
import { StatusCodes } from 'http-status-codes';
import { CheckRequiredValidation } from "../modules/validator.modules";

require('dotenv').config({ path: './.env' });
const app: Application = express();
const formData = require('express-form-data');
const cors = require('cors');
app.use(formData.parse());
app.use(cors());
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const bcrypt_salt_rounds = 10;
const JWT_TOKEN_KEY = process.env.JWT_SECRET_KEY;
const moment = require("moment");

app.post("/register", (req: Request, res: Response): any => {
    let FullName = req.body.fullName;
    let Username = req.body.username;
    let Password = req.body.password;
    let Email = req.body.email;
    let FcmToken = req.body.fcm_token;
    let Role = 3;
    let RoleTitle: any = 'Clients';

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'Full Name', value: FullName, type: 'Empty' },
            { field: 'Username', value: Username, type: 'Empty' },
            { field: 'Password', value: Password, type: 'Empty' },
            { field: 'Password', value: Password, type: 'Length' },
            { field: 'Email', value: Email, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        ValidationStep2();
    };

    let ValidationStep2 = async (): Promise<any> => {
        /* Check for unique username */
        let data: any = await SelectQueryModule(dbCon, 'users', '*', `username = ?`, null, null, null, [Username]);
        if (data.status) {
            if (data.data.length > 0) {
                return GenerateBadRequestResponse(res, 'Username already exists');
            } else {
                ValidationStep3();
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let ValidationStep3 = async (): Promise<any> => {
        /* Check for unique email */
        let data: any = await SelectQueryModule(dbCon, 'users', '*', `email = ?`, null, null, null, [Email]);
        if (data.status) {
            if (data.data.length > 0) {
                return GenerateBadRequestResponse(res, 'Email address already exists');
            } else {
                StoreData();
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let StoreData = async (): Promise<any> => {
        let Hash = await bcrypt.hash(Password, bcrypt_salt_rounds);
        let sql = `INSERT INTO users (fullName, username, email, password, role_id, last_logged_in, fcm_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        let Values = [FullName, Username, Email, Hash, Role, DBDateFormatModule(), FcmToken, DBDateFormatModule(), DBDateFormatModule()];
        let data: any = await RunAnyQuery(sql, Values);
        if (data.status) {
            Response(data.data.insertId);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (UserId: string): any => {
        let AccessToken = jwt.sign(
            {
                user_id: UserId,
                username: Username,
                email: Email
            },
            JWT_TOKEN_KEY,
            {
                expiresIn: "24h",
            }
        );
        return res.status(StatusCodes.OK).json({
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
            created_at: DBDateFormatModule()
        });
    };

    /* Start */
    ValidationStep1();
});

app.post("/login", (req: Request, res: Response): any => {
    let Username = req.body.username;
    let Password = req.body.password;
    let FcmToken = req.body.fcm_token;
    let LastLoggedIn: any = '';
    let UserData: any = [];
    let PermissionArr: any = [];

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Username', value: Username, type: 'Empty' }, { field: 'Password', value: Password, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        LoginAttempt();
    };

    let LoginAttempt = async (): Promise<any> => {
        /* Check for username */
        UserData = await SelectQueryModule(dbCon, 'users A INNER JOIN roles B ON A.role_id = B.id', 'A.*, B.title AS Role', `A.username = ? AND deleted_at IS NULL`, null, null, null, [Username]);
        if (UserData.status) {
            if (UserData.data.length === 0) {
                return GenerateUnauthorizedResponse(res, 'Unauthorized');
            } else {
                /* Check for Password */
                bcrypt.compare(Password, UserData.data[0].password).then((res: any) => {
                    if (!res) {
                        return GenerateUnauthorizedResponse(res, 'Unauthorized');
                    } else {
                        /* Update Last Logged In */
                        UpdateLastLoggedIn();
                    }
                }).catch((err: any) => {
                    return GenerateUnauthorizedResponse(res, 'Unauthorized');
                });
            }
        } else {
            return GenerateErrorResponse(res, UserData.message);
        }
    };

    let UpdateLastLoggedIn = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`UPDATE users SET last_logged_in = ?, updated_at = ? WHERE username = ?`, [DBDateFormatModule(), DBDateFormatModule(), Username]);
        if (data.status) {
            GetPermissionList();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetPermissionList = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'permissions', 'permission', `(FIND_IN_SET(?, roles) > 0)`, null, null, null, [UserData.data[0].role_id]);
        if (data.status) {
            for (let i = 0; i < data.data.length; i++) {
                PermissionArr.push(data.data[i].permission);
            }
            Response();
        } else {
            return GenerateBadRequestResponse(res, data.message);
        }
    };

    let Response = (): any => {
        let AccessToken = jwt.sign(
            {
                user_id: UserData.data[0].id,
                username: Username,
                email: UserData.data[0].email,
                role_id: UserData.data[0].role_id,
            },
            JWT_TOKEN_KEY,
            {
                expiresIn: "365d",
            }
        );
        if (UserData.data[0].Role === 'Clients') {
            return res.status(StatusCodes.OK).json({
                status: true,
                access_token: AccessToken,
                token_type: 'Bearer',
                user_id: UserData.data[0].id,
                fullName: UserData.data[0].fullName,
                fcm_token: FcmToken
            });
        } else {
            return res.status(StatusCodes.OK).json({
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
