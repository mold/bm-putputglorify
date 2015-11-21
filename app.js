var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var CANNON = require('cannon');
var gameloop = require('node-gameloop');
var MersenneTwister = require(__dirname + '/public/javascripts/lib/mersenne-twister.js');
var world = new CANNON.World();
var latestBody;

var RandomEngine = new MersenneTwister(40);

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


var w = 16;
var h = 16;
var map = new Array(h);
for (var i = 0; i < map.length; i++) {
  map[i] = new Array(w);
  for (var j = 0; j < map[0].length; j++) {
    map[i][j] = Math.round(0.2 + RandomEngine.random() * 0.8);
  }
}

var bodyMap = [];

var initWorldBodiesFromMap = function() {
  for (var i = 0; i < map.length; i++) {
    bodyMap.push([]);
    for (var j = map[0].length - 1; j >= 0; j--) {
      var elem = map[i][j];
      if (0 != elem) {
        var elemBody = new CANNON.Body({
          mass: 0, // static
          position: new CANNON.Vec3(i, 0.5, j),
          shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
        });

        world.addBody(elemBody);
        bodyMap[i].push(elemBody);
      }
      bodyMap[i].push(null);
    };
  }
};

// Server main init
(function() {

  // Setup our world
  world.gravity.set(0, -9.82, 0); // m/s²
  initWorldBodiesFromMap();

  // Create a sphere
  var radius = 1; // m
  var sphereBody = new CANNON.Body({
    mass: 5, // kg
    position: new CANNON.Vec3(0, 10, 0), // m
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

    if (io.sockets.sockets) {
      io.sockets.sockets.forEach(function(sock) {
        sock.emit("bodies", world.bodies.map(function(body) {
          return {
            position: body.position,
            quaternion: body.quaternion
          };
        }))
      })
    }
  }, 1000 / 30);

})();
io.on('connection', function(socket) {
  // Send map the first we do
  io.emit('map-update', map);

  var rad = 1;
  var sphereBody = new CANNON.Body({
    mass: 5, // kg
    position: new CANNON.Vec3(0, 10, 0), // m
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
http.listen(3004, function() {
  console.log('Listening on port: 3004');
});