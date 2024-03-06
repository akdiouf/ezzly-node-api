import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/Store Import Items', () => { 
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

    it('Stores data import with valid parameter',async () =>{
        // TODO: Adeel (need to verify test in his side) 
        const res = await request(serverPath)
            .get("/stores/import?object_key=2023/45/iga_en.json")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Stores data import with in-valid parameter',async () =>{
        // TODO: Adeel (need to verify test in his side) 
        const res = await request(serverPath)
            .get("/stores/import?object_key=")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('Stores data import original with valid store',async () =>{
        // TODO: Adeel (need to verify test in his side) 
        const res = await request(serverPath)
            .get("/stores/import?store=walmart&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Stores Data Import Original with in-valid store',async () =>{
        // TODO: Adeel (need to verify test in his side) 
        const res = await request(serverPath)
            .get("/stores/import?store=&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

});