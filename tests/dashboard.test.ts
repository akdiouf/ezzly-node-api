import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;

describe('/Dashboard APIs', () => { 
    it('dashboard get config with valid parameters',async () =>{
        const res = await request(serverPath)
          .get("/dashboard/config?contexts=development")
          expect(res.body.status).toBe(true);
    });
});

describe('/Dashboard APIs', () => { 
    it('dashboard get config with in-valid parameters',async () =>{
        const res = await request(serverPath)
          .get("/dashboard/config")
          expect(res.body.status).toBe(false);
    });
});