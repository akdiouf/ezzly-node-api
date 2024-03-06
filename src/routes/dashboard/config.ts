import express, { Request, Response, Application } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GenerateErrorResponse } from "../../modules/common.modules";

require('dotenv').config({ path: './.env' });
const app: Application = express();
const formData = require('express-form-data');
const os = require("os");
const cors = require('cors');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
app.use(cors());
app.use(formData.parse({
    uploadDir: os.tmpdir(),
    autoClean: true
}));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());

// AWS SDK v3 Configuration
const s3Client = new S3Client({
    region: process.env.S3_DASHBOARD_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    },
});
const streamToPromise = (stream: any) =>
    new Promise((resolve, reject) => {
        const chunks: any = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });

// Get config
app.get("/", (req: Request, res: Response): any => {
    let Contexts: any = process.env.ENVIRONMENT === 'prod' ? 'production' : 'development';

    let FetchData = async (): Promise<any> => {
        const params = {
            Bucket: process.env.DASHBOARD_BUCKET,
            Key: 'dashboard/' + Contexts + '/config.json'
        };
        try {
            const data = await s3Client.send(new GetObjectCommand(params));
            const body = await streamToPromise(data.Body).then((data: any) => data.toString('utf-8'));
            const _JSONData = JSON.parse(body);
            Response(_JSONData);
        } catch (error: any) {
            return GenerateErrorResponse(res, error);
        }
    };

    let Response = (data: any): any => {
        // TODO @adeel needs to modify the response to follow the same response pattern status and data
        return res.status(StatusCodes.OK).json({
            status: true,
            dashboard: data
        });
    };

    /* Start */
    FetchData();
});

module.exports = app;