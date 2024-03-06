import { dbCon } from "./db.modules";

export const RunAnyQuery = (sql: string, values: any[]) => {
    return new Promise((resolve, reject) => {
        dbCon.query(sql, values, (err: Error, data: any) => {
            if (err) {
                resolve({
                    status: false,
                    message: err.message,
                });
            }
            resolve({
                status: true,
                data: data,
            })
        });
    });
};

export let SelectQueryModule = (db: any, Table: string, Columns: string, Where: any, GroupBy: any, OrderBy: any, Limit: any, values: any[]): any => {
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
        dbCon.query(sql, values, (err: Error, data: any) => {
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

export default {
    RunAnyQuery,
    SelectQueryModule
}
