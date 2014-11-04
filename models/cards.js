

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

// --------------------
// CARD
// --------------------
// El modelo en arbol implementado es uno que contiene para cada tarjeta tanto las referencias a su padre como las referencias
// a su listado de hijos (en un array de childs). Bastaría con la referencia al padre de cada uno, pero tener también las referencias
// a sus hijos permite obtener fácilmente la estructura de las perspectivas, que contiene todos los hijos y nietos a partir de una tarjeta
// en contcreto. Más información sobre las estructuras de tipo arbol de MongoDB en:
// http://docs.mongodb.org/manual/tutorial/model-tree-structures-with-child-references/

var CardSchema   = new Schema({
	user: {type:Schema.Types.ObjectId, ref:'User'},
	title: String,
	description: String,
    posx: String,
    posy: String,
	parent: { type : Schema.Types.ObjectId, ref: 'Card' },
	childs: [{ type : Schema.Types.ObjectId, ref: 'Card' }]
});

module.exports = mongoose.model('Card', CardSchema);
