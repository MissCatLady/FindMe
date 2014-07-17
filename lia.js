module.exports = function(app, pg, db, validate) {

var encrypt = require("crypto");

var bodyParser = require('body-parser');
//allows parsing of POST information
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



//index page
app.get('/', function(req,res) {

	validate(req,pg,db, function(data) {
		var uid = data;
		if(uid > 0){
			res.redirect("/meet");
		}else{
			res.redirect('/index');
		}
	});
});

//login on index
app.post('/login', function(req, res){

	
	
	pg.connect(db, function(err, client, done) {
		if (err) {
			return console.error('Problem fetching client from pool', err);
		} 

		client.query("select * from users where email='"
		+ req.body.email + "' and password='" + req.body.password + "'", function(err, result){
		if(result.rows.length != 0){
			
			var currdate = new Date();
			//hash user email and current date as token
			var token = encrypt.createHash("sha1").update(req.body.email + currdate.toString()).digest("hex");
			//update token in database
			client.query("update users set token='" + token + "' where id=" + result.rows[0].id);
			//create cookie token
			res.cookie('token', token);
			res.redirect("/meet");

		}else{
			res.clearCookie('token');
			res.locals.message = "Invalid Login";
			res.render("index.jade");
		}

		});
		done();
	});

});

app.get('/games', function(req,res) {

	validate(req,pg,db, function(data) {
		var uid = data;
		if(uid > 0){
			res.render("games.jade");
		}else{
			res.redirect('/index');
		}
	});

});


//logout link
app.get('/index', function(req,res) {
	res.clearCookie('token');
	res.render("index.jade");
	
});

//Sends back to index
function login(res) {
	res.locals.message = "Please Login";
	res.render('index.jade');
}

//------------

app.get('/gameinprogress', function(req,res) {

	console.log("Action /gameinprogress");
	var games;


	pg.connect(db, function(err, client, done) {
	if (err) {
		return console.error('Problem fetching client from pool', err);
	} 

		validate(req,pg,db, function(data) {
		var uid = data;
		client.query("select * from locations where userid=" + uid, function(err, result) {
			if(result.rows.length != 0 ) {
				//change for multiple games
				console.log("game token still in database");
				getGameInfo(uid, result.rows[0].game_token, function(data) {
					console.log("calling game info");
					var data = data;
					data.push("Hide & Seek");
					console.log(data);
					res.send(data);
				});
			} else {
				console.log("no game token");
				res.send(false);
			}
		});
			

		});

	});
});

function getGameInfo(uid, gametoken, callback) {
	//gets game info for the players that didn't start the game

	isseeker(uid, function(isseeker) { 
		getPoints(gametoken, function(points) {
			getPlayers(gametoken, function(playeruid){
			
			findUsernames(playeruid, function(players) {
			
				console.log("does this run");
				callback([isseeker,gametoken, playeruid, players, uid, points]);
				
			});

			});
		});
	});
}

function isseeker(userid, callback) {
	pg.connect(db, function(err,client,done) {
		if(err) {
				console.error("Problem with pool", err);
			}
		client.query("select * from locations where userid=" + userid, function(err, result){
			if(err) {
				console.error("Can't find userid", err);
			} else {
				if (result.rows.length != 0) {
					callback(true);
				} else {
					callback(false);
				}
			}

		});


		done();
	});
}

function findUsernames(playeruid, callback) {

	var players = [];

	var flag = 0;
	for (var i in playeruid) {
		findUsername(playeruid[i], function(username){
			players.push(username);
			flag = flag + 1;
		
			if (playeruid.length == flag) {
			console.log("let's go");
			callback(players);
		}
					
		});
	
	}

}
function findUsername(userid, callback) {
	pg.connect(db, function(err, client, done){
		if (err) {
			console.error("Problem fetching client from pool", err);
		}
		client.query("select * from users where id=" + userid, function(err, result) {
			if (err) {
				console.error("User doesn't exists", err);
			} else {
				if (result.rows.length != 0) {
					callback(result.rows[0].username);
				}
			}
		});
		done();
	});
}

function getPlayers(gametoken, callback) {
	var players = [];

	pg.connect(db, function(err, client, done) {
	if (err) {
		return console.error('Problem fetching client from pool', err);
	}

	client.query("select * from locations where game_token='" + gametoken + "'", function(err, result) {
		if (err) {
			return console.error('Cannot get game token from locations for point update', err);
		} else {
			if (result.rows.length != 0 ){
				for (var i in result.rows) {
					players.push(result.rows[i].userid);

				}
				callback(players);
			}
		}
	});
	done();
});


}

function getPoints(gametoken, callback) {
	var points = [];

	pg.connect(db, function(err, client, done) {
		if (err) {
			return console.error('Problem fetching client from pool', err);
		}

		client.query("select * from locations where game_token='" + gametoken + "'", function(err, result) {
			if (err) {
				return console.error('Cannot get game token from locations for point update', err);
			} else {
				if (result.rows.length != 0 ){
					for (var i in result.rows) {
						points.push(result.rows[i].points);

					}
					callback(points);
				}
			}
		});
		done();
	});
}

function setPoints(gametoken, userid, points) {
	pg.connect(db, function(err, client,done) {
		if (err) {
			return console.error("Problem fetching client from pool", err);
		}

		client.query("update locations set points=" + points + " where game_token='" + gametoken + "' and userid=" + userid,  function(err,result) {
			if (err) {
				return console.error("Problem updating points", err);
			} else {
				console.log("MORE POINTS " + points);
				return points;
			}
		});

	});
}

//------------game2

app.get('/hidenseek', function(req,res) {

	console.log("Action /hidenseek");

	validate(req,pg,db, function(data) {
	var uid = data;


	console.log("UID "+ uid);
	if (uid > 0) {

	pg.connect(db, function(err, client, done) {
		if (err) {
			return console.error('Problem fetching client from pool', err);
		} 

	//assumes uid can be id1 or id2
	client.query("select * from users where id in((select id2 from friendships where id1=" 
		+ uid + ") union (select id1 from friendships where id2=" + uid + "))", 
		function(err,result){

		
		if(result.rows.length != 0) {
			var friends = [];

			for (var i in result.rows) {
				friends[friends.length] = result.rows[i].username;
			}

			res.render("hidenseek.jade", {friends: friends, newgame:true});

		} else {
			res.locals.message = "No friends. Add Friends";
			res.render('hidenseek.jade');
		}
		});

	  done();
    });

	}else{
		console.log("redirected from games");
		res.redirect('/index');
	}
});
});

app.post('/getseeker', function(req,res) {

	console.log("Getting seeker");

	validate(req,pg,db, function(data) {
		var uid = data;
		var players = [uid];
		if(uid > 0){

			var currdate = new Date();
			var gametoken = encrypt.createHash("sha1").update(uid + currdate.toString() + "HNS").digest("hex");
			var points = [];

			for (var i in req.body.mydropdown) {
				players.push(req.body.mydropdown[i]);
			}

			console.log(players);
			var randnum = Math.floor(Math.random()*players.length);
			var seeker = players[randnum];
			console.log(seeker + " is the seeker.")
			
			


			pg.connect(db, function(err, client, done) {
				if (err) {
					return console.error('Problem fetching client from pool', err);
				} 

				client.query("insert into games values('" + gametoken + "', 'Hide & Seek')" ,function(err,result){
					if (err) {
						console.log('Problem inserting game token into database', err);
					} else {
						console.log('Added Hide & Seek Game');
					}
				});

					var flag = 0;
				
					for (var i in players) {

						var playeruid = [];
						console.log("checking for players" + players[i]);
						if (!isNaN(players[i])) {
							var id = parseInt(players[i]);
						} else {
							var id=-1;
						}
						client.query("select * from users where username='" + players[i] + "' or id=" + id , function(err,result) {
							if (err) {
								console.log('Problem finding user', err);
							} else {
								if (result.rows.length != 0) {
									var userid = result.rows[0].id;
									playeruid.push(userid);
									setPoints(gametoken, userid, 0);
									points.push(0);
									flag = flag + 1;

								var player_type="hider";
								var isseeker=false;
								if (players[i] == seeker) {
									player_type = "seeker";
									if (playeruid[i] == uid) {
										isseeker=true;
									}
								} 
							

									client.query("insert into locations values(" + userid + ",array[-1,-1],'" + gametoken + "','" + player_type + "')",function(err,result){
				 						if (err) {
											console.log('Problem inserting into locations table', err);
										} else {
											console.log('Added Player ' + userid  + ' into locations as ' + player_type);
										}
							
									
									});	
							
								if (flag == players.length ) {
									console.log("print this in here");
									client.query("update games set players=array[" + playeruid.toString() + "] where game_token='" + gametoken + "'", function(err, result) {
										if (err) {
											console.log("Players=" + playeruid + " - token=" + gametoken);
											console.log("Problem updating players for games ", err);
										}
									});

									res.send([isseeker, gametoken, playeruid, players, uid, points]);
								}

								} 

							}

						});


						
					}
				
					
					

			});

			

		}else{
			res.redirect('/index');
		}
	});
	
});

app.get("/startgame", function(req,res) {

console.log("at /startgame");

validate(req,pg,db, function(data) {
	var uid = data;
	res.render("hidenseek.jade", {newgame: false});
});

});


app.post("/gamecheckin", function(req,res) {
	validate(req,pg,db, function(data) {
	var uid = data;
	var coords = [parseFloat(req.body.latitude), parseFloat(req.body.longitude)];
	pg.connect(db, function(err, client, done) {
		if (err) {
			return console.error('Problem fetching client from pool', err);
		} 
		client.query("update locations set place=array[" + coords + "] where userid=" + uid, function(err,result) {

			if (err) {
				console.log("Problem checking in",err);
				res.send(false);
			} else {
				res.send(true);
			}
		});
	});
	});
});


app.get("/friendlocations", function(req,res) {
	//return array of coordinate tuples
	//given game token and array of players
	console.log("in /friendlocations");
	var game2token = req.query.game2token;
	var playeruid = req.query.playeruid.split(",");
	var coords = [];
	pg.connect(db, function(err, client, done) {
		client.query("select * from locations where game_token='" + game2token + "'", function(err,result) {

			if (err) {
				console.log("Can't find game token", err);
			} else {
				for (var x=0; x < result.rows.length; x++) {
					coords.push(result.rows[x].place);
				}
			}
			console.log(coords);
			res.send(coords);
		});
		done();

	});


});

app.get("/endgame", function(req,res) {
	console.log("in /endgame");
 	var game2token = req.query.game2token;
	pg.connect(db, function(err, client, done) {
		client.query("delete from locations where game_token='" + game2token + "'", function(err, result){
			if (err) {
				console.log("Cannot delete game from locations", err);
			} else {
				
				console.log("from locations " + result + game2token);
				res.send(true);
				
			}
		});
		done();
		client.query("delete from games where game_token='" + game2token + "'", function(err, result) {
			if (err) {
				console.log("Cannot delete token from games", err);
			} else {
				
				console.log("from games " + result + game2token);
				
			}
		});
		done();
	});

});


}

