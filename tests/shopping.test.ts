import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/Shopping Items', () => { 
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

    it('Get Shopping Lists with valid no_of_records',async () =>{
        const res = await request(serverPath)
          .get("/shopping/getShoppingLists?no_of_records=10")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(true);
    });

    it('Get Shopping Lists with in-valid no_of_records',async () =>{
        const res = await request(serverPath)
          .get("/shopping/getShoppingLists")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(false);
    });

    it('Reorder Shopping with valid lang',async () =>{
        const res = await request(serverPath)
          .get("/shopping/reorder?lang=en")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(true);
    });

    it('Reorder Shopping with in-valid lang',async () =>{
        const res = await request(serverPath)
          .get("/shopping/reorder")
          .set('Authorization', 'Bearer ' + token);
          expect(res.body.status).toBe(false);
    });

    it('Create Shopping List with valid cart id',async () =>{
        const res = await request(serverPath)
            .post("/favorite/update?eezly_item_id=1")
            .send({
                cart_id:1,
                lang : `fr`
            })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Create Shopping List with in-valid cart id',async () =>{
        const res = await request(serverPath)
            .post("/favorite/update?eezly_item_id=1")
            .send({
                cart_id:-1,
                lang : `fr`
            })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

    it('Delete shopping list with valid shopping_list_id',async () =>{
        const res = await request(serverPath)
            .delete("/shopping/deleteShoppingList?shopping_list_id=1")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Delete shopping list with in-valid shopping_list_id',async () =>{
        const res = await request(serverPath)
            .delete("/shopping/deleteShoppingList?shopping_list_id=-1")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    });

});