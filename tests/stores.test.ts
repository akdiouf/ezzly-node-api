import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/Stores Items', () => { 
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

    it('check if data available in stores',async () =>{
      const res = await request(serverPath)
        .get("/stores");
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('Create store with valid parameters',async () =>{
        const res = await request(serverPath)
        .post("/stores/create")
        .send({ 
            name: `test-`+(Math.random() * 9999), 
            thumbnail:`http://test-`+(Math.random() * 9999),
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Create store with invalid parameters',async () =>{
        const res = await request(serverPath)
        .post("/stores/create")
        .send({ 
            name: ``, 
            thumbnail:``,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('search with all valid parameters',async () =>{
        const res = await request(serverPath)
          .get("/stores/search?search=tofu&store=iga&no_of_records=10")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('search with "search" invalid parameters',async () =>{
        const res = await request(serverPath)
          .get("/stores/search?store=iga&no_of_records=10")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(false);
    });

    it('search with "store" invalid parameters',async () =>{
        const res = await request(serverPath)
          .get("/stores/search?search=tofu&no_of_records=10")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(false);
    });
});