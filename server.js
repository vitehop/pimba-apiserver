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
// MongoLab - account vitehop@gmail.com
mongoose.connect('mongodb://pimba:pimba@ds047440.mongolab.com:47440/pimba-2');
//mongoose.connect('mongodb://pimba:pimba@ds041167.mongolab.com:41167/pimba');

var port = process.env.PORT || 8080; 		// set our port
app.use(express.static(__dirname + '/public'));	// Publicamos bajo el server la carpeta /public



// =============================================================================
// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); 	// get an instance of the express Router

// One route to log them all
router.use(function(req, res, next) {

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Content-Type', 'application/json');


    if (req) console.log('REQUEST '+ util.inspect(req.method) + ' ' +util.inspect(req.url));




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

		// obtengo el ID del usuario logado a partir del token de autenticación
		var token = (req.headers["authorization"]).substring(7);
		var token_decoded = jsonwebtoken.decode(token);
		var user_id = token_decoded.id;
		
		var card = new Card(); 		// create a new instance of the Card model

		// Establecemos las propiedades de la nueva tarjeta. Si no tiene padre ese campo quedaría vacío
		card.user = user_id;
		card.title = req.body.title; 
		card.description = req.body.description;
		card.parent = req.body.parent;
        card.posx = req.body.posx;
        card.posy = req.body.posy;

		// save the card and check for errors
		card.save(function(err) {

			if (err) res.send(err);

			// Si la nueva tarjeta tiene padre, le busco para añadirle su nuevo hijo en su lista de hijos
			if(card.parent){
				Card.findById(card.parent, function(err,parentCard) {
					if(err) res.send(err);
					parentCard.childs.push(card._id);
				
					parentCard.save(function(err){
						if(err) res.send(err);
					});
				});
			}

			// Si la nueva tarjeta no tiene padre, la incluimos como perspectiva del usuario que la está creando
			else{
				User.findById(user_id,function(err, user) {
					if (err) res.send(err);
					user.perspectives.push(card._id);
					user.save(function(err){
						if(err) res.send(err);
					});

					});
			}

			res.json(card);
		});
		
	})
 
	// ---------------------------------------
	// /api/cards GET
	// ---------------------------------------
	// Obtiene todas las tarjetas
	// Este metodo no está documentado, no sería necesario. Está aquí para hacer pruebas
	
	.get(jwt({secret: secret.secretToken}),function(req, res) {
		
		// obtengo el ID del usuario logado a partir del token de autenticación
		var token = (req.headers["authorization"]).substring(7);
		var token_decoded = jsonwebtoken.decode(token);
		var user_id = token_decoded.id;

		Card.find({user: user_id},function(err, cards) {
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
		Card.findById(req.params.card_id, function(err, card) {

			if (err) res.send(err);
			
			// update the card info, solo si los parámetros vienen en la request
			if(req.body.title) card.title = req.body.title; 
			if(req.body.description) card.description = req.body.description;
            if(req.body.posx) card.posx = req.body.posx;
            if(req.body.posy) card.posy = req.body.posy;
            

			// Para gestionar los listados de hijos y parents:
			// - Se actualiza el propio campo "parent" en la tarjeta (hecho arriba)
			// - Se añade a la lista de hijos de su nuevo padre
			// - Se eliminan el hijo de la lista de hijos en su padre anterior
            // Añadimos la comprobación adicional de no hacer nada si el nuevo padre es el mismo que el que ya tenía

			if(req.body.parent && req.body.parent!=card.parent) {

				//Añadimos el hijo a su nuevo padre
				Card.findById(req.body.parent, function(err,parentCard) {
					if(err) res.send(err);

                    //Añadimos el hijo a su nuevo padre solo si no lo contenía ya
                    if(parentCard.childs.indexOf(req.params.card_id)>=0) {
                        console.log("La tarjeta " + req.params.card_id + " ya es hija de " + parentCard.title);
                    }
                    else {
                        parentCard.childs.push(req.params.card_id);
                        console.log("|--> He añadido "+req.params.card_id+" a la lista de hijos de "+parentCard.title);
                        parentCard.save(function(err){
                            if(err) res.send(err);
                        });
                    }

				});

				//Eliminamos el hijo de su padre anterior
				Card.findById(card.parent, function(err,oldParentCard){
					if(err) res.send(err);
					var index=oldParentCard.childs.indexOf(req.params.card_id);
					oldParentCard.childs.splice(index,1);

					oldParentCard.save(function(err){
						if(err) res.send(err);
					});
				});

				//Finalmente actualizamos el padre en la tarjeta que estamos editando
				card.parent = req.body.parent;

			}

			// Guardamos finalmente la tarjeta con todos los cambios
			card.save(function(err){
				if(err) res.send(err);
				res.json(card);
			});
			
		});
	})

	// 	---------------------------------------
	// 	/api/cards/[card_id] DELETE
	// 	---------------------------------------
	.delete(jwt({secret: secret.secretToken}),function(req, res) {
		
		// obtengo el ID del usuario logado a partir del token de autenticación
		var token = (req.headers["authorization"]).substring(7);
		var token_decoded = jsonwebtoken.decode(token);
		var user_id = token_decoded.id;

		Card.remove({
			_id: req.params.card_id,
			user: user_id
		}, function(err, card) {
			if (err)
				res.send(err);

			res.json(card);
		});
	})


// ----------------------------
// RUTA: /api/perspectives
// ----------------------------

router.route('/perspectives')

	// ----------------------------
	// POST /api/perspectives
	// ----------------------------
	// Crea una nueva perspectiva para el usuario logado a partir de una tarjeta

	.post(jwt({secret: secret.secretToken}), function(req,res){

		// obtengo el ID del usuario logado a partir del token de autenticación
		var token = (req.headers["authorization"]).substring(7);
		var token_decoded = jsonwebtoken.decode(token);
		var user_id = token_decoded.id;

		// insertamos el parametro req.card_id como perspectiva al usuario
		User.findById( user_id , function(err, user) {
			if (err) res.send(err);			
			user.perspectives.push(req.body.card_id);
		
			// guardamos el usuario
			user.save(function(err){
				if (err) res.send(err);

                User.findOne({_id : user._id})
                    .populate({path:'perspectives'})
                    .exec(function(err, user) {
                        if (err) res.send(err);
                        res.json(user);
                    });
			});

		});

	})

	// ----------------------------
	// DELETE /api/perspectives
	// ----------------------------
	// Elimina una perspectiva existente para el usuario

	.delete(jwt({secret: secret.secretToken}), function(req,res){
		
		// obtengo el ID del usuario logado a partir del token de autenticación
		var token = (req.headers["authorization"]).substring(7);
		var token_decoded = jsonwebtoken.decode(token);
		var user_id = token_decoded.id;

		User.findById(user_id, function(err,user){
			if(err) res.send(err);

			var index=user.perspectives.indexOf(req.params.perspective_id);
			user.perspectives.splice(index,1);

			// guardamos el usuario
			user.save(function(err){
                if (err) res.send(err);

                User.findOne({_id : user._id})
                    .populate({path:'perspectives'})
                    .exec(function(err, user) {
                        if (err) res.send(err);
                        res.json(user);
                    });
			});
		});


	});



// ---------------------------------------
// RUTA: /api/perspectives/[card_id]
// ---------------------------------------

router.route('/perspectives/:card_id')

	// 	---------------------------------------
	// 	GET /api/perspectives/[card_id] 
	// 	---------------------------------------
	//  Obtiene un JSON con las tarjetas necesarias para representar una perspectiva cualquiera.
	//  Se utiliza un populate normal para recoger hijos y un populate anidado para los nietos de la tarjeta.
	//  Explicación del código en http://stackoverflow.com/questions/19222520/populate-nested-array-in-mongoose
	
	.get(jwt({secret: secret.secretToken}),function(req, res) {

 		Card.findById(req.params.card_id)
  		.lean()
  		.populate({ path: 'childs' })
  		.exec(function(err, docs) {

    	var options = {
      		path: 'childs.childs',
      		model: 'Card'
    		};

    	if (err) return res.json(500);
    	Card.populate(docs, options, function (err, perspectiva) {
      		res.json(perspectiva);
    		});

  		});

	});


// ----------------------------------------------
// RUTA: /api/perspectives/[card_id]/[num_levels]
// ----------------------------------------------

router.route('/perspectives/:card_id/:num_levels')

    // 	--------------------------------------------
    // 	GET /api/perspectives/[card_id]/[num_levels]
    // 	--------------------------------------------
    //  Obtiene un JSON con el arbol completo desde la card_id especificada conteniendo
    //  tantos niveles como se especifiquen en [num_levels]

    .get(jwt({secret: secret.secretToken}),function(req, res) {

        Card.findById(req.params.card_id)
            .lean()
            .populate({ path: 'childs' })
            .exec(function(err, docs) {

                var options = {
                    path: 'childs.childs',
                    model: 'Card'
                };

                if (err) return res.json(500);

                Card.populate(docs, options, function (err, perspectiva) {
                    res.json(perspectiva);
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

        User.findOne({_id: user_id})
            .populate({ path: 'perspectives' })
            .exec(function(err, user) {
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
			res.json(user);
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
		
		User.findById( user_id , function(err, user) {
			if (err) res.send(err);

			if(req.body.username) user.username = req.body.username;
			if(req.body.password) user.password = req.body.password;


			user.save(function(err){
				if (err) res.send(err);
				res.json(user);
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

	        if(!user){
                console.log("Username not found");
	        	return res.send(401);
	        }

	        user.comparePassword(password, function(isMatch) {
	            if (!isMatch) {
	                console.log("Attempt failed to login with " + user.username);
	                return res.send(401);
	            }
				
				var token = jsonwebtoken.sign({id: user._id}, secret.secretToken, { expiresInMinutes: 60000 });
 
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