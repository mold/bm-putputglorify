var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var CANNON = require('cannon');
var gameloop = require('node-gameloop');
var MersenneTwister = require(__dirname + '/public/javascripts/lib/mersenne-twister.js');
var world = new CANNON.World();
var latestBody;
var groundMaterial;

var RandomEngine = new MersenneTwister(40);

app.use("/scripts", express.static(__dirname + "/public/javascripts"));
app.use("/styles", express.static(__dirname + "/public/stylesheets"));
app.use("/sprites", express.static(__dirname + "/public/sprites"));
app.use("/shaders", express.static(__dirname + "/public/shaders"));
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

var map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];
var w = map[0].length;
var h = map.length;
//var map = new Array(h);
/*for (var i = 0; i < map.length; i++) {
  map[i] = new Array(w);
  for (var j = 0; j < map[0].length; j++) {
    map[i][j] = Math.round(0.2 + RandomEngine.random() * 0.8);
  }
}*/

var bodyMap = [];

var players = {};
var clientData = {};

var initWorldBodiesFromMap = function() {
  for (var i = 0; i < map.length; i++) {
    bodyMap.push([]);
    for (var j = map[0].length - 1; j >= 0; j--) {
      var elem = map[i][j];
      if (0 != elem) {
        var elemBody = new CANNON.Body({
          mass: 0, // static
          position: new CANNON.Vec3(j, i, 0),
          shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 10.5))
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
  world = new CANNON.World();
  world.gravity.set(0, 0, -20); // m/s²
  //world.broadphase = new CANNON.NaiveBroadphase();

  initWorldBodiesFromMap();

  // Create a plane
  groundMaterial = new CANNON.Material();
  var groundBody = new CANNON.Body({
    mass: 0, // mass == 0 makes the body static
    material: groundMaterial
  });
  var groundShape = new CANNON.Plane();
  groundBody.addShape(groundShape);
  world.addBody(groundBody);

  // Create a sphere
  /*var radius = 1; // m
  var material = new CANNON.Material();
  var sphereBody = new CANNON.Body({
    mass: 5, // kg
    material: material,
    linearDamping: 0.01,
    position: new CANNON.Vec3(8, 8, -100), // m
    shape: new CANNON.Sphere(radius)
  });
  world.addBody(sphereBody);*/

  var fixedTimeStep = 1.0 / 60.0; // seconds
  var maxSubSteps = 3;

  // Start the physics simulation loop
  gameloop.setGameLoop(function(delta) {
    world.step(fixedTimeStep, delta, maxSubSteps);

    if (io.sockets.sockets) {
      io.sockets.sockets.forEach(function(sock) {
        sock.emit("bodies", clientData);
      });
    }
  }, 1000 / 30);

})();
io.on('connection', function(socket) {
  // Send map the first we do
  io.emit('map-update', map);

  var rad = 0.5;
  var material = new CANNON.Material();
  var sphereBody = new CANNON.Body({
    mass: 5, // kg
    position: new CANNON.Vec3(w / 2, h / 2, 1.5), // m
    shape: new CANNON.Sphere(rad),
    material: material,
    linearDamping: 0.01
  });
  world.addBody(sphereBody);

  var material_ground = new CANNON.ContactMaterial(groundMaterial, material, {
    friction: 0.2,
    restitution: 0.3
  });
  world.addContactMaterial(material_ground);

  players[socket.id] = {
    body: sphereBody
  };

  clientData[socket.id] = {
    position: sphereBody.position,
    quaternion: sphereBody.quaternion
  };

  console.log('Client connected! Id:', socket.id);
  socket.on("shot-fired", function shotFired(msg) {
    console.log("Client " + socket.id + " fired!", msg);
    var sphereBody = players[socket.id].body;
    sphereBody.applyForce(new CANNON.Vec3(msg.deltaX * msg.power * 20, msg.deltaY * msg.power * 20, 0),
      new CANNON.Vec3(sphereBody.position.x - rad / 2,
        sphereBody.position.y - rad / 2,
        sphereBody.position.z));
  });

  socket.on("aim-change", function aimChange(msg) {
    // TODO: do something here
    // update view etc
    // console.log(socket.id + " aimed:", msg)
  });

  socket.on('update movement', function(msg) {
    io.emit('update movement', msg);
  });
  socket.on('disconnect', function() {
    console.log('Client disconnected!');
    world.removeBody(sphereBody);
    delete players[socket.id];
    delete clientData[socket.id];
  });
});
http.listen(3004, function() {
  console.log('Listening on port: 3004');
});
