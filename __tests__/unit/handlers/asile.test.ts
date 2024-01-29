import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/asile Items', () => { 
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

    it('check if data and is not undefined in eezly_aisle',async () =>{
      const res = await request(serverPath)
        .get("/eezly_aisle?no_of_records=10&lang=en")
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.aisleList.length).toBeGreaterThan(0);
        expect(res.body.aisleList.length).toBeDefined;
    });

    it('check if no_of_records works eezly_aisle',async () =>{
        const res = await request(serverPath)
          .get("/eezly_aisle?no_of_records=1&lang=en")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.aisleList.length).toBe(1);
    });

    it('Test to create the record in create with values',async () =>{
        const res = await request(serverPath)
          .post("/eezly_aisle/create")
          .send({ 
            name: `test-`+(Math.random() * 9999), 
            name_fr: `test-`+(Math.random() * 9999), 
            })
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(true);
      });

    it('Test to create the record in create without values',async () =>{
    const res = await request(serverPath)
        .post("/eezly_aisle/create")
        .send({ 
        name: ``,
        name_fr: ``,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('send non unique values',async () =>{
        const res = await request(serverPath)
            .post("/eezly_aisle/create")
            .send({ 
            name: `test1`,
            name_fr: `testfr`,
            })
            .set('Authorization', 'Bearer ' + token);
            expect(res.body.message).toBe("Name must be unique");
    });
});