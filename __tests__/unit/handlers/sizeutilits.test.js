"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: './.env' });
const sizeutils_1 = require("../lib/sizeutils");
/**
 * @jest-environment jsdom
 */
describe('Weight utilis', () => {
    it('return valid weight type for pound', () => {
        return expect((0, sizeutils_1.GetUnitType)("pounds")).toBe("Weight");
    });
    it('return valid weight type for lbs', () => {
        return expect((0, sizeutils_1.GetUnitType)("lbs")).toBe("Weight");
    });
});
describe('Volume utilis', () => {
    it('return valid volume type for meters', () => {
        return expect((0, sizeutils_1.GetUnitType)("liters")).toBe("Volume");
    });
    it('return valid volume type for gallons', () => {
        return expect((0, sizeutils_1.GetUnitType)("gallons")).toBe("Volume");
    });
});
describe('Length utilis', () => {
    it('return valid length for type centimeters', () => {
        return expect((0, sizeutils_1.GetUnitType)("centimeters")).toBe("Length");
    });
    it('return valid length for type meters', () => {
        return expect((0, sizeutils_1.GetUnitType)("meters")).toBe("Length");
    });
});
