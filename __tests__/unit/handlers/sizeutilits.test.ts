import env from "dotenv";
env.config({path: './.env'});
import {GetUnitType} from "../lib/sizeutils";
/**
 * @jest-environment jsdom
 */
describe('Weight utilis', () => { 
    it('return valid weight type for pound', () =>{ 
        return expect(GetUnitType("pounds")).toBe("Weight"); 
    });
    it('return valid weight type for lbs', () =>{ 
        return expect(GetUnitType("lbs")).toBe("Weight"); 
    });
});

describe('Volume utilis', () => { 
    it('return valid volume type for meters', () =>{ 
        return expect(GetUnitType("liters")).toBe("Volume"); 
    });
    it('return valid volume type for gallons', () =>{ 
        return expect(GetUnitType("gallons")).toBe("Volume"); 
    });
});

describe('Length utilis', () => { 
    it('return valid length for type centimeters', () =>{ 
        return expect(GetUnitType("centimeters")).toBe("Length"); 
    });
    it('return valid length for type meters', () =>{ 
        return expect(GetUnitType("meters")).toBe("Length"); 
    });
});