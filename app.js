var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var CANNON = require('cannon');
var gameloop = require('node-gameloop');
var world = new CANNON.World();

app.use("/scripts", express.static(__dirname + "/public/javascripts"));
app.use("/styles", express.static(__dirname + "/public/stylesheets"));
app.use("/sprites", express.static(__dirname + "/public/sprites"));
app.use("/views", express.static(__dirname + "/views"));
app.use("/server", express.static(__dirname + "/server"));

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

app.get('/server', function(req, res) {
  res.sendFile("server.html", {
    root: __dirname + "/views"
  });
});

io.on('connection', function(socket) {
  var rad = 1;
  var sphereBody = new CANNON.Body({
    mass: 5, // kg
    position: new CANNON.Vec3(0, 0, 10), // m
    shape: new CANNON.Sphere(rad)
  });
  world.addBody(sphereBody);

  console.log('Client connected! Id:', socket.id);
  socket.on("shot-fired", function shotFired(msg) {
    console.log("Client " + socket.id + " fired!", msg);
    sphereBody.applyForce(new CANNON.Vec3(msg.deltaX * msg.power * 10, msg.deltaY * msg.power * 10, 0),
      new CANNON.Vec3(sphereBody.position.x - rad / 2,
        sphereBody.position.y - rad / 2,
        sphereBody.position.z))
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
    world.removeBody(sphereBody);
  });
});



// Server main init
(function() {

  // Setup our world
  world.gravity.set(0, 0, -9.82); // m/s²

  // Create a sphere
  var radius = 1; // m
  var sphereBody = new CANNON.Body({
    mass: 5, // kg
    position: new CANNON.Vec3(0, 0, 10), // m
    shape: new CANNON.Sphere(radius)
  });
  world.addBody(sphereBody);

  // Create a plane
  var groundBody = new CANNON.Body({
    mass: 0 // mass == 0 makes the body static
  });
  var groundShape = new CANNON.Plane();
  groundBody.addShape(groundShape);
  world.addBody(groundBody);

  var fixedTimeStep = 1.0 / 60.0; // seconds
  var maxSubSteps = 3;

  // Start the physics simulation loop
  gameloop.setGameLoop(function(delta) {
    world.step(fixedTimeStep, delta, maxSubSteps);
  }, 1000 / 30);

})();

http.listen(3004, function() {
  console.log('Listening on port: 3004');
});