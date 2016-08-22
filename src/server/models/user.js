var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var userSchema = new Schema({
    _id: String,
    details: {
      githubUser: String,
      displayName: String
    },
    status: {
      value: String,
      'last-modified': String
    },
    message: {
      value: String,
      sender: String,
      'last-modified': String
    },
    slots: {
      value: [String]
    }
});

var user = mongoose.model('user', userSchema);
module.exports = user;
