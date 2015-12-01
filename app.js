var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var b2 = require('box2d.js');
var Box2D = b2.Box2D;
var gameloop = require('node-gameloop');
var MersenneTwister = require('mersenne-twister');
var _ = require('lodash');


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

var map = [];
var mapWidth = 20, mapHeight = 30;

// Borrowed from:
// http://www.roguebasin.com/index.php?title=Simple_maze#Maze_Generator_in_Javascript
function generateMaze(map, mapWidth, mapHeight) {

    var mazeGenerator = {
        map    : [],
        WIDTH  : mapWidth,
        HEIGHT : mapHeight,

        DIRECTIONS : {
            'N' : { dy: -1, opposite: 'S' },
            'S' : { dy:  1, opposite: 'N' },
            'E' : { dx:  1, opposite: 'W' },
            'W' : { dx: -1, opposite: 'E' }
        },

        prefill : function () {
            for (var x = 0; x < this.WIDTH; x++) {
                this.map[x] = [];
                for (var y = 0; y < this.HEIGHT; y++) {
                    this.map[x][y] = {};
                }
            }
        },

        shuffle : function (o) {
            for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
            return o;
        },

        carve : function (x0, y0, direction) {
            //console.log('[%d, %d, "%s"]', x0, y0, direction);

            var x1 = x0 + (this.DIRECTIONS[direction].dx || 0),
                y1 = y0 + (this.DIRECTIONS[direction].dy || 0);

            if (x1 == 0 || x1 == this.WIDTH || y1 == 0 || y1 == this.HEIGHT) {
                return;
            }

            if ( this.map[x1][y1].seen ) {
                return;
            }

            this.map[x0][y0][ direction ] = true;
            this.map[x1][y1][ this.DIRECTIONS[direction].opposite ] = true;
            this.map[x1][y1].seen = true;

            var directions = this.shuffle([ 'N', 'S', 'E', 'W' ]);
            for (var i = 0; i < directions.length; i++) {
                this.carve(x1, y1, directions[i]);
            }
        },

        output : function () {
            var output = '';
            for (var y = 0; y < this.HEIGHT; y++) {
                for (var x = 0; x < this.WIDTH; x++) {
                    output += ( this.map[x][y].S ? ' ' : '_' );
                    output += ( this.map[x][y].E ? ' ' : '!' );
                }
                output += '\n';
            }
            output = output.replace(/_ /g, '__');
            return output;
        }
    };

    mazeGenerator.prefill();
    mazeGenerator.carve(mazeGenerator.WIDTH/2, mazeGenerator.HEIGHT/2, 'N');
    for (var x = 0; x < mazeGenerator.WIDTH+1; x++) {
        map[2*x] = [];
        map[2*x+1] = [];
        for (var y = 0; y < mazeGenerator.HEIGHT; y++) {
            map[2*x][2*y] = 1;
            map[2*x][2*y+1] = 1;
            map[2*x+1][2*y] = 1;
            map[2*x+1][2*y+1] = 1;
        }
    }

    for (var y = 0; y < mazeGenerator.HEIGHT; y++) {
        for (var x = 0; x < mazeGenerator.WIDTH; x++) {
            if (mazeGenerator.map[x][y].S) {
                map[2*x][2*y] = 0;
                map[2*x][2*y+1] = 0;
                map[2*x+1][2*y] = 0;
                map[2*x+1][2*y+1] = 0;
            } else {
                map[2*x][2*y] = 0;
                map[2*x][2*y+1] = 1;
                map[2*x+1][2*y] = 0;
                map[2*x+1][2*y+1] = 1;
            }

            if (mazeGenerator.map[x][y].E) {
                map[2*x][2*y] = 0;
                map[2*x][2*y] = 0;
                map[2*x+1][2*y] = 0;
                map[2*x+1][2*y] = 0;
            } else {
                map[x][2*y] = 0;
                map[2*x][2*y] = 1;
            }
        }
    }
    for ( var x = 0; x < mazeGenerator.WIDTH; x++) {
        map[2*x].splice(0, 1);
        map[2*x+1].splice(0, 1);
    }
    map.pop();
    return mazeGenerator;
}

var mazeGenerator = generateMaze(map, mapWidth, mapHeight);

function printMaze() {
    console.log(mazeGenerator.output());
    var out = "";

    for (var x = 0; x < map.length; x++) {
        for (var y = 0; y < map[0].length; y++) {
            out += map[x][y];
        }
        out += "\n";
    }
    console.log(out);
}
//printMaze();


var oldMap = [
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

var colors = [];

(function() {
  // create a bunch of colors
  var c = new THREE.Color();
  var ncolors = 6;
  var nvalues = 2;
  for (var j = 0; j < nvalues; j++) {
    for (var i = 0; i < ncolors; i++) {
      c.setHSL((i + j / nvalues) / ncolors, 0.8, 0.6 - 0.4 * j / nvalues);
      colors.push(c.getHex());
    }
  }
})();

function getNewClientColor() {
  if (colors.length > 0) {
    return colors.splice(0, 1)[0];
  } else {
    // fallback
    console.log("No colors left");
    return Math.floor(Math.random() * 0xFFFFFF);
  }
}

function releaseClientColor(c) {
  colors.unshift(c);
}

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
        body.CreateFixture(shape, 5.0); // density 5

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
        var player = players[i];
        var body = data.body;
        // must grab data this way since the object is
        // converted to pure JSON on the way to the client
        var pos = body.GetPosition();
        data.x = pos.get_x();
        data.y = pos.get_y();
        data.angle = body.GetAngle();
        data.aim = player.aiming ? data.aim : -1;

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
  var fixDef = new Box2D.b2FixtureDef();
  fixDef.set_density(7.0);
  fixDef.set_friction(0.5);
  fixDef.set_restitution(0.7); // bounciness - higher is bouncier
  fixDef.set_shape(shape);
  var body = world.CreateBody(bodyDef);
  body.CreateFixture(fixDef);

  players[socket.id] = {
    body: body,
    color: getNewClientColor(),
    aiming: false
  };

  clientData[socket.id] = {
    id: socket.id,
    body: body,
    color: players[socket.id].color,
    aim: -1,
    aimPower: 0
  };

  // tell everybody!
  io.sockets.sockets.forEach(function(sock) {
    sock.emit("body-create", clientData[socket.id]);
  });

  // send a message to the client
  socket.emit("connected", clientData[socket.id]);

  console.log('Client connected! Id:', socket.id);
  socket.on("shot-fired", function shotFired(msg) {
    var body = players[socket.id].body;
    body.ApplyForce(new Box2D.b2Vec2(msg.deltaX * msg.power * 20, msg.deltaY * msg.power * 20), body.GetWorldCenter());

    players[socket.id].aiming = false;
  });

  socket.on("aim-change", function aimChange(msg) {
    if (!players[socket.id].aiming) {
      players[socket.id].aiming = true;
    }
    clientData[socket.id].aim = msg.angle;
    clientData[socket.id].aimPower = msg.power;
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
    var player = players[socket.id];
    destroy_list.push(player.body);
    releaseClientColor(player.color);
    delete players[socket.id];
    delete clientData[socket.id];

  });
});
http.listen(3004, function() {
  console.log('Listening on port: 3004');
});
