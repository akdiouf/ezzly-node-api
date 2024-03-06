import express, { Request, Response, Application } from 'express';
import { RunAnyQuery, SelectQueryModule } from '../modules/crud.modules';
import {
    CheckPermissionModule,
    DBDateFormatModule, GenerateBadRequestResponse,
    GenerateErrorResponse, GenerateSuccessResponse, GenerateUnauthorizedResponse,
    PaginationModule
} from '../modules/common.modules';
import { dbCon } from '../modules/db.modules';
import { StatusCodes } from 'http-status-codes';
import { CheckRequiredValidation } from '../modules/validator.modules';

require('dotenv').config({ path: './.env' });
const app: Application = express();
const formData = require('express-form-data');
const os = require("os");
const fs = require("fs");
const path = require("path");
const mysql = require('mysql');
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
const bcrypt = require("bcrypt");
const bcrypt_salt_rounds = 10;
const ApiAuth = require("./../../lib/auth");

// Get User Details
app.get("/getUserDetail", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let data: any = [];
    let PermissionArr: any = [];

    let FetchData = async (): Promise<any> => {
        data = await SelectQueryModule(dbCon, 'users A INNER JOIN roles B ON A.role_id = B.id', 'A.*, B.title AS Role', `A.id = ?`, null, null, null, [User.user_id]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateErrorResponse(res, 'No record found');
            }
            GetPermissionList();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetPermissionList = async (): Promise<any> => {
        let permission: any = await SelectQueryModule(dbCon, 'permissions', 'permission', `(FIND_IN_SET(?, roles) > 0)`, null, null, null, [data.data[0].role_id]);
        if (permission.status) {
            for (let i = 0; i < permission.data.length; i++) {
                PermissionArr.push(permission.data[i].permission);
            }
            Response();
        } else {
            return GenerateBadRequestResponse(res, permission.message);
        }
    };

    let Response = (): any => {
        if (data.data[0].Role === 'Clients') {
            return res.status(StatusCodes.OK).json({
                status: true,
                user_id: data.data[0].id,
                fullName: data.data[0].fullName
            });
        } else {
            return res.status(StatusCodes.OK).json({
                status: true,
                user_id: data.data[0].id,
                fullName: data.data[0].fullName,
                permissions: PermissionArr
            });
        }
    };

    /* Start */
    FetchData();
});

// Get All Users
app.get("/getAllUsers", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let NoOfRecords: any = req.query.no_of_records;
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

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
        let data: any = await CheckRequiredValidation([{ field: 'Number of records', value: NoOfRecords, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        Paginate();
    };

    let Paginate = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `users A INNER JOIN roles B ON A.role_id = B.id`, `(SELECT COUNT(*) FROM users WHERE role_id != '1' AND deleted_at IS NULL) AS Total`, `A.role_id != '1' AND A.deleted_at IS NULL`, null, null, null, []);
        if (data.status) {
            Pagination = await PaginationModule(req, process.env.BASE_URL + "/user/getAllUser", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let FetchData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `users A INNER JOIN roles B ON A.role_id = B.id`, `A.id AS user_id, A.fullName`, `A.role_id != '1' AND A.deleted_at IS NULL LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, null, null, null, []);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (data: any): any => {
        Pagination.status = true;
        Pagination.data = data;
        return res.status(StatusCodes.OK).json(Pagination);
    };

    /* Start */
    CheckRolePermission();
});

// Edit Profile
app.put("/editProfile", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let FullName = req.query.fullName;
    let Email = req.query.email;
    let UserData: any = null;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Full name', value: FullName, type: 'Empty' }, { field: 'Email', value: Email, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        ValidationStep2();
    };

    let ValidationStep2 = async (): Promise<any> => {
        /* Check for unique email */
        let data: any = await SelectQueryModule(dbCon, "users", "*", `email = ? AND id != ?`, null, null, null, [Email, User.user_id]);
        if (data.status) {
            if (data.data.length > 0) {
                return GenerateBadRequestResponse(res, 'Email address already exists');
            } else {
                UpdateUser();
            }
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let UpdateUser = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`UPDATE users SET fullName = ?, email = ?, updated_at = ? WHERE id = ?`, [FullName, Email, DBDateFormatModule(), User.user_id]);
        if (data.status) {
            GetUserData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetUserData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "users A INNER JOIN roles B ON A.role_id = B.id", "A.*, B.title AS Role", `A.id = ?`, null, null, null, [User.user_id]);
        if (data.status) {
            UserData = data.data;
            Response();
        } else if (data.data.length === 0) {
            return GenerateUnauthorizedResponse(res, 'Unauthorized');
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            message: 'Profile updated successfully',
            user_id: UserData[0].id,
            username: UserData[0].username,
            email: UserData[0].email,
            fullName: UserData[0].fullName,
            role: UserData[0].Role,
            last_logged_in: moment(UserData[0].last_logged_in).format("Y-MM-DD hh:mm:ss A"),
            created_at: UserData[0].created_at
        });
    };

    /* Start */
    ValidationStep1();
});

// Delete Account
app.delete("/deleteAccount", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let CartIds: any = [];

    let GetUserCartRecord = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "carts", "id", `customer_id = ? AND status = 1`, null, null, null, [User.user_id]);
        if (data.status) {
            if (data.data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    CartIds.push(data[i].id);
                }
                await ClearCartDetailsTableRecord();
                await ClearCartTableRecord();
            }
            await DeleteUser();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let ClearCartDetailsTableRecord = async (): Promise<any> => {
        const escapedStringArray: string[] = CartIds.map((value: string) => mysql.escape(value));
        const whereCondition = escapedStringArray.length > 0 ? `cart_id IN (${escapedStringArray.join(",")})` : `cart_id IN ('')`;
        let data: any = await RunAnyQuery(`DELETE FROM cart_details WHERE ?`, [whereCondition]);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        return true;
    };

    let ClearCartTableRecord = async (): Promise<any> => {
        const escapedStringArray: string[] = CartIds.map((value: string) => mysql.escape(value));
        const whereCondition = escapedStringArray.length > 0 ? `id IN (${escapedStringArray.join(",")})` : `id IN ('')`;
        let data: any = await RunAnyQuery(`DELETE FROM carts WHERE ?`, [whereCondition]);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        return true;
    };

    let DeleteUser = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`UPDATE users SET updated_at = ?, deleted_at = ? WHERE id = ?`, [DBDateFormatModule(), DBDateFormatModule(), User.user_id]);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Account deleted successfully');
    };

    /* Start */
    GetUserCartRecord();
});

// Change Password
app.put("/changePassword", ApiAuth, (req: Request, res: Response): any => {
    let UserId: string = req.query.user_id as string;
    let Password: string = req.query.newPassword as string;
    let Confirm: string = req.query.confirmPassword as string;
    let UserData: any = null;

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'User id', value: UserId, type: 'Empty' },
            { field: 'Password', value: Password, type: 'Empty' },
            { field: 'Confirm password', value: Confirm, type: 'Empty' },
            { field: 'Password length', value: Password, type: 'Length' },
            { field: 'Password and confirm password', value: Confirm, type: 'Confirm Password' },
        ]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        UpdatePassword();
    };

    let UpdatePassword = async (): Promise<any> => {
        let Hash = await bcrypt.hash(Password, bcrypt_salt_rounds);
        let data: any = await RunAnyQuery(`UPDATE users SET password = ?, updated_at = ? WHERE id = ?`, [Hash, DBDateFormatModule(), UserId]);
        if (data.status) {
            GetUserData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetUserData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "users A INNER JOIN roles B ON A.role_id = B.id", "A.*, B.title AS Role", `A.id = ?`, null, null, null, [UserId]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateUnauthorizedResponse(res, 'Unauthorized');
            }
            UserData = data.data;
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            message: 'Password updated successfully',
            user_id: UserData[0].id,
            username: UserData[0].username,
            email: UserData[0].email,
            fullName: UserData[0].fullName,
            role: UserData[0].Role,
            last_logged_in: moment(UserData[0].last_logged_in).format("Y-MM-DD hh:mm:ss A"),
            created_at: UserData[0].created_at
        });
    };

    /* Start */
    ValidationStep1();
});

// Feedback
app.post("/feedback", (req: Request, res: Response): any => {
    let Comment = req.body.comment;
    let Suggestion: any = null;
    let FilesArray: any = [];
    let FileNamesArray: any = [];
    let FileUploadCount = 0;
    let StoragePath = path.resolve("./") + '/public/files/';

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Comment', value: Comment, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        if (req.body.suggest) {
            Suggestion = req.body.suggest;
        }
        MainProcess();
    };

    let MainProcess = (): any => {
        if (req.body.image) {
            let UploadType = Array.isArray(req.body.image) ? "multiple" : "single";
            if (UploadType === "single") {
                FilesArray.push(req.body.image);
            } else {
                FilesArray = req.body.image;
            }
            FileUpload(FilesArray[FileUploadCount], FileUploadCount);
        } else {
            StoreData();
        }
    };

    let FileUpload = (FileObject: any, FileIndex: any): any => {
        const OldPath = FileObject.path;
        const Extension = path.extname(OldPath);
        const Filename = `feedbackImage-${moment().format('YMMDD-HHmmss')}-${DBDateFormatModule()}${Extension}`;
        const NewPath = StoragePath + Filename;
        fs.rename(OldPath, NewPath, function (err: Error) {
            if (err) {
                return GenerateErrorResponse(res, err.message);
            }
            FileUploadCount++;
            FileNamesArray.push(Filename);
            /* Check for Total Files Upload */
            if (FilesArray.length === FileUploadCount) {
                StoreData();
            } else {
                FileUpload(FilesArray[FileUploadCount], FileUploadCount);
            }
        });
    };

    let StoreData = async (): Promise<any> => {
        let Image = FileNamesArray.length === 0 ? null : FileNamesArray[0];
        let sql = `INSERT INTO feedback (image, comment, suggest, created_at, updated_at) VALUE (?, ?, ?, ?, ?)`;
        let values = [Image, Comment, Suggestion, DBDateFormatModule(), DBDateFormatModule()]
        let data: any = await RunAnyQuery(sql, values);
        if (data.status) {
            GetData(data.data.insertId);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let GetData = async (FeedbackId: any): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, "feedback", "*", `id = ?`, null, null, null, [FeedbackId]);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (FeedbackData: any): any => {
        return res.status(StatusCodes.OK).json({
            status: true,
            message: 'Thanks for the feedback',
            feedback: {
                id: FeedbackData[0].id,
                user_id: FeedbackData[0].user_id,
                image: `${process.env.BASE_URL}/public/files/${FeedbackData[0].image}`,
                comment: FeedbackData[0].comment,
                suggest: FeedbackData[0].suggest
            }
        });
    };

    /* Start */
    ValidationStep1();
});

module.exports = app;
