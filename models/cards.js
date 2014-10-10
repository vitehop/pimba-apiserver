

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

// --------------------
// CARD
// --------------------

var CardSchema   = new Schema({
	user: {type:Schema.Types.ObjectId, ref:'User'},
	title: String,
	description: String,
	parent: { type : Schema.Types.ObjectId, ref: 'Card' },
	childs: [{ type : Schema.Types.ObjectId, ref: 'Card' }]
});

module.exports = mongoose.model('Card', CardSchema);
