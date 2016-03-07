define([
    "THREE",
    "RandomEngine",
    "IOHandler",
    "Sprite",
    "ColoredSprite",
    "Dungeon",
    "SocketIO",
    "AssetManager",
    "QRCode",
    "jQuery"
], function(
    THREE,
    RandomEngine,
    IOHandler,
    Sprite,
    ColoredSprite,
    Dungeon,
    SocketIO,
    AssetManager,
    QRCode,
    jQuery
) {
    var iohandler = new IOHandler();
    var socket = new SocketIO();

    var dungeon = null;
    var scene = new THREE.Scene();
    var clock = new THREE.Clock();

    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;
    camera.position.y = 0;

    var renderer = new THREE.WebGLRenderer();
    var bgColor = 0x332222;
    renderer.setClearColor(bgColor);
    document.body.appendChild(renderer.domElement);

    var map;
    var character;
    var characters = {};
    var robots = {};
    var prevRobotBodies = {};

    window.paused = false;
    var robotPathDebug = false;

    var debug = document.getElementById("debug");
    var qrButton = document.getElementById("qr-button");
    var overlay = document.getElementById("overlay");
    var joinButton = $("#join-button");

    joinButton.click(function() {
        var ctrl = $("#controller");
        var iframe = $("#controller-iframe");
        var closeBtn = $("#close-controller");

        var closeController = function() {
            // remove the controller and leave the game?
            iframe.attr("src", "");
            ctrl.hide(500);
            joinButton.html("Join");

        }

        closeBtn.click(closeController);

        if (ctrl.css("display") == "none") {
            // load a controller on the page
            ctrl.show(500);
            iframe.attr("src", "http://" + window.location.host + window.location.pathname + "client");
            joinButton.html("Leave");
        } else {
            closeController();
        }
    })

    qrButton.addEventListener('click', function() {
        overlay.style.display = 'block';
    });
    overlay.addEventListener('click', function() {
        overlay.style.display = 'none';
    });

    var LERP_FRACTION = 1.0 / 6.0; /* 0 < LERP_FRACTION <= 1.0 */

    window.addEventListener('resize', resizeHandler, false);


    socket.on("body-create", function(body) {
        console.info("client connected");
    });

    socket.on("body-destroy", function(body) {
        console.info("client disconnected", body);
        if (body.id in characters) {
            dungeon.remove(characters[body.id].obj);
            delete characters[body.id];
        }
    });

    socket.on("bodies", function(bodies) {
        if (dungeon) {
            var b = 0;
            //var coords = [];
            for (i in bodies.players) {
                var body = bodies.players[i];

                if (typeof characters[body.id] == "undefined") {
                    characters[body.id] = {
                        body: body,
                        obj: null
                    };
                    load();

                } else if (characters[body.id].obj) {
                    var ch = characters[body.id].obj;
                    ch.position.set(body.x + 0.5, -body.y + 0.5, 0);
                    ch.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), body.angle);

                    if (body.aim >= 0) {
                        var angle = body.angle - (Math.PI - body.aim);
                        var scale = 0.5 + Math.pow(body.aimPower, 2);
                        var vibrateX = Math.random() * Math.pow(body.aimPower, 2) * 0.1;
                        var vibrateY = Math.random() * Math.pow(body.aimPower, 2) * 0.1;
                        var distance = 0.6 + 0.5 * body.aimPower;
                        ch.aim.scale.set(scale, scale, 1);
                        ch.aim.position.set(Math.cos(angle) * distance + vibrateX, -Math.sin(angle) * distance + vibrateY, 0);
                        ch.aim.visible = true;
                        ch.aim.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 3 / 2 - angle);
                    } else {
                        ch.aim.visible = false;
                    }
                }
                //coords.push('( ' + (Math.floor(10 * body.x) / 10) + ' , ' + (Math.floor(10 * body.y) / 10) + ' , ' + (Math.floor(10 * body.aimPower) / 10) + ' )');
            }
            //debug.innerHTML = coords.join(' ');
            for (var i in bodies.robots) {
                var body = bodies.robots[i];

                if (typeof robots[body.id] == "undefined") {
                    robots[body.id] = {
                        body: body,
                        obj: null
                    };
                    load();

                } else if (robots[body.id].obj) {
                    var rb = robots[body.id].obj;
                    if (robotPathDebug && body.path) {
                        body.path.unshift({
                            x: body.currentTargetX,
                            y: body.currentTargetY
                        });
                    }
                    if (!rb) {
                        var rb = createCharacter();
                        dungeon.add(rb);
                        if (robotPathDebug) {
                            rb.pathLine = createLine(body.path);
                            dungeon.add(rb.pathLine);
                            rb.curPathLine = createLine(null, []);
                            dungeon.add(rb.curPathLine);
                        }
                        robots[body.id] = rb;

                        prevRobotBodies[body.id] = body;
                    }
                    var prevBody = prevRobotBodies[body.id];
                    rb.position.set(body.x + 0.5, -body.y + 0.5, 0);
                    rb.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), body.angle);

                    if (robotPathDebug && pathsDiffer(body.path, prevBody.path)) {
                        dungeon.remove(rb.pathLine);
                        rb.pathLine = createLine(body.path);
                        dungeon.add(rb.pathLine);

                        dungeon.remove(rb.curPathLine);
                        rb.curPathLine = createLine([{
                            x: body.prevTargetX,
                            y: body.prevTargetY
                        }, {
                            x: body.currentTargetX,
                            y: body.currentTargetY
                        }], 0x0000ff);
                        dungeon.add(rb.curPathLine);
                    }

                    if (body.aim >= 0) {
                        var angle = body.angle - (Math.PI - body.aim);
                        var scale = 0.5 + Math.pow(body.aimPower, 2);
                        var vibrateX = Math.random() * Math.pow(body.aimPower, 2) * 0.1;
                        var vibrateY = Math.random() * Math.pow(body.aimPower, 2) * 0.1;
                        var distance = 0.6 + 0.5 * body.aimPower;
                        rb.aim.scale.set(scale, scale, 1);
                        rb.aim.position.set(Math.cos(angle) * distance + vibrateX, -Math.sin(angle) * distance + vibrateY, 0);
                        rb.aim.visible = true;
                        rb.aim.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 3 / 2 - angle);
                    } else {
                        rb.aim.visible = false;
                    }

                    prevRobotBodies[body.id] = body;
                }
            }
        }
    });

    socket.on("viewer-init", viewerInit);
    socket.on("map-update", load);
    AssetManager.onLoad(init);

    resizeHandler();

    ///////////////////////////

    function createCharacter(color) {
        // add character
        var img = AssetManager.images.sprite_map;
        var ch;
        if (isNaN(color)) {
            ch = new Sprite(img, img.width, img.height, 16, 16);
            ch.setTile(16 * 12 + 4);
            color = 0xffffff;
        } else {
            ch = new ColoredSprite(img, 16, 16, color);
            ch.setTile(16 * 12 + 1);
        }
        ch.setSize(1, 1);

        ch.aim = new ColoredSprite(img, 16, 16, color);
        ch.aim.setTile(16 * 12 + 3);
        ch.aim.setSize(1, 1);
        ch.aim.visible = false;
        ch.add(ch.aim);

        var light = new THREE.PointLight(0xFFF6BB, 1.0, 7.0);
        ch.add(light);

        return ch;
    }

    function createLine(path, color) {
        var material = new THREE.LineBasicMaterial({
            color: isNaN(color) ? 0xff0000 : color,
            opacity: 0.5,
            transparent: true,
            linewidth: 2
        });
        var geometry = new THREE.Geometry();
        var vertices = [];
        if (path) {
            for (var i = 0; i < path.length; i++) {
                vertices.push(new THREE.Vector3(path[i].x + 0.5, -path[i].y + 0.5, 0));
            }
        }
        geometry.vertices = vertices;
        var line = new THREE.Line(geometry, material);
        return line;
    }

    function pathsDiffer(a, b) {
        if (!(a instanceof Array) || !(b instanceof Array)) {
            return false;
        }
        if (a.length != b.length) {
            return true;
        }
        for (var i = 0; i < a.length; i++) {
            if (a[i].x != b[i].x || a[i].y != b[i].y) {
                return true;
            }
        }
        return false;
    }

    function resizeHandler(event) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    function load() {
        if (!AssetManager.loaded()) {
            return;
        }

        while (scene.children.length > 0)
            scene.remove(scene.children[0]);

        map = iohandler.getMap();

        dungeon = new Dungeon(map);
        dungeon.position.set(-map[0].length / 2, map.length / 2 - 1, 0);
        scene.add(dungeon);

        for (var i in characters) {
            var ch = characters[i];
            ch.obj = createCharacter(ch.body.color);
            dungeon.add(ch.obj);
        }
        for (var i in robots) {
            var rb = robots[i];
            rb.obj = createCharacter();
            dungeon.add(rb.obj);
        }
    }

    function init() {
        if (iohandler.getMap()) {
            load();
        }

        loop();
    }

    function viewerInit(data) {
        var qrcodeEl = document.getElementById("qrcode");
        var clientEl = document.getElementById("client-url");
        clientEl.innerHTML = data.client;
        qrcodeEl.innerHTML = "";
        var qrcode = new QRCode(qrcodeEl, {
            text: data.client,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    var ang = 0;

    /**
     * Main render loop
     */
    function loop() {
        if (window.paused) {
            return window.requestAnimationFrame(loop);
        }

        var deltaTime = clock.getDelta();

        ang += deltaTime * Math.PI * 1 / 2;

        renderer.render(scene, camera);

        return window.requestAnimationFrame(loop);
    }

});
