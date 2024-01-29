"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectQueryModule = exports.RunAnyQuery = void 0;
const db_modules_1 = require("./db.modules");
const RunAnyQuery = (sql) => {
    return new Promise((resolve, reject) => {
        db_modules_1.dbCon.query(sql, (err, data) => {
            if (err) {
                resolve({
                    status: false,
                    message: err.message,
                });
            }
            resolve({
                status: true,
                data: data,
            });
        });
    });
};
exports.RunAnyQuery = RunAnyQuery;
let SelectQueryModule = (db, Table, Columns, Where, GroupBy, OrderBy, Limit) => {
    return new Promise((resolve, reject) => {
        let WhereClause = "";
        let GroupByClause = "";
        let OrderByClause = "";
        let LimitClause = "";
        Where !== null ? WhereClause = ` WHERE ${Where}` : WhereClause = "";
        GroupBy !== null ? GroupByClause = GroupBy : GroupByClause = "";
        OrderBy !== null ? OrderByClause = OrderBy : OrderByClause = "";
        Limit !== null ? LimitClause = Limit : LimitClause = "";
        let sql = `SELECT ${Columns} FROM ${Table}${WhereClause}${GroupByClause}${OrderByClause}${LimitClause}`;
        db_modules_1.dbCon.query(sql, (err, data) => {
            if (err) {
                resolve({
                    status: false,
                    message: err.message,
                });
            }
            resolve({
                status: true,
                data: data,
            });
        });
    });
};
exports.SelectQueryModule = SelectQueryModule;
exports.default = {
    RunAnyQuery: exports.RunAnyQuery,
    SelectQueryModule: exports.SelectQueryModule
};
