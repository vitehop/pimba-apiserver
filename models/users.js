// --------------------
// USER
// --------------------
var mongoose     = require('mongoose');
var bcrypt		 = require('bcrypt-nodejs');
var Schema       = mongoose.Schema;
var SALT_WORK_FACTOR = 10;
 


var UserSchema = new Schema({
  username: {type: String, unique: true, required: true},
  password: {type: String, required: true},
  perspectives: [{type: Schema.Types.ObjectId, ref:'Card'}]
  });


  // Bcrypt middleware on UserSchema
  UserSchema.pre('save', function(next) {
    var user = this;
 
    if (!user.isModified('password')) return next();
 
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if (err) return next(err);
 
      bcrypt.hash(user.password, salt, null, function(err, hash) {
          if (err) return next(err);
          user.password = hash;
          next();
      });
    });
  });
 
  //Password verification
  UserSchema.methods.comparePassword = function(password, cb) {
      bcrypt.compare(password, this.password, function(err, isMatch) {
          if (err) return cb(err);
          cb(isMatch);
      });
  };
  
module.exports = mongoose.model('User',UserSchema)

