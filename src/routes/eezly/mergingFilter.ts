import express, { Request, Response, Application } from 'express';
import {
    CheckPermissionModule,
    GenerateBadRequestResponse,
    GenerateErrorResponse,
    GenerateSuccessResponseWithData
} from "../../modules/common.modules";
import { SelectQueryModule } from "../../modules/crud.modules";
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

// Get Eezly Aisles
app.get('/getEezlyAisles', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let Brand = req.query.brand as string;
    let Size = req.query.size as string;
    let Store = req.query.store as string;
    let BrandCondition: any = '';
    let SizesCondition: any = '';
    let StoreConditions = !(Store) ? '' : `AND grocery_items LIKE '%"store_id":${Store}%'`;
    BrandCondition = filterCodeCondition(Brand, 'brand');
    SizesCondition = filterCodeCondition(Size, 'size');
    let BrandWhereCondition: any = BrandCondition;
    let SizeWhereCondition: any = Size ? Brand ? ` AND ${SizesCondition}` : ` ${SizesCondition}` : ``;
    let whereCondition: any = (BrandWhereCondition !== `` || SizeWhereCondition !== ``) ? `${BrandWhereCondition} ${SizeWhereCondition} AND eezly_aisle_id IS NOT NULL ${StoreConditions} ` : `eezly_aisle_id IS NOT NULL ${StoreConditions}`;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            FetchData();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let FetchData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `eezly_items AS A JOIN eezly_aisles AS B ON A.eezly_aisle_id = B.id`, `DISTINCT A.eezly_aisle_id AS id, B.name`, whereCondition, null, ` ORDER BY id ASC`, null, []);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (data: any): any => {
        return GenerateSuccessResponseWithData(res, data);
    };

    /* Start */
    CheckRolePermission();
});

// Get Eezly Brands
app.get('/getEezlyBrands', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let AisleId = req.query.eezly_aisle_id as string;
    let Size = req.query.size as string;
    let Store = req.query.store as string;
    let AisleCondition: any = '';
    let SizesCondition: any = '';
    AisleCondition = filterCodeCondition(AisleId, 'eezly_aisle_id');
    SizesCondition = filterCodeCondition(Size, 'size');
    let StoreConditions = !(Store) ? "" : `AND grocery_items LIKE '%"store_id":${Store}%'`;
    let AisleWhereCondition: any = AisleCondition;
    let SizeWhereCondition: any = Size ? (AisleId) ? ` AND ${SizesCondition}` : ` ${SizesCondition}` : ``;
    let whereCondition: any = (AisleWhereCondition !== `` || SizeWhereCondition !== ``) ? `${AisleWhereCondition} ${SizeWhereCondition} AND brand IS NOT NULL AND brand <> '' AND brand <> 'null' ${StoreConditions}` : `brand IS NOT NULL AND brand <> '' AND brand <> 'null' ${StoreConditions}`;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            FetchData();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let FetchData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, 'eezly_items AS A', 'DISTINCT A.brand', whereCondition, null, null, null, []);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (data: any): any => {
        return GenerateSuccessResponseWithData(res, data);
    };

    /* Start */
    CheckRolePermission();
});

// Get Eezly Sizes
app.get('/getEezlySizes', ApiAuth, (req: Request, res: Response): any => {
    let User = req.body.user;
    let AisleId = req.query.eezly_aisle_id as string;
    let Brand = req.query.brand as string;
    let Store = req.query.store as string;
    let AisleCondition: any = '';
    let BrandsCondition: any = '';
    let StoreConditions = !(Store) ? "" : `AND grocery_items LIKE '%"store_id":${Store}%'`;
    AisleCondition = filterCodeCondition(AisleId, 'eezly_aisle_id');
    BrandsCondition = filterCodeCondition(Brand, 'brand');
    let AisleWhereCondition: any = AisleCondition;
    let BrandWhereCondition: any = Brand ? (AisleId) ? ` AND ${BrandsCondition}` : ` ${BrandsCondition}` : ``;
    let whereCondition: any = (AisleWhereCondition !== `` || BrandWhereCondition !== ``) ? `${AisleWhereCondition} ${BrandWhereCondition} AND size IS NOT NULL AND size <> '' AND size <> 'null' ${StoreConditions}` : `size IS NOT NULL AND size <> '' AND size <> 'null' ${StoreConditions}`;

    let CheckRolePermission = async (): Promise<any> => {
        /* Check for user role permission */
        let data: any = await CheckPermissionModule(User.role_id, 'merge_eezly_items');
        if (data.status) {
            FetchData();
        } else {
            return GenerateBadRequestResponse(res, 'Permission denied');
        }
    };

    let FetchData = async (): Promise<any> => {
        let data: any = await SelectQueryModule(dbCon, `eezly_items AS A`, `DISTINCT A.size`, whereCondition, null, null, null, []);
        if (data.status) {
            Response(data.data);
        } else {
            return GenerateErrorResponse(res, data.message);
        }
    };

    let Response = (data: any): any => {
        return GenerateSuccessResponseWithData(res, data);
    };

    /* Start */
    CheckRolePermission();
});

function filterCodeCondition(conditionVar: any, conditionFor: any) {
    if (conditionVar != "") {
        let newBrandsIds: any = (conditionVar !== '' && conditionVar != null) ? conditionVar.split(",") : [];
        return (newBrandsIds.length > 0) ? (`${conditionFor} IN (${newBrandsIds.map((d: any) => { return `'${d}'` }).join(',')})`) : ``;
    } else {
        return `${conditionFor} = ''`;
    }
}

module.exports = app;
