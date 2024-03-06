interface String {
    removeSpecialCharactersFromNormalString(): string;
    removeSpecialCharactersFromURL(): string;
    removeAccents(): string;
}

// Remove special characters from String
String.prototype.removeSpecialCharactersFromNormalString = function () {
    return this.replace(/[®".*+?^${}()|[\]\\]/g, "");
};

// Remove special characters from URL
String.prototype.removeSpecialCharactersFromURL = function () {
    return this.replace(/["]/g, "");
};

// For Eezly import Regex
String.prototype.removeAccents = function () {
    return this.replace(/[\u0300-\u036f]/g, "");
};