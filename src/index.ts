import express, { Request, Response, Application } from 'express';

require('dotenv').config({ path: './.env' });
const https = require("https");
const fs = require("fs");
const app: Application = express();
const URL = process.env.URL || 8000;
const PORT = process.env.PORT || "http://localhost";
const path = require("path");
const cors = require('cors');
const BaseUrl = `${URL}:${PORT}`;
//const {init} = require('./../lib/db');
import { dbCon } from './modules/db.modules';
const bodyParser = require('body-parser');
const { DBDateFormat, RandomNumber, CheckPermission, SelectQuery, Pagination } = require('./../lib/common');
/* Routes */
const AuthRoutes = require('./routes/auth');
const UserRoutes = require('./routes/user');
const EezlyAisles = require('./routes/eezly/aisles');
const EezlyItems = require('./routes/eezly/items');
const EezlyItemsImport = require('./routes/eezly/import');
const Reconciliation = require('./routes/eezly/reconciliation');
const MergingFilter = require('./routes/eezly/mergingFilter');
const Store = require('./routes/store/store');
const Import = require('./routes/store/import');
const StoreAisles = require('./routes/store/aisles');
const Admin = require('./routes/admin/admin');
const Cart = require('./routes/cart');
const Shopping = require('./routes/shopping/shopping');
const Favorite = require('./routes/favorite/favorite');
const Dashboard = require('./routes/dashboard/config');

app.use(bodyParser.json());
app.use("/auth", AuthRoutes);
app.use("/user", UserRoutes);
app.use("/eezly_aisle", EezlyAisles);
app.use("/eezly_items", EezlyItems);
app.use("/eezly_items_import", EezlyItemsImport);
app.use("/reconciliation", Reconciliation);
app.use("/mergingFilter", MergingFilter);
app.use("/stores", Store);
app.use("/stores/import", Import);
app.use("/store_aisles", StoreAisles);
app.use("/admin", Admin);
app.use("/cart", Cart);
app.use("/shopping", Shopping);
app.use("/favorite", Favorite);
app.use('/dashboard/config', Dashboard);

app.use(cors());

app.get("/", (req: Request, res: Response): void => {
    res.send("Hello Typescript with Node.js! HURRAH!!!");
});

app.get("/public/files/:file", (req: Request, res: Response): void => {
    res.sendFile(path.resolve("./") + '/public/files/' + req.params.file as string);
});

// ONLINE SERVER
const server = https.createServer({
    key: fs.readFileSync("/etc/letsencrypt/live/" + process.env.DOMAIN + "/privkey.pem", "utf8"),
    cert: fs.readFileSync("/etc/letsencrypt/live/" + process.env.DOMAIN + "/fullchain.pem", "utf8"),
}, app);


server.listen(PORT, (): void => {
    /* MYSQL CONNECTION */
    app.set("db", dbCon);
    app.set("BaseUrl", BaseUrl);
    app.set("DBDateFormat", DBDateFormat);
    app.set("RandomNumber", RandomNumber);
    app.set("CheckPermission", CheckPermission);
    app.set("SelectQuery", SelectQuery);
    app.set("Pagination", Pagination);
    app.set("SuccessStatus", 200);
    app.set("ErrorStatus", 500);
    app.set("BadRequestStatus", 400);
    app.set("NotFoundStatus", 204);
    app.set("UnAuthorized", 401);
    console.log(`Server Running here 👉 https:localhost:${PORT}`);
});

// LOCAL SERVER
// app.listen(PORT, (): void => {
//     /* MYSQL CONNECTION */
//     init((DB: any) => {
//         app.set("db", DB);
//     });
//     app.set("BaseUrl", BaseUrl);
//     app.set("DBDateFormat", DBDateFormat);
//     app.set("RandomNumber", RandomNumber);
//     app.set("SelectQuery", SelectQuery);
//     app.set("Pagination", Pagination);
//     app.set("SuccessStatus", 200);
//     app.set("ErrorStatus", 500);
//     app.set("BadRequestStatus", 400);
//     app.set("NotFoundStatus", 204);
//     app.set("UnAuthorized", 401);
//     console.log(`Server Running here 👉 https:localhost:${PORT}`);
// });