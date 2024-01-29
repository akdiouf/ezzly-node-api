"use strict";
String.prototype.removeSpecialCharactersFromNormalString = function () {
    return this.replace(/[".*+?^${}()|[\]\\]/g, "");
};
String.prototype.removeSpecialCharactersFromURL = function () {
    return this.replace(/["]/g, "");
};
