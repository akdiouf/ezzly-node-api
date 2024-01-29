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
describe('/Stores Items', () => {
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
    it('check if data available in stores', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/stores");
        expect(res.body.length).toBeGreaterThan(0);
    }));
    it('Create store with valid parameters', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/stores/create")
            .send({
            name: `test-` + (Math.random() * 9999),
            thumbnail: `http://test-` + (Math.random() * 9999),
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Create store with invalid parameters', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/stores/create")
            .send({
            name: ``,
            thumbnail: ``,
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
    it('search with all valid parameters', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/stores/search?search=tofu&store=iga&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.data.length).toBeGreaterThan(0);
    }));
    it('search with "search" invalid parameters', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/stores/search?store=iga&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
    it('search with "store" invalid parameters', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/stores/search?search=tofu&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
});
