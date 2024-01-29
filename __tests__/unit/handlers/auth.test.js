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
/**
 * @jest-environment jsdom
 */
describe('/Auth Login Items', () => {
    var username = process.env.JEST_TEST_USER;
    var pass = process.env.JEST_TEST_PASS;
    it('returns blank validation', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/auth/login")
            .send({
            username: "",
            password: '',
        });
        expect(res.statusCode).toBe(400);
    }));
    it('returns valid username/password', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/auth/login")
            .send({
            username: `${username}`,
            password: `${pass}`,
        });
        expect(res.statusCode).toBe(200);
    }));
    it('returns invalid username/password', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/auth/login")
            .send({
            username: "abc",
            password: '123',
        });
        expect(res.statusCode).toBe(401);
    }));
    it('returns 404 validation', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/auth/login");
        expect(res.statusCode).toBe(404);
    }));
});
