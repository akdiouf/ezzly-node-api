import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/eezly_items Items', () => { 
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

    it('check if data available in eezly_items',async () =>{
      const res = await request(serverPath)
        .get("/eezly_items?no_of_records=10&lang=en")
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('check if data available in getEezlyItemByAisleId',async () =>{
        const res = await request(serverPath)
          .get("/eezly_items/getEezlyItemByAisleId?eezly_aisle_id=17&no_of_records=10")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('check if length works for getEezlyItemByAisleId',async () =>{
        const res = await request(serverPath)
          .get("/eezly_items/getEezlyItemByAisleId?eezly_aisle_id=17&no_of_records=5")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.data.length).toBe(5);
    });

    it('Search Eezly items via valid ID',async () =>{
        const res = await request(serverPath)
          .get("/eezly_items/search?search_by_id=1")
          expect(res.body.data.length).toBe(1);
    });

    it('Search Eezly items via Invalid ID',async () =>{
        const res = await request(serverPath)
          .get("/eezly_items/search?search_by_id=-1")
          expect(res.body.data.length).toBe(0);
    });

    it('Algolia Search via all parameters',async () =>{
        const res = await request(serverPath)
          .get("/eezly_items/algoliaSearch?keyword=orange&lang=en&environment=dev&page=0")
          expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Algolia Search with missing environment variable',async () =>{
        const res = await request(serverPath)
          .get("/eezly_items/algoliaSearch?keyword=orange&lang=en&page=0")
          expect(res.body.message).toBe("Invalid searching parameters");
    });

    it('Create records in eezly_items with all valid data',async () =>{
        const res = await request(serverPath)
        .post("/eezly_items/create")
        .send({ 
            name: `test1`, 
            name_fr: `testfr`, 
            thumbnail:`http://fakepath.com`,
            eezly_aisle_id:`17`,
            brand:`Lays`,
            size:`100 g`
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Create records in eezly_items with asile id missing',async () =>{
        const res = await request(serverPath)
        .post("/eezly_items/create")
        .send({ 
            name: `test-`+(Math.random() * 9999), 
            name_fr: `testfr-`+(Math.random() * 9999), 
            thumbnail:`http://fakepath.com`,
            brand:`Lays`,
            size:`100 g`
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('Update records in eezly_items with all valid data',async () =>{
        const res = await request(serverPath)
        .put("/eezly_items/update")
        .send({ 
            eezly_item_id:`1`,
            name: `test1`, 
            name_fr: `testfr`, 
            thumbnail:`http://fakepath.com`,
            eezly_aisle_id:`17`,
            brand:`Lays`,
            size:`100 g`,
            listed: `false`
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Update records in eezly_items with missing data',async () =>{
        const res = await request(serverPath)
        .put("/eezly_items/update")
        .send({ 
            eezly_item_id:`1`,
            name: `test1`, 
            name_fr: `testfr`, 
            thumbnail:`http://fakepath.com`,
            eezly_aisle_id:`17`,
            brand:`Lays`,
            size:`100 g`,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

});