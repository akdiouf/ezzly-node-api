"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = require("jsonwebtoken");
require('dotenv').config({ path: './.env' });
const verifyToken = (req, res, next) => {
    let token = req.body.token || req.query.token || req.headers["authorization"];
    if (token == null) {
        return res.status(403).json({
            status: "failed",
            message: "A token is required for authentication"
        });
    }
    token = token.split(' ')[1];
    if (!token) {
        return res.status(403).json({
            status: "failed",
            message: "A token is required for authentication"
        });
    }
    try {
        req.body.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
    }
    catch (err) {
        return res.status(401).json({
            status: false,
            message: err.message
        });
    }
    return next();
};
module.exports = verifyToken;
