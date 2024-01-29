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
describe('/Users APIs', () => {
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
    it('Get user details with token send', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/user/getUserDetail")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Get user details without token send', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/user/getUserDetail")
            .set('Authorization', 'Bearer ');
        expect(res.body.status).toBe("failed");
        // TODO: Adeel need to be boolean 
    }));
    it('Get users list', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/user/getAllUsers?no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    }));
    it('Edit user details with valid data', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/user/editProfile?fullName=Trans User 1&email=test@gmail.com")
            //   TODO: Adeel
            //   .send({
            //     fullName:`test user`,
            //     email:`test@test.com`
            //   })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Edit user details with in-valid data', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/user/editProfile")
            //   TODO: Adeel
            //   .send({
            //     fullName:``,
            //     email:``
            //   })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
    it('Change password with valid parameters', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/user/changePassword?user_id=2&newPassword=12345678&confirmPassword=12345678")
            //   TODO: Adeel  
            //   .send({
            //     user_id:``,
            //     newPassword:``,
            //     confirmPassword:``
            //   })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
});
