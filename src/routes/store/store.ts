import express, { Request, Response, Application } from 'express';
import { dbCon } from '../../modules/db.modules';
import {
    CheckPermissionModule,
    DBDateFormatModule, GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponse, PaginationModule
} from "../../modules/common.modules";
import { StatusCodes } from 'http-status-codes';
import { CheckRequiredValidation } from "../../modules/validator.modules";
import { RunAnyQuery, SelectQueryModule } from "../../modules/crud.modules";

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
    let Name = req.body.name;
    let Thumbnail = req.body.thumbnail;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'create_store');
        if (!data.status) {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
        ValidationStep1();
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'Name', value: Name, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for Unique Name */
        let checkUniqueName = await SelectQueryModule(dbCon, 'stores', '*', `name = ? AND deleted_at IS NULL`, null, null, null, [Name]);
        if (checkUniqueName.status) {
            if (checkUniqueName.data.length > 0) {
                return GenerateBadRequestResponse(res, 'Name must be unique');
            }
            StoreData();
        } else {
            return GenerateErrorResponse(res, checkUniqueName.message);
        }
    };

    let StoreData = async (): Promise<any> => {
        Thumbnail = (Thumbnail === '' || Thumbnail == null) ? '' : Thumbnail;
        let sql = `INSERT INTO stores (name, thumbnail, created_by, created_at) VALUE (?, ?, ?, ?)`;
        let values = [Name, Thumbnail, User.user_id, DBDateFormatModule()]
        let data: any = await RunAnyQuery(sql, values);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        Response();
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Store created successfully');
    };

    /* Start */
    CheckRolePermission();
});

app.get("/", (req: Request, res: Response): any => {
    let User = req.body.user;
    let Stores: any = null;

    let Fetch = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'stores', 'id, name, thumbnail, isEnabled', `deleted_at IS NULL`, null, null, null, []);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        Stores = data.data;
        Response();
    };

    let Response = (): any => {
        // TODO @adeel needs to change the response with same pattern status and message
        return res.status(StatusCodes.OK).json(Stores);
    };

    /* Start */
    Fetch();
});

app.get("/search", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let NoOfRecords: any = req.query.no_of_records;
    let Store = req.query.store as string;
    let Search = req.query.search as string;

    let SearchCondition: any = "";
    if (req.query.search) {
        Search = req.query.search as string;
        if (Search !== "") {
            let NameValues: any = Search.split(" ");
            SearchCondition += ` AND (`;
            for (let i = 0; i < NameValues.length; i++) {
                SearchCondition += `(A.name LIKE '%${NameValues[i]}%' OR A.french_name LIKE '%${NameValues[i]}%')`;
                if ((i + 1) !== NameValues.length) {
                    SearchCondition += ` OR `;
                }
            }
            SearchCondition += `)`;
        }
    }

    /* Pagination */
    let Page: number = 1;
    if (req.query.page) {
        Page = parseInt(req.query.page as string);
    }
    let Pagination: any = null;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'create_store');
        if (!data.status) {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
        ValidationStep1();
    };

    let ValidationStep1 = async (): Promise<any> => {
        let data: any = await CheckRequiredValidation([{ field: 'The no of records field', value: NoOfRecords, type: 'Empty' }, { field: 'The store field', value: Store, type: 'Empty' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check of Eezly Item Id Exists */
        let itemExists = await SelectQueryModule(dbCon, 'stores', '*', `name = ?`, null, null, null, [Store]);
        if (itemExists.status) {
            if (itemExists.data.length === 0) {
                return GenerateBadRequestResponse(res, 'The selected store is invalid');
            }
            Paginate();
        } else {
            return GenerateErrorResponse(res, itemExists.message);
        }
    };

    let Paginate = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `${Store}_items A`, 'COUNT(*) AS Total', `1 ${SearchCondition}`, null, null, null, []);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        Pagination = await PaginationModule(req, process.env.BASE_URL + "/stores/search", Page, NoOfRecords, data.data[0].Total);
        FetchData();
    };

    let FetchData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `${Store}_items A`, `A.id, A.category, A.aisle, A.subCategory, A.sku, A.name, A.french_name, A.brand, A.regular_price, A.sale_price, A.image, A.url, A.size_label, A.size, A.created_at, A.updated_at`, `1 ${SearchCondition}`, null, null, ` LIMIT ${NoOfRecords} OFFSET ${Pagination.from !== null ? Pagination.from - 1 : 0}`, []);
        if (!data.status) {
            return GenerateErrorResponse(res, data.message);
        }
        Response(data.data);
    };

    let Response = (data: any) => {
        Pagination.status = true;
        Pagination.data = data;
        return res.status(StatusCodes.OK).json(Pagination);
    };

    /* Start */
    CheckRolePermission();
});

module.exports = app;
