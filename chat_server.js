//app= express app, mongo=mongo module, mongoURI is URI we are using,
//validate = a function used to validate user, pg = pg module
//pgdb is the database url used to connect to the second database
module.exports = function(app, mongo, mongoUri, validate,pg,pgdb) {
var bodyParser = require('body-parser');
//allows parsing of POST information
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


var mongoClient = require('mongodb').MongoClient,client = require('socket.io').listen(8080).sockets;
		
//mongodb://heroku_app27110801:4a44182508c65602d1934dc317d698b6@ds061318.mongolab.com:61318/heroku_app27110801
mongoClient.connect("mongodb://willtheuser:password1@kahana.mongohq.com:10020/app27110801",function(err,db){
	if(err) throw err;
	//console.log("hello");
	
		
	client.on('connection',function(socket){
		console.log('someone has connected.');
		var col = db.collection("messages");
		
		//listen for a status 
			sendStatus = function(s){
				socket.emit('status',s);
			};
			
			//emit all messages
			col.find().limit(100).sort({_id:1}).toArray(function(err,res){
				socket.emit('output',res);
			
			});
			
		socket.on('input',function(data){
		
			//console.log(data);
			//json object, allows you to grab name and message and stuff
			var name = data.name,
				message = data.message;
				whitespacePattern =/^\s*$/;
				
				if(whitespacePattern.test(name)||whitespacePattern.test(message)){
					sendStatus('Name and message is required.');
					console.log('Invalid');
					
				}else{
				
					col.insert({name:name,message:message},function(){
						//emit latest message to all clients
						console.log('Inserted');
						client.emit('output', [data]);
					
					sendStatus({
						message:"Message Sent",
						clear:true
					
					});
					
					});
								
				}
				
			});
		
		
		});
	});


}

