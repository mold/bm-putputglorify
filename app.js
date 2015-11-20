var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use("/scripts", express.static(__dirname + "/public/javascripts"));
app.use("/styles", express.static(__dirname + "/public/stylesheets"));
app.use("/sprites", express.static(__dirname + "/public/sprites"));
app.use("/views", express.static(__dirname + "/views"));

app.get('/', function(req, res){
	res.sendFile("index.html", { root: __dirname + "/views" });
});

app.get('/client', function(req, res){
	res.sendFile("client.html", { root: __dirname + "/views" });
});

io.on('connection', function(socket){
  console.log('Client connected!');
	socket.on('update movement', function(msg){
    io.emit('update movement', msg);
	});
  socket.on('disconnect', function () {
    console.log('Client disconnected!');
  });
});

http.listen(3004, function(){
  console.log('Listening on port: 3004');
});