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
describe('/eezly_items Items', () => {
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
    it('check if data available in eezly_items', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_items?no_of_records=10&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.data.length).toBeGreaterThan(0);
    }));
    it('check if data available in getEezlyItemByAisleId', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_items/getEezlyItemByAisleId?eezly_aisle_id=17&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.data.length).toBeGreaterThan(0);
    }));
    it('check if length works for getEezlyItemByAisleId', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_items/getEezlyItemByAisleId?eezly_aisle_id=17&no_of_records=5")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.data.length).toBe(5);
    }));
    it('Search Eezly items via valid ID', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_items/search?search_by_id=1");
        expect(res.body.data.length).toBe(1);
    }));
    it('Search Eezly items via Invalid ID', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_items/search?search_by_id=-1");
        expect(res.body.data.length).toBe(0);
    }));
    it('Algolia Search via all parameters', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_items/algoliaSearch?keyword=orange&lang=en&environment=dev&page=0");
        expect(res.body.data.length).toBeGreaterThan(0);
    }));
    it('Algolia Search with missing environment variable', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/eezly_items/algoliaSearch?keyword=orange&lang=en&page=0");
        expect(res.body.message).toBe("Invalid searching parameters");
    }));
    it('Create records in eezly_items with all valid data', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_items/create")
            .send({
            name: `test1`,
            name_fr: `testfr`,
            thumbnail: `http://fakepath.com`,
            eezly_aisle_id: `17`,
            brand: `Lays`,
            size: `100 g`
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Create records in eezly_items with asile id missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_items/create")
            .send({
            name: `test-` + (Math.random() * 9999),
            name_fr: `testfr-` + (Math.random() * 9999),
            thumbnail: `http://fakepath.com`,
            brand: `Lays`,
            size: `100 g`
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
    it('Update records in eezly_items with all valid data', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/eezly_items/update")
            .send({
            eezly_item_id: `1`,
            name: `test1`,
            name_fr: `testfr`,
            thumbnail: `http://fakepath.com`,
            eezly_aisle_id: `17`,
            brand: `Lays`,
            size: `100 g`,
            listed: `false`
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Update records in eezly_items with missing data', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/eezly_items/update")
            .send({
            eezly_item_id: `1`,
            name: `test1`,
            name_fr: `testfr`,
            thumbnail: `http://fakepath.com`,
            eezly_aisle_id: `17`,
            brand: `Lays`,
            size: `100 g`,
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
});
