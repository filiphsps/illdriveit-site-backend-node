var mongoose        = require('mongoose');
var Schema          = mongoose.Schema;

var ContractSchema = new mongoose.Schema({
    _id: {
        required: true,
        type: Number
    },
    id: {
        required: true,
        type: Number
    },
    
    blob: {
        required: true,
        type: String
    },


    user: {
        require: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});
module.exports = mongoose.model('Contract', ContractSchema);