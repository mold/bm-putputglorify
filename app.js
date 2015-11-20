var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use("/scripts", express.static(__dirname + "/public/javascripts"));
app.use("/styles", express.static(__dirname + "/public/stylesheets"));
app.use("/views", express.static(__dirname + "/views"));

app.get('/', function(req, res) {
  res.sendFile("index.html", {
    root: __dirname + "/views"
  });
});

app.get('/client', function(req, res) {
  res.sendFile("client.html", {
    root: __dirname + "/views"
  });
});

io.on('connection', function(socket) {
  console.log('Client connected! Id:', socket.id);
  socket.on("shot-fired", function shotFired(msg) {
    console.log("Client " + socket.id + " fired!", msg);
  })
  socket.on("aim-change", function aimChange(msg) {
    // TODO: do something here
    // update view etc
    // console.log(socket.id + " aimed:", msg)
  })
  socket.on('update movement', function(msg) {
    io.emit('update movement', msg);
  });
  socket.on('disconnect', function() {
    console.log('Client disconnected!');
  });
});

http.listen(3004, function() {
  console.log('Listening on port: 3004');
});