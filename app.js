var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var b2 = require('box2d.js');
var Box2D = b2.Box2D;
var gameloop = require('node-gameloop');
var MersenneTwister = require(__dirname + '/public/javascripts/lib/mersenne-twister.js');

var latestBody;
var groundMaterial;

var world;

var RandomEngine = new MersenneTwister(40);

var maxLinearVelocity = 5;
var angularDamping = 0.005; //dependent on maxLinearVelocity
var linearDampingFunction = function(v) {
  return Math.pow(maxLinearVelocity - v, 1.5);
};

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

var bodyMap = [];

var destroy_list = [];
var players = {};
var clientData = {};

var initWorldBodiesFromMap = function() {
  // create a rectangle for each wall piece
  var shape = new Box2D.b2PolygonShape();
  shape.SetAsBox(0.5, 0.5);

  for (var i = 0; i < map.length; i++) {
    bodyMap.push([]);
    for (var j = map[0].length - 1; j >= 0; j--) {
      var elem = map[i][j];
      if (0 != elem) {
        // create a static body
        var bodyDef = new Box2D.b2BodyDef();
        bodyDef.set_position(new Box2D.b2Vec2(j, i));
        var body = world.CreateBody(bodyDef);
        body.CreateFixture(shape, 5.0);

        bodyMap[i].push(body);
      }
      bodyMap[i].push(null);
    };
  }
};

// Server main init
(function() {
  // no gravity
  world = new Box2D.b2World(new Box2D.b2Vec2(0.0, 0.0), true);

  initWorldBodiesFromMap();

  var fixedTimeStep = 1.0 / 60.0; // seconds
  var maxSubSteps = 3;

  // Start the physics simulation loop
  gameloop.setGameLoop(function(delta) {
    //world.step(fixedTimeStep, delta, maxSubSteps);
    world.Step(fixedTimeStep, 2, 2);
    world.ClearForces();

    if (io.sockets.sockets) {
      for (var i in clientData) {
        var data = clientData[i];
        var body = data.body;
        // must grab data this way since the object is
        // converted to pure JSON on the way to the client
        var pos = body.GetPosition();
        data.x = pos.get_x();
        data.y = pos.get_y();
        data.angle = body.GetAngle();

        // simulate ground and wind friction
        // so that they don't roll forever
        var v = body.GetLinearVelocity();
        if (v.Length() > 0 && v.Length() < maxLinearVelocity) {
          var x = v.get_x();
          var y = v.get_y();
          var linearDamping = linearDampingFunction(v.Length());
          body.ApplyForce(new Box2D.b2Vec2(-x * linearDamping, -y * linearDamping), body.GetWorldCenter());
          // this is very arbitrary
          // TODO: check so that it doesn't starts to spin faster
          body.ApplyAngularImpulse(-body.GetAngularVelocity() * linearDamping * angularDamping);
        }
      }
      io.sockets.sockets.forEach(function(sock) {
        sock.emit("bodies", clientData);
      });
    }
    // destroy old players
    if (destroy_list.length > 0) {
      destroy_list.forEach(function(body) {
        world.DestroyBody(body);
      });
      destroy_list.length = 0;
    }
  }, 1000 / 30);

})();

// This namespace is for the viewer
// TODO: the player client also triggers this
io.of('/').on('connection', function(socket) {
  // Send map the first we do
  io.emit('map-update', map);
  console.log('Viewer connected! Id:', socket.id);
});

// This namespace is for the player
io.of('/client').on('connection', function(socket) {
  // create a circular dynamic body in the middle
  var shape = new Box2D.b2CircleShape();
  shape.set_m_radius(0.5);
  var bodyDef = new Box2D.b2BodyDef();
  bodyDef.set_type(Box2D.b2_dynamicBody);
  bodyDef.set_position(new Box2D.b2Vec2(w / 2, h / 2));
  bodyDef.friction = 0.9;
  bodyDef.density = 1;
  bodyDef.restitution = 1;
  bodyDef.linearDamping = 1;
  bodyDef.angularDamping = 1;
  var body = world.CreateBody(bodyDef);
  body.CreateFixture(shape, 5.0);

  players[socket.id] = {
    body: body
  };

  clientData[socket.id] = {
    id: socket.id,
    body: body
  };

  // tell everybody!
  io.sockets.sockets.forEach(function(sock) {
    sock.emit("body-create", clientData[socket.id]);
  });

  console.log('Client connected! Id:', socket.id);
  socket.on("shot-fired", function shotFired(msg) {
    console.log("Client " + socket.id + " fired!", msg);
    var body = players[socket.id].body;
    body.ApplyForce(new Box2D.b2Vec2(msg.deltaX * msg.power * 20, msg.deltaY * msg.power * 20), body.GetWorldCenter());
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
    // tell everybody!
    io.sockets.sockets.forEach(function(sock) {
      sock.emit("body-destroy", clientData[socket.id]);
    });
    console.log('Client disconnected!');
    destroy_list.push(players[socket.id].body);
    delete players[socket.id];
    delete clientData[socket.id];

  });
});
http.listen(3004, function() {
  console.log('Listening on port: 3004');
});