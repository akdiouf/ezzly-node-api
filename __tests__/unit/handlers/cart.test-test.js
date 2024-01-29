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
describe('/Cart Items', () => {
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
    it('check if true status in cart with valid cart id', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/cart/getCartDetails?cart_id=1&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('check if true status in cart with in-valid cart id', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/cart/getCartDetails?cart_id=-1&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
    it('check if data available in cart', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/cart/getCartDetails?cart_id=1&no_of_records=10")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.cart.length).toBeGreaterThan(0);
    }));
    it('check if true in getCartsByStatus with valid status', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/cart/getCartsByStatus?status=1&no_of_records=10&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('check if true in getCartsByStatus with invalid status', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .get("/cart/getCartsByStatus?status=-1&no_of_records=10&lang=en")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
    it('Add data in cart', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .post("/cart/add")
            .send({
            cart_items: [
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
    }));
    it('check if data clears in cart with auth token', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .delete("/cart/clear")
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('check if data clears in cart without auth token', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .delete("/cart/clear");
        expect(res.body.status).toBe(false);
    }));
    it('submit admin cart with valid cart id', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/cart/submitAdminCart?cart_id=1")
            // TODO: Adeel
            // .send({
            //     cart_id:1
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('submit admin cart with in-valid cart id', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/cart/submitAdminCart?cart_id=-1")
            // TODO: Adeel
            // .send({
            //     cart_id:1
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
    it('remove cart item with valid eezly_item_id', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/cart/removeCartItem?eezly_item_id=1&no_of_records=10")
            // TODO: Adeel
            // .send({
            //     eezly_item_id:1,
            //     no_of_records:10
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(true);
    }));
    it('remove cart item with in-valid eezly_item_id', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(serverPath)
            .put("/cart/removeCartItem?eezly_item_id=-1&no_of_records=10")
            // TODO: Adeel
            // .send({
            //     eezly_item_id:-1,
            //     no_of_records:10
            // })
            .set('Authorization', 'Bearer ' + token);
        expect(res.body.status).toBe(false);
    }));
});
