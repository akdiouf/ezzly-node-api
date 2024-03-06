import express, { Request, Response, Application } from 'express';
import {
    CheckPermissionModule,
    DBDateFormatModule, GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponse, PaginationModule
} from "../../modules/common.modules";
import { StatusCodes } from 'http-status-codes';
import { CheckRequiredValidation } from "../../modules/validator.modules";
import { RunAnyQuery, SelectQueryModule } from "../../modules/crud.modules";
import { dbCon } from "../../modules/db.modules";

require('dotenv').config({ path: './.env' });
const app: Application = express();
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
const ApiAuth = require("./../../../lib/auth");

app.post("/create", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let StoreId = req.body.store_id;
    let Name = req.body.name;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'create_eezly_aisles');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Store id', value: StoreId, type: 'Empty' },
        { field: 'Name', value: Name, type: 'Empty' }, { field: 'Name', value: Name, type: 'Length maximum 255 characters' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for Store Id exists */
        let storeIdExists: any = await SelectQueryModule(dbCon, 'stores', '*', `id = ? AND deleted_at IS NULL`, null, null, null, [StoreId]);
        if (storeIdExists.status) {
            if (storeIdExists.data.length === 0) {
                return GenerateBadRequestResponse(res, 'Invalid store id');
            }
            /* Check for Unique Store Aisle Name */
            let checkUniqueData: any = await SelectQueryModule(dbCon, 'store_aisles', '*', `store_id = ? AND name = ? AND deleted_at IS NULL`, null, null, null, [StoreId, Name]);
            if (checkUniqueData.status) {
                if (checkUniqueData.data.length > 0) {
                    return GenerateBadRequestResponse(res, 'Store aisle already exists');
                }
                StoreData();
            } else {
                return GenerateErrorResponse(res, checkUniqueData.message);
            }
        } else {
            return GenerateErrorResponse(res, storeIdExists.message);
        }
    };

    let StoreData = async (): Promise<any> => {
        let sql = `INSERT INTO store_aisles (name, store_id, created_by, created_at) VALUE (?, ?, ?, ?)`;
        let values = [Name, StoreId, User.user_id, DBDateFormatModule()]
        let data: any = await RunAnyQuery(sql, values);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = () => {
        return GenerateSuccessResponse(res, 'Store aisle added successfully');
    };

    /* Start */
    CheckRolePermission();
});

app.get("/", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let StoreAisles: any = null;
    let NoOfRecords: any = req.query.no_of_records;

    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let Paginate = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'store_aisles', 'COUNT(*) AS Total', `deleted_at IS NULL`, null, null, null, []);
        if (data.status) {
            Pagination = await PaginationModule(req, process.env.BASE_URL + "/store_aisles", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let FetchData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'store_aisles A', `A.*, (SELECT B.fullName FROM users B WHERE A.created_by = B.id) AS createdBy, (SELECT C.fullName FROM users C WHERE A.updated_by = C.id) AS updatedBy, (SELECT D.name FROM stores D WHERE A.store_id = D.id) AS store_name`, `A.deleted_at IS NULL`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, []);
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
    Paginate();
});

app.get("/get_aisles", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let StoreId = req.query.store_id;
    let NoOfRecords: any = req.query.no_of_records;
    let StoreAisles: any = null;

    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'create_eezly_aisles');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Store id', value: StoreId, type: 'Empty' },
        { field: 'No of record', value: NoOfRecords, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for Store if exists */
        let storeExists: any = await SelectQueryModule(dbCon, 'stores', '*', `id = ? AND deleted_at IS NULL`, null, null, null, [StoreId]);
        if (storeExists.status) {
            if (data.length === 0) {
                return GenerateBadRequestResponse(res, 'Invalid store id');
            }
            Paginate();
        } else {
            return GenerateErrorResponse(res, storeExists.message);
        }
    };

    let Paginate = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'store_aisles', 'COUNT(*) AS Total', `store_id = ? AND deleted_at IS NULL`, null, null, null, [StoreId]);
        if (data.status) {
            Pagination = await PaginationModule(req, process.env.BASE_URL + "/store_aisles/get_aisles", Page, NoOfRecords, data.data[0].Total);
            FetchData();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let FetchData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'store_aisles A', `A.*, (SELECT B.fullName FROM users B WHERE A.created_by = B.id) AS createdBy, (SELECT C.fullName FROM users C WHERE A.updated_by = C.id) AS updatedBy, (SELECT D.name FROM stores D WHERE A.store_id = D.id) AS store_name`, `A.store_id = ? AND A.deleted_at IS NULL`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, [StoreId]);
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

app.put("/assign_aisle", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let StoreAisleId = req.query.store_aisle_id;
    let EezlyAisleId = req.query.eezly_aisle_id;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'create_eezly_aisles');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([
            { field: 'Store aisle id', value: StoreAisleId, type: 'Empty' },
            { field: 'Eezly aisle id', value: EezlyAisleId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for Store Aisle id exists */
        data = await SelectQueryModule(dbCon, 'store_aisles', '*', `id = ? AND deleted_at IS NULL`, null, null, null, [StoreAisleId]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'Invalid store aisle id');
            }
            ValidateStep2();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let ValidateStep2 = async (): Promise<any> => {
        /* Check for Eezly Aisle id exists */
        let data: any = await SelectQueryModule(dbCon, 'eezly_aisles', '*', `id = ?`, null, null, null, [EezlyAisleId]);
        if (data.status) {
            if (data.data.length === 0) {
                return GenerateBadRequestResponse(res, 'Invalid Eezly aisle id');
            }
            AssignAisle();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let AssignAisle = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`UPDATE store_aisles SET eezly_aisle_id = ?, updated_by = ?, updated_at = ? WHERE id = ?`, [EezlyAisleId, User.user_id, DBDateFormatModule(), StoreAisleId]);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Store aisle updated successfully');
    };

    /* Start */
    CheckRolePermission();
});

app.delete("/delete", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let StoreAisleId = req.query.store_aisle_id;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'create_eezly_aisles');
        if (data.status) {
            ValidationStep1();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Store aisle id', value: StoreAisleId, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for Store aisle id exists */
        let storeIdExists = await SelectQueryModule(dbCon, 'store_aisles', '*', `id = ? AND deleted_at IS NULL`, null, null, null, [StoreAisleId]);
        if (storeIdExists.status) {
            if (storeIdExists.data.length === 0) {
                return GenerateBadRequestResponse(res, 'Invalid store aisle id');
            }
            DeleteRecord();
        } else {
            return GenerateErrorResponse(res, storeIdExists.message);
        }
    };

    let DeleteRecord = async (): Promise<any> => {
        let data: any = await RunAnyQuery(`UPDATE store_aisles SET deleted_at = ? WHERE id = ?`, [DBDateFormatModule(), StoreAisleId]);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Store aisle deleted successfully');
    };

    /* Start */
    CheckRolePermission();
});

module.exports = app;
