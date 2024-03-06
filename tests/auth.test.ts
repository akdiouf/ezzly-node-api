import request from "supertest";
import env from "dotenv";
env.config({path: './.env'});
const serverPath = process.env.URL + ":" + process.env.PORT;
/**
 * @jest-environment jsdom
 */
describe('/Auth Login Items', () => { 

  var username:any = process.env.JEST_TEST_USER;
  var pass:any =  process.env.JEST_TEST_PASS;

  it('returns blank validation',async () =>{
    const res = await request(serverPath)
      .post("/auth/login")
      .send({
        username: "",
        password: '',
      })
    expect(res.statusCode).toBe(400); 
  });

  it('returns valid username/password',async () =>{
    const res = await request(serverPath)
      .post("/auth/login")
      .send({
        username: `${username}`,
        password: `${pass}`,
      })
    expect(res.statusCode).toBe(200); 
  });

  it('returns invalid username/password',async () =>{
    const res = await request(serverPath)
      .post("/auth/login")
      .send({
        username: "abc",
        password: '123',
      })
    expect(res.statusCode).toBe(401); 
  });

  it('returns 404 validation',async () =>{
    const res = await request(serverPath)
      .get("/auth/login");
    expect(res.statusCode).toBe(404);   
  });

});