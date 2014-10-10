// ==============================================================================================================
// server.js
// ==============================================================================================================
// Pimba! API RESTful v0
// Siguiendo el how-to: http://scotch.io/tutorials/javascript/build-a-restful-api-using-node-and-express-4
// Stack:
// 		Node.js
//			express.js
//			mongoose.js
//		MongoDB
//			MongoLabs



// =============================================================================
// BASE SETUP, includes e inicializaciones
// =============================================================================

// call the packages we need
var express = require('express'); 		
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

var jwt 		 = require('express-jwt');
var jsonwebtoken = require('jsonwebtoken');
var secret		 = require('./config/secret');

var util 		 = require('util'); // para hacer util.inspect(Obj) y poder ver todos sus metodos/propiedades


// call the Mongoose models
var Card = require('./models/cards');
var User = require('./models/users');


var app = express(); 				// define our app using express
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB setups
mongoose.connect('mongodb://braqio:braqio2014@ds039950.mongolab.com:39950/braqio-dev'); //  MongoLab - account victorperez.glez@gmail.com

var port = process.env.PORT || 8080; 		// set our port
// app.set('views', __dirname + '/public');	// Publicamos bajo el server la carpeta /public, de momento no lo necesito para la API 



// =============================================================================
// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); 	// get an instance of the express Router

// One route to rule them all
router.use(function(req, res, next) {
	console.log('Pimba!'); 
	next(); // nos aseguramos de que esto se ejecuta pero sigue buscando rutas a continuación
});


// ---------------------------------------
// RUTA: /api/cards
// ---------------------------------------

router.route('/cards')

	// ---------------------------------------
	// /api/cards POST
	// ---------------------------------------
	// Crea una nueva tarjeta
	
	.post(jwt({secret: secret.secretToken}),function(req, res) {
		
		var card = new Card(); 		// create a new instance of the Card model
		card.user = req.user._id;
		card.title = req.body.title;  // set the card properties (comes from the request)
		card.description = req.body.description;
		card.childs = req.body.childs;
		card.parent = req.body.parent;
		console.log(req.body.title);

		// save the card and check for errors
		card.save(function(err) {
			if (err)
				res.send(err);
				
			res.json({ message: 'Card created!' });
		});
		
	})
 
	// ---------------------------------------
	// /api/cards GET
	// ---------------------------------------
	// Obtiene todas las tarjetas
	
	.get(jwt({secret: secret.secretToken}),function(req, res) {
				
		Card.find({user: req.user._id},function(err, cards) {
			if (err) res.send(err);
			res.json(cards);
		});
	});
	
	
		 
// ---------------------------------------
// RUTA: /api/cards/[card_id]
// ---------------------------------------
router.route('/cards/:card_id')

	// 	---------------------------------------
	// 	/api/cards/[card_id] GET
	// 	---------------------------------------
	.get(jwt({secret: secret.secretToken}),function(req, res) {
		
		Card.findById(req.params.card_id, function(err, card) {
			if (err) res.send(err);
			res.json(card);
		});
	})

	// 	---------------------------------------
	// 	/api/cards/[card_id] PUT
	// 	---------------------------------------
	.put(jwt({secret: secret.secretToken}),function(req, res) {

		// use our card model to find the card we want
		Card.findById({user: req.user._id, _id: req.params.card_id}, function(err, card) {

			if (err) res.send(err);
			card.title = req.body.title; // update the card info
			card.description = req.body.description;
			
			// Cuando la tarjeta cambie de padre nos llegará el ID del nuevo padre, por el modelo utilizado es necesario
			// ir a ese padre y añadir esta tarjeta a su lista de hijos.
			// Tambien será necesario ir a su padre actual y eliminarlo (vaya lío)
			// Todo esto si se implementa un modelo de arbol con relaciones a hijos
			// Mas info aquí http://docs.mongodb.org/manual/tutorial/model-tree-structures-with-child-references/
			// En teoría sería buena idea para poder obtener rápidamente una perspectiva a partir de una tarjeta (tienes que ir 
			// hacia sus hijos y nietos, ese servicio ya está implementado con este modelo en /api/perspectives/<card_id>)
			
			card.childs = req.body.childs;
			card.parent = req.body.parent;
			card.user = req.user._id;
			// save the card
			card.save(function(err) {
				if (err) res.send(err);
				res.json({ message: 'Card updated!' });
			});
		});
	})

	// 	---------------------------------------
	// 	/api/cards/[card_id] DELETE
	// 	---------------------------------------
	.delete(jwt({secret: secret.secretToken}),function(req, res) {
		
		Card.remove({
			_id: req.params.card_id,
			user: req.user._id
		}, function(err, card) {
			if (err)
				res.send(err);

			res.json({ message: 'Successfully deleted!' });
		});
	})


// ---------------------------------------
// RUTA: /api/perspectives/[card_id]
// ---------------------------------------

router.route('/perspectives/:card_id')

	// 	---------------------------------------
	// 	GET /api/perspectives/[card_id] 
	// 	---------------------------------------
	//  Obtiene un JSON con las tarjetas necesarias para representar una perspectiva cualquiera.
	//  Se utiliza un populate normal para recoger hijos y un populate anidado para los nietos de la tarjeta.
	//  Explicación del código en http://stackoverflow.com/questions/13077609/mongoose-populate-embedded 
	
	.get(jwt({secret: secret.secretToken}),function(req, res) {
		
		Card
		.findById(req.params.card_id)
		.populate('childs')
		.populate('parent') // se popula el primer nivel (hijos)
		.exec(function (err, childrens) {
			
			Card.populate(childrens.childs, {path:'childs'}, // se popula el segundo nivel (nietos)
			function (err,perspective) {
				if (err) res.send(err);
				
				res.json(perspective);
			});
			
		});
	});
 

// ---------------------------------------
// RUTA: /api/users 
// ---------------------------------------

router.route('/users') 

	// ---------------------------------------
	// GET /api/users
	// ---------------------------------------
	
	.get(jwt({secret: secret.secretToken}),function(req, res) {
		
		// obtengo el ID del usuario logado a partir del token
		var token = (req.headers["authorization"]).substring(7);
		var token_decoded = jsonwebtoken.decode(token);
		var user_id = token_decoded.id;
	 
		User.findById( user_id , function(err, user) {
			if (err) res.send(err);
			res.json(user);
		});
	})

	// ---------------------------------------
	// POST /api/users
	// ---------------------------------------
	
	.post(function(req,res){
		var user = new User();
		user.username = req.body.username;
		user.password = req.body.password;
		
		//save user
		user.save(function(err){
			if (err) res.send(err);
			res.json({message: 'User created!'});
		});
	})

	// ---------------------------------------
	// PUT /api/users
	// ---------------------------------------
	
	.put(jwt({secret: secret.secretToken}),function(req, res) {
		
		// obtengo el ID del usuario logado a partir del token
		var token = (req.headers["authorization"]).substring(7);
		var token_decoded = jsonwebtoken.decode(token);
		var user_id = token_decoded.id;
		console.log(req.username);	
		
		User.findById( user_id , function(err, user) {
			if (err) res.send(err);

			user.username = req.body.username;
			user.password = req.body.password;


			user.save(function(err){
				if (err) res.send(err);
				res.json({message: 'User updated!'});
			})
		});
	});

	
	
// ---------------------------------------
// RUTA: /api/login
// ---------------------------------------

router.route('/login')

	// ---------------------------------------
	// POST /api/login
	// ---------------------------------------
	
	.post(function(req,res){ 

	    var username = req.body.username || '';
	    var password = req.body.password || '';
 
	    if (username == '' || password == '') {
	        return res.send(401);
	    }
 			
		User.findOne({username: username}, function(err,user){

	        if (err) {
	            console.log(err);
	            return res.send(401);
	        }
 		   	console.log(user);
	        user.comparePassword(password, function(isMatch) {
	            if (!isMatch) {
	                console.log("Attempt failed to login with " + user.username);
	                return res.send(401);
	            }
				
				var token = jsonwebtoken.sign({id: user._id}, secret.secretToken, { expiresInMinutes: 60 });
 
	            return res.json({token:token});
	        });
 
	    });
	});



	



// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('HEY! Some magic is happening on port ' + port);