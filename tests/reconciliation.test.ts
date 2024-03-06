import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;

describe('/reconcillation Items', () => { 

    var token:any = null;
    var username:any = process.env.JEST_TEST_USER;
    var pass:any =  process.env.JEST_TEST_PASS;

    beforeAll(async () => {
        const re = await request(serverPath)
            .post('/auth/login')
            .send({ 
                username: `${username}`,
                password: `${pass}`,
            });
        if(re){
            token = re.body.access_token; // Or something
        }
    });

    it('Get reconciliation for valid ID',async () =>{
        const res = await request(serverPath)
        .get("/reconciliation?eezly_item_id=9003")
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Get reconciliation for in-valid ID',async () =>{
        const res = await request(serverPath)
        .get("/reconciliation?eezly_item_id=-9003")
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('Skip reconciliation for Valid ID',async () =>{
        const res = await request(serverPath)
        .post("/reconciliation/skip")
        .send({
            eezly_item_id:`1`,
            eezly_aisle_id:`1`
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Skip reconciliation for in-valid ID',async () =>{
        const res = await request(serverPath)
        .post("/reconciliation/skip")
        .send({
            eezly_item_id:-1,
            eezly_aisle_id:1
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

});