var mongoose        = require('mongoose');
var Schema          = mongoose.Schema;

var UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
    },
    email: {
        required: true,
        type: String,
        unique: true,
    },
    phone: {
        type: String,
    },

    first_name: {
        type: String
    },
    last_name: {
        type: String
    },
});
module.exports = mongoose.model('User', UserSchema);