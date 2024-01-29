"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckRequiredValidation = void 0;
let CheckRequiredValidation = (data) => {
    return new Promise(((resolve, reject) => {
        let message = '';
        data.forEach((item, index) => {
            message = '';
            switch (item.type) {
                case 'Empty':
                    if (!item.value) {
                        message = item.field + ' is required';
                    }
                    break;
                case 'Length':
                    if (item.value.length < 8 || item.value.length > 255) {
                        message = item.field + ' must be at-least 8 characters and maximum of 255 characters long';
                    }
                    break;
                case 'Length maximum 255 characters':
                    if ((item.value) && (item.value.length > 255)) {
                        message = item.field + ' length must be maximum of 255 characters long';
                    }
                    break;
                case 'Confirm Password':
                    const passwordIndex = data.findIndex((item1) => item1.field === 'Password');
                    const confirmPasswordIndex = data.findIndex((item1) => item1.field === 'Confirm password');
                    if (passwordIndex !== -1 && confirmPasswordIndex !== -1) {
                        let password = data[passwordIndex].value;
                        let confirmPassword = data[confirmPasswordIndex].value;
                        if (password !== confirmPassword) {
                            message = item.field + 'not matched';
                        }
                    }
                    break;
            }
            if (message !== '') {
                resolve({
                    status: false,
                    message: message
                });
            }
        });
        resolve({
            status: true
        });
    }));
};
exports.CheckRequiredValidation = CheckRequiredValidation;
exports.default = {
    CheckRequiredValidation: exports.CheckRequiredValidation
};
