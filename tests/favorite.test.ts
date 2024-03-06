import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/Favorite Items', () => { 
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

    it('get favorite all with valid lang',async () =>{
        const res = await request(serverPath)
          .get("/favorite/all?no_of_records=10&lang=en")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(true);
    });

    it('get favorite all with in-valid lang',async () =>{
        const res = await request(serverPath)
          .get("/favorite/all?no_of_records=10")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(false);
    });

    it('Favorite / unfavored eezly item with valid eezly_item_id',async () =>{
        const res = await request(serverPath)
            .put("/favorite/update?eezly_item_id=1")
            // TODO: Adeel
            // .send({
            //     eezly_item_id:1,
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Favorite / unfavored eezly item with in-valid eezly_item_id',async () =>{
        const res = await request(serverPath)
            .put("/favorite/update?eezly_item_id=-1")
            // TODO: Adeel
            // .send({
            //     eezly_item_id:-1,
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

});