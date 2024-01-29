let DBDateFormat = ():string => {
    const dateObject = new Date();
    const date = dateObject.getDate() < 10? "0" + dateObject.getDate() : dateObject.getDate();
    const month = (dateObject.getMonth() + 1) < 10? "0" + (dateObject.getMonth() + 1) : (dateObject.getMonth() + 1);
    const year = dateObject.getFullYear();
    const hours = dateObject.getHours() < 10? "0" + dateObject.getHours() : dateObject.getHours();
    const minutes = dateObject.getMinutes() < 10? "0" + dateObject.getMinutes() : dateObject.getMinutes();
    const seconds = dateObject.getSeconds() < 10? "0" + dateObject.getSeconds() : dateObject.getSeconds();
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
};

let RandomNumber = (Min:number, Max:number):number => {
    return Math.round(Math.random() * (Max - Min) + Min);
};

let CheckPermission = (db:any, Role:number, Permission:string):any => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM roles WHERE title = '${Permission}'`;
        db.query(sql, (err: Error, result: any) => {
            if (err) {
                resolve({
                    status: false
                });
            }
            resolve({
                status: Role <= result[0].id
            });
        });
    });
};

let SelectQuery = (db:any, Table:string, Columns:string, Where:any, GroupBy:any, OrderBy:any, Limit:any):any => {
    return new Promise((resolve, reject) => {
        let WhereClause = "";
        let GroupByClause = "";
        let OrderByClause = "";
        let LimitClause = "";
        Where !== null? WhereClause = ` WHERE ${Where}` : WhereClause = "";
        GroupBy !== null? GroupByClause = GroupBy : GroupByClause = "";
        OrderBy !== null? OrderByClause = OrderBy : OrderByClause = "";
        Limit !== null? LimitClause = Limit : LimitClause = "";
        let sql = `SELECT ${Columns} FROM ${Table}${WhereClause}${GroupByClause}${OrderByClause}${LimitClause}`;
        db.query(sql, (err: Error, data: any) => {
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

let Pagination = (req:any, RequestUrl:string, Page:number, NoOfRecords:number, TotalRecords:number):any => {
    let TotalPages = Math.ceil(TotalRecords / NoOfRecords);
    if(TotalPages === 0) {
        TotalPages = 1;
    }
    let From:any = 0;
    let To:any = 0;
    let Links = [];
    let FirstPageUrl:any = "";
    let PreviousPageUrl:any = "";
    let NextPageUrl:any = "";
    let LastPageUrl:any = "";
    let LastPage:any = TotalPages;
    Links.push({
        url: null,
        label: "&laquo; Previous",
        active: false
    });
    for (let i:number = 1; i <= TotalPages; i++) {
        (TotalPages === i)? LastPageUrl = RequestUrl + "?page=" + i : LastPageUrl = null;
        if(i === Page) {
            Links.push({
                url: RequestUrl + "?page=" + i,
                label: i.toString(),
                active: true
            });
        } else {
            Links.push({
                url: RequestUrl + "?page=" + i,
                label: i.toString(),
                active: false
            });
        }
    }
    FirstPageUrl = RequestUrl + "?page=1";
    (Page - 1 === 0)? PreviousPageUrl = null : PreviousPageUrl = RequestUrl + "?page=" + (Page - 1);
    (Page === TotalPages) ? NextPageUrl = null : NextPageUrl = RequestUrl + "?page=" + (Page + 1);
    Links.push({
        url: NextPageUrl,
        label: "Next &raquo;",
        active: false
    });
    From = ((Page - 1) * NoOfRecords) + 1;
    if (NoOfRecords < TotalRecords) {
        To = NoOfRecords * Page;
        if (To > TotalRecords) {
            To = TotalRecords;
        }
    } else {
        To = TotalRecords;
    }
    if(TotalRecords === 0) {
        From = null;
        To = null;
        PreviousPageUrl = null;
        NextPageUrl = null;
        LastPageUrl = FirstPageUrl;
        LastPage = 1;
    }
    return {
        status: null,
        current_page: Page,
        data: null,
        first_page_url: FirstPageUrl,
        from: From,
        last_page: LastPage,
        last_page_url: LastPageUrl,
        links: Links,
        next_page_url: NextPageUrl,
        path: RequestUrl,
        per_page: NoOfRecords,
        prev_page_url: PreviousPageUrl,
        to: To,
        total: TotalRecords
    };
};

module.exports = {
    DBDateFormat,
    RandomNumber,
    CheckPermission,
    SelectQuery,
    Pagination
};
