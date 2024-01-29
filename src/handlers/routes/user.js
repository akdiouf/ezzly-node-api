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
const crud_modules_1 = require("../modules/crud.modules");
const common_modules_1 = require("../modules/common.modules");
const db_modules_1 = require("../modules/db.modules");
const http_status_codes_1 = require("http-status-codes");
const validator_modules_1 = require("../modules/validator.modules");
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
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
const bcrypt = require("bcryptjs");
const bcrypt_salt_rounds = 10;
const ApiAuth = require("../lib/auth");
// Get User Details
app.get("/getUserDetail", ApiAuth, (req, res) => {
    let User = req.body.user;
    let data = [];
    let PermissionArr = [];
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'users A INNER JOIN roles B ON A.role_id = B.id', 'A.*, B.title AS Role', `A.id = '${User.user_id}'`, null, null, null);
        if (data.status) {
            GetPermissionList();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetPermissionList = () => __awaiter(void 0, void 0, void 0, function* () {
        let permission = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, 'permissions', 'permission', `(FIND_IN_SET('${data.data[0].role_id}', roles) > 0)`, null, null, null);
        if (permission.status) {
            for (let i = 0; i < permission.data.length; i++) {
                PermissionArr.push(permission.data[i].permission);
            }
            Response();
        }
        else {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, permission.message);
        }
    });
    let Response = () => {
        if (data.data.length === 0) {
            return (0, common_modules_1.GenerateErrorResponse)(res, 'No record found');
        }
        else {
            if (data.data[0].Role === 'Clients') {
                return res.status(http_status_codes_1.StatusCodes.OK).json({
                    status: true,
                    user_id: data.data[0].id,
                    fullName: data.data[0].fullName
                });
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.OK).json({
                    status: true,
                    user_id: data.data[0].id,
                    fullName: data.data[0].fullName,
                    permissions: PermissionArr
                });
            }
        }
    };
    /* Start */
    FetchData();
});
// Get All Users
app.get("/getAllUsers", ApiAuth, (req, res) => {
    let User = req.body.user;
    let NoOfRecords = req.query.no_of_records;
    let Page = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page);
    }
    let Pagination = null;
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
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Number of records', value: NoOfRecords, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        Paginate();
    });
    let Paginate = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `users A INNER JOIN roles B ON A.role_id = B.id`, `(SELECT COUNT(*) FROM users WHERE role_id != '1' AND deleted_at IS NULL) AS Total`, `A.role_id != '1' AND A.deleted_at IS NULL`, null, null, null);
        if (data.status) {
            Pagination = yield (0, common_modules_1.PaginationModule)(req, app.get("BaseUrl") + "/user/getAllUser", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, `users A INNER JOIN roles B ON A.role_id = B.id`, `A.id AS user_id, A.fullName`, `A.role_id != '1' AND A.deleted_at IS NULL LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, null, null, null);
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
// Edit Profile
app.put("/editProfile", ApiAuth, (req, res) => {
    let User = req.body.user;
    let FullName = req.query.fullName;
    let Email = req.query.email;
    let UserData = null;
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Full name', value: FullName, type: 'Empty' }, { field: 'Email', value: Email, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        ValidationStep2();
    });
    let ValidationStep2 = () => __awaiter(void 0, void 0, void 0, function* () {
        /* Check for unique email */
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "users", "*", `email = '${Email}' AND id != ${User.user_id}`, null, null, null);
        if (data.status) {
            if (data.data.length > 0) {
                return (0, common_modules_1.GenerateBadRequestResponse)(res, 'Email address already exists');
            }
            else {
                UpdateUser();
            }
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let UpdateUser = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE users SET fullName = '${FullName}', email = '${Email}', updated_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = '${User.user_id}'`);
        if (data.status) {
            GetUserData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetUserData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "users A INNER JOIN roles B ON A.role_id = B.id", "A.*, B.title AS Role", `A.id = '${User.user_id}'`, null, null, null);
        if (data.status) {
            UserData = data.data;
            Response();
        }
        else if (data.data.length === 0) {
            return (0, common_modules_1.GenerateUnauthorizedResponse)(res, 'Unauthorized');
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            message: "Profile updated successfully",
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
app.delete("/deleteAccount", ApiAuth, (req, res) => {
    let User = req.body.user;
    let CartIds = [];
    let GetUserCartRecord = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "carts", "id", `customer_id = '${User.user_id}' AND status = 1`, null, null, null);
        if (data.status) {
            if (data.data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    CartIds.push(data[i].id);
                }
                yield ClearCartDetailsTableRecord();
                yield ClearCartTableRecord();
            }
            yield DeleteUser();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let ClearCartDetailsTableRecord = () => __awaiter(void 0, void 0, void 0, function* () {
        const escapedStringArray = CartIds.map((value) => mysql.escape(value));
        const whereCondition = escapedStringArray.length > 0 ? `cart_id IN (${escapedStringArray.join(",")})` : `cart_id IN ('')`;
        let sql = `DELETE FROM cart_details WHERE ${whereCondition}`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (!data.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
        return true;
    });
    let ClearCartTableRecord = () => __awaiter(void 0, void 0, void 0, function* () {
        const escapedStringArray = CartIds.map((value) => mysql.escape(value));
        const whereCondition = escapedStringArray.length > 0 ? `id IN (${escapedStringArray.join(",")})` : `id IN ('')`;
        let sql = `DELETE FROM carts WHERE ${whereCondition}`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (!data.status) {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
        return true;
    });
    let DeleteUser = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE users SET updated_at = '${(0, common_modules_1.DBDateFormatModule)()}', deleted_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = '${User.user_id}'`);
        if (data.status) {
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return (0, common_modules_1.GenerateSuccessResponse)(res, 'Account deleted successfully');
    };
    /* Start */
    GetUserCartRecord();
});
// Change Password
app.put("/changePassword", ApiAuth, (req, res) => {
    let UserId = req.query.user_id;
    let Password = req.query.newPassword;
    let Confirm = req.query.confirmPassword;
    let UserData = null;
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([
            { field: 'User id', value: UserId, type: 'Empty' },
            { field: 'Password', value: Password, type: 'Empty' },
            { field: 'Confirm password', value: Confirm, type: 'Empty' },
            { field: 'Password length', value: Password.length, type: 'Length' },
            { field: 'Password and confirm password', value: Confirm, type: 'Confirm Password' },
        ]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        UpdatePassword();
    });
    let UpdatePassword = () => __awaiter(void 0, void 0, void 0, function* () {
        let Hash = yield bcrypt.hash(Password, bcrypt_salt_rounds);
        let data = yield (0, crud_modules_1.RunAnyQuery)(`UPDATE users SET password = '${Hash}', updated_at = '${(0, common_modules_1.DBDateFormatModule)()}' WHERE id = '${UserId}'`);
        if (data.status) {
            GetUserData();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetUserData = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "users A INNER JOIN roles B ON A.role_id = B.id", "A.*, B.title AS Role", `A.id = '${UserId}'`, null, null, null);
        if (data.status) {
            if (data.data.length === 0) {
                return (0, common_modules_1.GenerateUnauthorizedResponse)(res, 'Unauthorized');
            }
            UserData = data.data;
            Response();
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = () => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            message: "Password updated successfully",
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
app.post("/feedback", (req, res) => {
    let Comment = req.body.comment;
    let Suggestion = null;
    let FilesArray = [];
    let FileNamesArray = [];
    let FileUploadCount = 0;
    let StoragePath = path.resolve("./") + '/public/files/';
    let ValidationStep1 = () => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, validator_modules_1.CheckRequiredValidation)([{ field: 'Comment', value: Comment, type: 'Empty' }]);
        if (!data.status) {
            return (0, common_modules_1.GenerateBadRequestResponse)(res, data.message);
        }
        if (req.body.suggest) {
            Suggestion = req.body.suggest;
        }
        MainProcess();
    });
    let MainProcess = () => {
        if (req.body.image) {
            let UploadType = Array.isArray(req.body.image) ? "multiple" : "single";
            if (UploadType === "single") {
                FilesArray.push(req.body.image);
            }
            else {
                FilesArray = req.body.image;
            }
            FileUpload(FilesArray[FileUploadCount], FileUploadCount);
        }
        else {
            StoreData();
        }
    };
    let FileUpload = (FileObject, FileIndex) => {
        const OldPath = FileObject.path;
        const Extension = path.extname(OldPath);
        const Filename = `feedbackImage-${moment().format('YMMDD-HHmmss')}-${(0, common_modules_1.DBDateFormatModule)()}${Extension}`;
        const NewPath = StoragePath + Filename;
        fs.rename(OldPath, NewPath, function (err) {
            if (err) {
                return (0, common_modules_1.GenerateErrorResponse)(res, err.message);
            }
            FileUploadCount++;
            FileNamesArray.push(Filename);
            /* Check for Total Files Upload */
            if (FilesArray.length === FileUploadCount) {
                StoreData();
            }
            else {
                FileUpload(FilesArray[FileUploadCount], FileUploadCount);
            }
        });
    };
    let StoreData = () => __awaiter(void 0, void 0, void 0, function* () {
        let Image = FileNamesArray.length === 0 ? null : FileNamesArray[0];
        let sql = `INSERT INTO feedback (image, comment, suggest, created_at, updated_at) VALUE ('${Image}', '${Comment}', '${Suggestion}', '${(0, common_modules_1.DBDateFormatModule)()}', '${(0, common_modules_1.DBDateFormatModule)()}')`;
        let data = yield (0, crud_modules_1.RunAnyQuery)(sql);
        if (data.status) {
            GetData(data.data.insertId);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let GetData = (FeedbackId) => __awaiter(void 0, void 0, void 0, function* () {
        let data = yield (0, crud_modules_1.SelectQueryModule)(db_modules_1.dbCon, "feedback", "*", `id = '${FeedbackId}'`, null, null, null);
        if (data.status) {
            Response(data.data);
        }
        else {
            return (0, common_modules_1.GenerateErrorResponse)(res, data.message);
        }
    });
    let Response = (FeedbackData) => {
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            message: "Thanks for the feedback",
            feedback: {
                id: FeedbackData[0].id,
                user_id: FeedbackData[0].user_id,
                image: `${app.get("BaseUrl")}/public/files/${FeedbackData[0].image}`,
                comment: FeedbackData[0].comment,
                suggest: FeedbackData[0].suggest
            }
        });
    };
    /* Start */
    ValidationStep1();
});
module.exports = app;
