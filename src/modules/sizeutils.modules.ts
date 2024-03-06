export let ScaleAndChangeUnits = (amount:any,unit:any,targetSystem:any)=>{    
    let convertedAmount:any = 0;
    let returnValue:any = "";
    if(amount == undefined || amount == null || amount == ""){
        throw new Error('amount value required!')
    }
    if(unit == undefined || unit == null || unit == "" ){
        throw new Error("unit value required!");
    }
    if(targetSystem == undefined || targetSystem == null || targetSystem == ""){
        throw new Error("targetSystem value required!");
    }
    if (targetSystem == "metric"){
        if (unit == "inches"){
            convertedAmount = amount * 2.54; // Convert to centimeters
            if (convertedAmount >= 100){
                returnValue = (convertedAmount / 100) + " meters"
            } else {
                returnValue = convertedAmount + " centimeters"
            }
        } else if(unit == "feet"){
            convertedAmount = amount * 30.48  // Convert to centimeters
            returnValue = (convertedAmount / 100) + " meters"
        } else if (unit == "pounds"){
            convertedAmount = amount * 0.453592  // Convert to kilograms
            if (convertedAmount >= 1000){
                returnValue = (convertedAmount / 1000) + " tons";
            } else {
                returnValue = convertedAmount + " kilograms";
            }
        }
        return returnValue;
    }else if (targetSystem == "imperial"){
        if (unit == "centimeters"){
            convertedAmount = amount / 2.54  // Convert to inches
            if (convertedAmount >= 12){
                returnValue = (convertedAmount / 12) + " feet";
            } else {
                returnValue = convertedAmount + " inches";
            }
        } else if (unit == "meters"){
            convertedAmount = amount * 3.281;  // Convert to feet
            returnValue = convertedAmount + " feet";
        } else if (unit == "kilograms"){
            convertedAmount = amount * 2.20462;  // Convert to pounds
            if (convertedAmount >= 2000){
                returnValue = (convertedAmount / 2000) + " tons";
            } else {
                returnValue = convertedAmount + " pounds";
            }
        }
        return returnValue;
    } else {
        return "Invalid target system";
    }
}

export let GetUnitType = (unit : string)=> {
    let normalizedUnit:string = unit.toLowerCase();
    // Define lists of units for each category
    let weightUnits:any = ["pounds", "lbs"];// TODO @Mouhamed Ndiaye provide full list
    let volumeUnits:any = ["gallons", "liters"];
    let lengthUnits:any = ["meters", "centimeters"];
    if(weightUnits.indexOf(normalizedUnit) >= 0) {
        return "Weight";
    } else if (volumeUnits.indexOf(normalizedUnit) >= 0) {
        return "Volume";
    } else if (lengthUnits.indexOf(normalizedUnit) >= 0) {
        return "Length";
    } else {
        throw new Error(`unit not accounted for ${normalizedUnit}`);
    }
}

export default{
    ScaleAndChangeUnits,
    GetUnitType,
};