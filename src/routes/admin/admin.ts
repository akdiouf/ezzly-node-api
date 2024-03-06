import express, { Request, Response, Application } from 'express';
import {
    CheckPermissionModule,
    DBDateFormatModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponse
} from '../../modules/common.modules';
import { CheckRequiredValidation } from '../../modules/validator.modules';
import { RunAnyQuery, SelectQueryModule } from '../../modules/crud.modules';
import { dbCon } from '../../modules/db.modules';
import { StatusCodes } from 'http-status-codes';

require('dotenv').config({ path: './.env' });
const app: Application = express();
const formData = require('express-form-data');
const bcrypt = require("bcrypt");
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
const ApiAuth = require("./../../../lib/auth");

app.put("/resetPassword", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let UserId = req.query.user_id as string;
    let Password = req.query.newPassword as string;
    let UserData: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'reset_user_password');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        // Validation
        let data: any = await CheckRequiredValidation([{ field: 'User id', value: UserId, type: 'Empty' },
        { field: 'Password', value: Password, type: 'Empty' },
        { field: 'Password', value: Password, type: 'Length' },
        ]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for User Id exists */
        ValidationStep2();
    };

    let ValidationStep2 = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `users`, `id, username, email, fullName, role_id, last_logged_in, created_at`, `id = ? AND deleted_at IS NULL`, null, null, null, [UserId]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'User id not exist');
            } else {
                UserData = data.data;
                ResetPassword();
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let ResetPassword = async (): Promise<any> => {
        let Hash = await bcrypt.hash(Password, bcrypt_salt_rounds);
        let data: any = await RunAnyQuery(`UPDATE users SET password = ?, updated_at = ? WHERE id = ?`, [Hash, DBDateFormatModule(), UserId]);
        if (data.status) {
            GetUserRole();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetUserRole = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `roles`, `title`, `id = ?`, null, null, null, [UserData[0].role_id]);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (data: any): any => {
        return res.status(StatusCodes.OK).json({
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
    } else {
        CheckRolePermission();
    }
});

app.get("/getUserDetail", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let UserId = req.query.user_id as string;
    let UserData: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'get_user_details');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'User id', value: UserId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for User Id exists */
        GetUserData();
    };

    let GetUserData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `users`, `id, username, email, fullName, role_id, last_logged_in, created_at`, `id = ? AND deleted_at IS NULL`, null, null, null, [UserId]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'User id not exist');
            } else {
                UserData = data.data;
                GetUserRole();
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetUserRole = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `roles`, `title`, `id = ?`, null, null, null, [UserData[0].role_id]);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (data: any): any => {
        return res.status(StatusCodes.OK).json({
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