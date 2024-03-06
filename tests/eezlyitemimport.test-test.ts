import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT as string;
    
describe('/Eezly Import Items', () => { 
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

    it('Import Eezly Items',async () =>{
        // TODO: Adeel (need to verify test in his side) 
        const res = await request(serverPath)
            .post("/eezly_items_import/importEezlyItems")
            .send({
                store:`provigo`,
                start : `6000`
            })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Update Import Eezly Items',async () =>{
        // TODO: Adeel (need to verify test in his side) 
        const res = await request(serverPath)
            .post("/eezly_items_import/updateImportEezlyItems")
            .send({
                store:`iga`,
                start : `6000`
            })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Update Eezly Items Aisle',async () =>{
        // TODO: Adeel (need to verify test in his side) 
        const res = await request(serverPath)
            .post("/eezly_items_import/updateEezlyItemsAisle")
            .send({
                store:`iga`,
                start : `6000`
            })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

    it('Remove Store Eezly Items',async () =>{
        // TODO: Adeel (need to verify test in his side) 
        const res = await request(serverPath)
            .post("/eezly_items_import/removeStoreEezlyItems")
            .send({
                store:`iga`,
                start : `6000`
            })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    });

});