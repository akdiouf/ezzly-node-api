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
describe('/Eezly Import Items', () => {
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
    it('Import Eezly Items', () => __awaiter(void 0, void 0, void 0, function* () {
        // TODO: Adeel (need to verify test in his side) 
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_items_import/importEezlyItems")
            .send({
            store: `provigo`,
            start: `6000`
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Update Import Eezly Items', () => __awaiter(void 0, void 0, void 0, function* () {
        // TODO: Adeel (need to verify test in his side) 
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_items_import/updateImportEezlyItems")
            .send({
            store: `iga`,
            start: `6000`
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Update Eezly Items Aisle', () => __awaiter(void 0, void 0, void 0, function* () {
        // TODO: Adeel (need to verify test in his side) 
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_items_import/updateEezlyItemsAisle")
            .send({
            store: `iga`,
            start: `6000`
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('Remove Store Eezly Items', () => __awaiter(void 0, void 0, void 0, function* () {
        // TODO: Adeel (need to verify test in his side) 
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/eezly_items_import/removeStoreEezlyItems")
            .send({
            store: `iga`,
            start: `6000`
        })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
});
