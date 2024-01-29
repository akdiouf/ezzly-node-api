"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: './.env' });
const serverPath = process.env.URL + ":" + process.env.PORT;
describe('/asile Items', () => {
    var token = null;
    var username = process.env.JEST_TEST_USER;
    var pass = process.env.JEST_TEST_PASS;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        const re = yield (0, supertest_1.default)(serverPath)
            .post('/auth/login')
            .send({
            username: `${username}`,
            password: `${pass}`,
        });
        if (re) {
            token = re.body.access_token; // Or something
        }
    }));
    it('check if data and is not undefined in eezly_aisle', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_aisle?no_of_records=10&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.aisleList.length).toBeGreaterThan(0);
        expect(res.body.aisleList.length).toBeDefined;
    }));
    it('check if no_of_records works eezly_aisle', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_aisle?no_of_records=1&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.aisleList.length).toBe(1);
    }));
    it('Test to create the record in create with values', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_aisle/create")
            .send({
            name: `test-` + (Math.random() * 9999),
            name_fr: `test-` + (Math.random() * 9999),
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Test to create the record in create without values', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_aisle/create")
            .send({
            name: ``,
            name_fr: ``,
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
    it('send non unique values', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_aisle/create")
            .send({
            name: `test1`,
            name_fr: `testfr`,
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.message).toBe("Name must be unique");
    }));
});
