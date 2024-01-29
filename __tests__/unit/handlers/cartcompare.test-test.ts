import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/CartCompare Items', () => { 
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

    it('Compare cart with no login with valid cart items',async () =>{
        const res = await request(serverPath)
        .post("/cart/compareNoLogin")
        .send({ 
            cart_items: [{"eezly_item_id":53612,"quantity":1},{"eezly_item_id":53613,"quantity":1}], 
            lang: `fr`,
        });
        expect(res.body.status).toBe(true);
    });

    it('Compare cart with no login with in-valid cart items',async () =>{
        const res = await request(serverPath)
        .post("/cart/compareNoLogin")
        .send({ 
            cart_items: ``, 
            lang: `fr`,
        });
        expect(res.body.status).toBe(false);
    });

    it('Compare cart with no login with valid store ids',async () =>{
        const res = await request(serverPath)
        .post("/cart/compare")
        .send({ 
            stores: `1,2`,
            lang: `en`,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Compare cart with no login with in-valid store ids',async () =>{
        const res = await request(serverPath)
        .post("/cart/compare")
        .send({ 
            stores: ``,
            lang: `en`,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('Compare valid cart with valid cart id',async () =>{
        const res = await request(serverPath)
        .post("/cart/compareValidatedCart")
        .send({ 
            cart_id: `1`,
            lang: `fr`,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Compare valid cart with in-valid cart id',async () =>{
        const res = await request(serverPath)
        .post("/cart/compareValidatedCart")
        .send({ 
            cart_id: `-1`,
            lang: `fr`,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('Compare admin cart with valid cart id',async () =>{
        const res = await request(serverPath)
        .post("/cart/compareAdmin")
        .send({ 
            cart_id: `1`,
            lang: `fr`,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Compare admin cart with in-valid cart id',async () =>{
        const res = await request(serverPath)
        .post("/cart/compareAdmin")
        .send({ 
            cart_id: `-1`,
            lang: `fr`,
        })
        .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

});