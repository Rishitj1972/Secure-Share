const { constants } = require('../constants');

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode ? res.statusCode : 500;
    
    switch(statusCode) {
        case constants.VALIDATION_ERROR:
        case constants.NOT_FOUND:
        case constants.SERVER_ERROR:
        case constants.FORBIDDEN:
        case constants.UNAUTHORIZED:
            res.json({
                title: Object.keys(constants).find(key => constants[key] === statusCode) || 'Error',
                message: err.message,
                ...(process.env.NODE_ENV === 'development' && { stackTrace: err.stack })
            });
            break;
        default:
            break;
    }
}

module.exports = errorHandler;