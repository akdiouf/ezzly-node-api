import express, { Request, Response, Application } from 'express';
import {
    CheckPermissionModule, DBDateFormatModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponse
} from "../../modules/common.modules";
import { CheckRequiredValidation } from "../../modules/validator.modules";
import { RunAnyQuery, SelectQueryModule } from "../../modules/crud.modules";
import { dbCon } from "../../modules/db.modules";
import { StatusCodes } from 'http-status-codes';

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

// Create Eezly Aisle
app.post("/create", ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let Name = req.body.name;
    let Name_fr = req.body.name_fr;

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
        let data: any = await CheckRequiredValidation([{ field: 'Name', value: Name, type: 'Empty' },
        { field: 'Name', value: Name, type: 'Length maximum 255 characters' }]);
        if (!data.status) {
            return GenerateBadRequestResponse(res, data.message);
        }
        /* Check for Unique Name */
        let uniqueNameCheck: any = await SelectQueryModule(dbCon, 'eezly_aisles', '*', `name = ? or name_fr = ?`, null, null, null, [Name, Name_fr]);
        if (uniqueNameCheck.status) {
            if (uniqueNameCheck.data.length > 0) {
                return GenerateBadRequestResponse(res, 'Name must be unique');
            }
            StoreData();
        } else {
            return GenerateErrorResponse(res, uniqueNameCheck.message);
        }
    };

    let StoreData = async (): Promise<any> => {
        let sql = `INSERT INTO eezly_aisles (name, name_fr, created_by, updated_by, created_at, updated_at) VALUE (?, ?, ?, ?, ?, ?)`;
        let values = [Name, Name_fr, User.user_id, User.user_id, DBDateFormatModule(), DBDateFormatModule()];
        let data: any = await RunAnyQuery(sql, values);
        if (data.status) {
            Response();
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (): any => {
        return GenerateSuccessResponse(res, 'Eezly aisle added successfully');
    };

    /* Start */
    CheckRolePermission();
});

// Get Eezly Aisles
app.get("/", (req: Request, res: Response): any => {
    let User = req.body.user;
    let Lang: any = (req.query.lang === '' || req.query.lang == null) ? 'en' : req.query.lang;

    let FetchData = async (): Promise<any> => {
        const columns = `id,
                    CASE
                        WHEN '${Lang}' = 'en' THEN name
                        WHEN '${Lang}' = 'fr' THEN COALESCE(name_fr, name)
                    END AS name, thumbnail`;
        let data: any = await SelectQueryModule(dbCon, 'eezly_aisles', columns, null, null, null, null, []);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (data: any): any => {
        // TODO: @adeel need to modify response to follow same pattern status, data
        return res.status(StatusCodes.OK).json({
            status: true,
            aisleList: data
        });
    };

    // Start
    FetchData();
});

module.exports = app;
