import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;

describe('/Users APIs', () => { 
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

    it('Get user details with token send',async () =>{
        const res = await request(serverPath)
          .get("/user/getUserDetail")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(true);
    });

    it('Get user details without token send',async () =>{
        const res = await request(serverPath)
          .get("/user/getUserDetail")
          .set('Authorization', 'Bearer ');
          expect(res.body.status).toBe("failed");
          // TODO: Adeel need to be boolean 
    });

    it('Get users list',async () =>{
        const res = await request(serverPath)
          .get("/user/getAllUsers?no_of_records=10")
          .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Edit user details with valid data',async () =>{
        const res = await request(serverPath)
          .put("/user/editProfile?fullName=Trans User 1&email=test@gmail.com")
        //   TODO: Adeel
        //   .send({
        //     fullName:`test user`,
        //     email:`test@test.com`
        //   })
          .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Edit user details with in-valid data',async () =>{
        const res = await request(serverPath)
          .put("/user/editProfile")
        //   TODO: Adeel
        //   .send({
        //     fullName:``,
        //     email:``
        //   })
          .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('Change password with valid parameters',async () =>{
        const res = await request(serverPath)
          .put("/user/changePassword?user_id=2&newPassword=12345678&confirmPassword=12345678")
        //   TODO: Adeel  
        //   .send({
        //     user_id:``,
        //     newPassword:``,
        //     confirmPassword:``
        //   })
          .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });
});