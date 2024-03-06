import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/Cart Items', () => { 
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

    it('check if true status in cart with valid cart id',async () =>{
        const res = await request(serverPath)
            .get("/cart/getCartDetails?cart_id=1&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('check if true status in cart with in-valid cart id',async () =>{
        const res = await request(serverPath)
            .get("/cart/getCartDetails?cart_id=-1&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('check if data available in cart',async () =>{
        const res = await request(serverPath)
            .get("/cart/getCartDetails?cart_id=1&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.cart.length).toBeGreaterThan(0);
    });

    it('check if true in getCartsByStatus with valid status',async () =>{
        const res = await request(serverPath)
            .get("/cart/getCartsByStatus?status=1&no_of_records=10&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('check if true in getCartsByStatus with invalid status',async () =>{
        const res = await request(serverPath)
            .get("/cart/getCartsByStatus?status=-1&no_of_records=10&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('Add data in cart',async () =>{
        const res = await request(serverPath)
            .post("/cart/add")
            .send({
                cart_items:[
                    {
                        "eezly_item_id": 27173,
                        "quantity": 2
                    },
                    {
                        "eezly_item_id": 27174,
                        "quantity": 1
                    }
                ]
            })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.message).toBe("Cart updated successfully");
        expect(res.body.status).toBe(true);
    });

    it('check if data clears in cart with auth token',async () =>{
        const res = await request(serverPath)
            .delete("/cart/clear")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('check if data clears in cart without auth token',async () =>{
        const res = await request(serverPath)
            .delete("/cart/clear");
        expect(res.body.status).toBe(false);
    });

    it('submit admin cart with valid cart id',async () =>{
        const res = await request(serverPath)
            .put("/cart/submitAdminCart?cart_id=1")
            // TODO: Adeel
            // .send({
            //     cart_id:1
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('submit admin cart with in-valid cart id',async () =>{
        const res = await request(serverPath)
            .put("/cart/submitAdminCart?cart_id=-1")
            // TODO: Adeel
            // .send({
            //     cart_id:1
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('remove cart item with valid eezly_item_id',async () =>{
        const res = await request(serverPath)
            .put("/cart/removeCartItem?eezly_item_id=1&no_of_records=10")
            // TODO: Adeel
            // .send({
            //     eezly_item_id:1,
            //     no_of_records:10
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('remove cart item with in-valid eezly_item_id',async () =>{
        const res = await request(serverPath)
            .put("/cart/removeCartItem?eezly_item_id=-1&no_of_records=10")
            // TODO: Adeel
            // .send({
            //     eezly_item_id:-1,
            //     no_of_records:10
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

})