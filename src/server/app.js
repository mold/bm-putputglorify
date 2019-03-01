var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var planck = require('planck-js');
var gameloop = require('node-gameloop');
var MersenneTwister = require('mersenne-twister');
var _ = require('lodash');
var THREE = require('three');

var ShellRobot = require('./robot/ShellRobot');
var PathFinder = require('./map/PathFinder');

var generateMaze = require('./map/MazeGenerator');

var port = 3004;
var root = process.env.ROOT_URL;

http.listen(port, function() {
    console.log(`Listening on port: ${port}`);
});


if (!root) {
    // take the first ip that we can find!
    var os = require('os');
    var networkInterfaces = os.networkInterfaces();
    for (var type in networkInterfaces) {
        if (type.match(/^wl.*/g)) {
            root = 'http://' + networkInterfaces[type][0].address + ':' + port + '/';
        }
    }
} else {
    root = '';
}

console.log('Server root: ' + root);

var latestBody;
var groundMaterial;

var world;
var Vec2 = planck.Vec2;

var RandomEngine = new MersenneTwister(40);

var maxLinearVelocity = 5;
var angularDamping = 0.005; //dependent on maxLinearVelocity
var linearDampingFunction = function(v) {
    return Math.pow(maxLinearVelocity - v, 1.5);
};

console.log('now in ' + process.cwd());

app.use("/lib", express.static(process.cwd() + "/lib"))
app.use("/scripts", express.static(process.cwd() + "/src/client"));
app.use("/styles", express.static(process.cwd() + "/resources/stylesheets"));
app.use("/sprites", express.static(process.cwd() + "/resources/sprites"));
app.use("/shaders", express.static(process.cwd() + "/resources/shaders"));
app.use("/views", express.static(process.cwd() + "/views"));

app.get('/', function(req, res) {
    res.sendFile("index.html", {
        root: process.cwd() + "/views"
    });
});

app.get('/client', function(req, res) {
    res.sendFile("client.html", {
        root: process.cwd() + "/views"
    });
});



// Generates a random map
var map = [];
var mapWidth = 20,
    mapHeight = 30;

var mazeGenerator = generateMaze(map, mapWidth, mapHeight);

var testMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

var pathFinder = new PathFinder(map, function(coord, map) {
    return map[coord.y][coord.x] == 0;
});


var w = map[0].length;
var h = map.length;

var bodyMap = [];

var destroy_list = [];
var players = {};
var clientData = {};
var robots = {};

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

    for (var i = 0; i < map.length; i++) {
        bodyMap.push([]);
        for (var j = map[0].length - 1; j >= 0; j--) {
            var elem = map[i][j];
            if (0 != elem) {
                // create a static body
                var body = world.createBody();
                body.setPosition(Vec2(j, i));
            
                var fix = body.createFixture(planck.Box(0.4, 0.4)); 
                fix.setDensity(5.0); // density 5

                bodyMap[i].push(body);
            }
            bodyMap[i].push(null);
        };
    }
};

// Server main init
(function() {
    // no gravity
    world = planck.World(Vec2(0.0, 0.0), true);

    // add a shellbot
    var x = w / 2,
        y = h / 2;
    for (var i = Math.floor(h / 2) - 1; i < h / 2 + 2; i++) {
        for (var j = Math.floor(w / 2) - 1; j < w / 2 + 2; j++) {
            if (map[i][j] == 0) {
                x = j;
                y = i;
            }
        }
    }
    var shellbot = new ShellRobot(world, x, y, pathFinder);
    robots[shellbot.id] = shellbot;
    var timeUntilNextGlobalTargetUpdate = 1;
    var targetPoint = 0;

    initWorldBodiesFromMap();

    var fixedTimeStep = 1.0 / 60.0; // seconds
    var maxSubSteps = 3;

    // Start the physics simulation loop
    gameloop.setGameLoop(function(delta) {
        //world.step(fixedTimeStep, delta, maxSubSteps);
        world.step(fixedTimeStep, 2, 2);
        world.clearForces();

        timeUntilNextGlobalTargetUpdate -= delta;

        // update the robots
        for (var i in robots) {
            var rb = robots[i];
            rb.update(fixedTimeStep);
            var body = rb.body;
            if (shellbot.targetReached() || shellbot.isStuck()) {
                if (Object.keys(players).length > 0) {
                    var pos = players[Object.keys(players)[0]].body.getPosition();
                    shellbot.setGlobalTarget(pos.x, pos.y);
                }
            }

            var pos = rb.getPos();
            rb.x = pos.x;
            rb.y = pos.y;
            rb.angle = 2 * Math.PI - body.getAngle();

            // simulate ground and wind friction
            // so that they don't roll forever
            var v = body.getLinearVelocity();
            if (v.length() > 0 && v.length() < maxLinearVelocity) {
                var x = v.x;
                var y = v.y;
                var linearDamping = linearDampingFunction(v.length());
                body.applyForce(Vec2(-x * linearDamping, -y * linearDamping), body.getWorldCenter());
                // this is very arbitrary
                // TODO: check so that it doesn't starts to spin faster
                body.applyAngularImpulse(-body.getAngularVelocity() * linearDamping * angularDamping);
            }
        }


        for (var i in clientData) {
            var data = clientData[i];
            var player = players[i];
            var body = data.body;
            // must grab data this way since the object is
            // converted to pure JSON on the way to the client
            var pos = body.getPosition();
            data.x = pos.x;
            data.y = pos.y;
            data.angle = 2 * Math.PI - body.getAngle();
            data.aim = player.aiming ? data.aim : -1;

            // simulate ground and wind friction
            // so that they don't roll forever
            var v = body.getLinearVelocity();
            if (v.length() > 0 && v.length() < maxLinearVelocity) {
                var x = v.x;
                var y = v.y;
                var linearDamping = linearDampingFunction(v.length());
                body.applyForce(Vec2(-x * linearDamping, -y * linearDamping), body.getWorldCenter());
                // this is very arbitrary
                // TODO: check so that it doesn't starts to spin faster
                body.applyAngularImpulse(-body.getAngularVelocity() * linearDamping * angularDamping);
            }
        }

        io.emit("bodies", {
            "players": clientData,
            "robots": robots
        });

        // destroy old players
        if (destroy_list.length > 0) {
            destroy_list.forEach(function(body) {
                world.destroyBody(body);
            });
            destroy_list.length = 0;
        }
    }, 1000 / 30);

})();

// This namespace is for the viewer
// TODO: the player client also triggers this
io.of('/').on('connection', function(socket) {
    // Send map the first we do
    io.emit('viewer-init', {
        root: root,
        client: root + 'client'
    });
    io.emit('map-update', map);
    console.log('Viewer connected! Id:', socket.id);
});

// This namespace is for the player
io.of('/client').on('connection', function(socket) {
    // create a circular dynamic body in the middle
    var body = world
        .createBody()
        .setDynamic();
    body.setPosition(Vec2(w / 2, h / 2));
    
    var fix = body.createFixture(planck.Circle(0.5))
    fix.setDensity(7.0);
    fix.setFriction(1.0);
    fix.setRestitution(0.5); // bounciness - higher is bouncier

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
    socket.broadcast.emit("body-create", clientData[socket.id]);

    // send a message to the client
    socket.emit("connected", clientData[socket.id]);

    console.log('Client connected! Id:', socket.id);
    socket.on("shot-fired", function shotFired(msg) {
        var body = players[socket.id].body;
        body.applyForce(Vec2(msg.deltaX * msg.power * 20, msg.deltaY * msg.power * 20), body.getWorldCenter());

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
        io.emit("body-destroy", clientData[socket.id]);

        console.log('Client disconnected!');
        var player = players[socket.id];
        destroy_list.push(player.body);
        releaseClientColor(player.color);
        delete players[socket.id];
        delete clientData[socket.id];

    });
});
