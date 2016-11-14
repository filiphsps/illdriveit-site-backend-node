var mongoose        = require('mongoose');
var Schema          = mongoose.Schema;

var RequestSchema = new mongoose.Schema({
    url: {
        required: true,
        type: String
    },
    ip: {
        required: true,
        type: String
    },
    
    timestamp: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Request', RequestSchema);