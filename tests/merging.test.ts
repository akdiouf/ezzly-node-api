import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;

describe('/merging Items', () => { 

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

    it('Get merging data for getEezlyAisles',async () =>{
        const res = await request(serverPath)
        .get("/mergingFilter/getEezlyAisles?brand=&size=&store=2")
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.data.length).toBeGreaterThan(1);
    });

    it('Get merging data for getEezlyBrands',async () =>{
        const res = await request(serverPath)
        .get("/mergingFilter/getEezlyBrands?eezly_aisle_id=&size=&store=2")
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.data.length).toBeGreaterThan(1);
    });

    it('Get merging data for getEezlyBrands with get request',async () =>{
        const res = await request(serverPath)
        .get("/mergingFilter/getEezlySizes?eezly_aisle_id=19&brand=Coolibah")
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Get merging data for getEezlyBrands with post request',async () =>{
        const res = await request(serverPath)
        .post("/mergingFilter/getEezlySizes?eezly_aisle_id=19&brand=Coolibah")
        .set('Authorization', 'Bearer ' + token);
        expect(res.statusCode).toBe(404);
    });

});