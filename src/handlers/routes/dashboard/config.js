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
const http_status_codes_1 = require("http-status-codes");
const common_modules_1 = require("../../modules/common.modules");
require('dotenv').config({ path: './.env' });
const app = (0, express_1.default)();
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
const streamToPromise = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
});
// Get config
app.get("/", (req, res) => {
    let db = app.get("db");
    let User = req.body.user;
    let Contexts = process.env.ENVIRONMENT === 'prod' ? 'production' : 'development';
    let FetchData = () => __awaiter(void 0, void 0, void 0, function* () {
        const params = {
            Bucket: process.env.DASHBOARD_BUCKET,
            Key: 'dashboard/' + Contexts + '/config.json'
        };
        try {
            const data = yield s3Client.send(new GetObjectCommand(params));
            const body = yield streamToPromise(data.Body).then((data) => data.toString('utf-8'));
            const _JSONData = JSON.parse(body);
            Response(_JSONData);
        }
        catch (error) {
            return (0, common_modules_1.GenerateErrorResponse)(res, error);
        }
    });
    let Response = (data) => {
        // TODO @adeel needs to modify the response to follow the same response pattern status and data
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            status: true,
            dashboard: data
        });
    };
    // Start
    FetchData();
});
module.exports = app;
