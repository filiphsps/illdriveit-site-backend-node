var mongoose        = require('mongoose');
var Schema          = mongoose.Schema;

var ContractSchema = new mongoose.Schema({
    _id: {
        required: true,
        type: Number
    },
    
    blob: {
        required: true,
        type: String
    },

});
module.exports = mongoose.model('Contract', ContractSchema);