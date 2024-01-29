import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;

describe('/store_aisles APIs', () => { 
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

    it('check if data available in store_aisles',async () =>{
      const res = await request(serverPath)
        .get("/store_aisles?no_of_records=5")
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('check if data available in get_aisles with storeid',async () =>{
        const res = await request(serverPath)
          .get("/store_aisles/get_aisles?store_id=1&no_of_records=5")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('check if data available in get_aisles without storeid',async () =>{
        const res = await request(serverPath)
          .get("/store_aisles/get_aisles?no_of_records=5")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.message).toBe("Store id is required!");
    });

    it('Create store_aisles with valid parameters',async () =>{
        const res = await request(serverPath)
        .post("/store_aisles/create")
        .send({ 
            store_id: `1`, 
            name:`test-`+(Math.random() * 9999),
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Create store_aisles with in-valid parameters',async () =>{
        const res = await request(serverPath)
        .post("/store_aisles/create")
        .send({ 
            store_id: ``, 
            name:`test-`+(Math.random() * 9999),
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

});