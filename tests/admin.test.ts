import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;

describe('/Admin APIs', () => { 
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

    it('Get user details with valid user id',async () =>{
        const res = await request(serverPath)
          .get("/admin/getUserDetail?user_id=2")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(true);
    });

    it('Get user details with in-valid user id',async () =>{
        const res = await request(serverPath)
          .get("/admin/getUserDetail?user_id=-2")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(false);
    });
    
});