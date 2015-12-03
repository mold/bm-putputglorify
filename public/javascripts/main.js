define([
    "THREE",
    "RandomEngine",
    "IOHandler",
    "Sprite",
    "ColoredSprite",
    "Dungeon",
    "SocketIO",
    "AssetManager",
    "QRCode"
], function(
    THREE,
    RandomEngine,
    IOHandler,
    Sprite,
    ColoredSprite,
    Dungeon,
    SocketIO,
    AssetManager,
    QRCode
) {

    var iohandler = new IOHandler();
    var socket = new SocketIO();

    var dungeon = null;
    var scene = new THREE.Scene();
    var clock = new THREE.Clock();

    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 11;
    camera.position.y = 0;

    var renderer = new THREE.WebGLRenderer();
    var bgColor = 0x332222;
    renderer.setClearColor(bgColor);
    document.body.appendChild(renderer.domElement);

    var map;
    var character;
    var characters = {};
    var robots = {};

    window.paused = false;
    var debug = document.getElementById("debug");
    var qrButton = document.getElementById("qr-button");
    var overlay = document.getElementById("overlay");

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
            dungeon.remove(characters[body.id]);
            delete characters[body.id];
        }
    });

    socket.on("bodies", function(bodies) {
        if (dungeon) {
            var b = 0;
            //var coords = [];
            for (i in bodies.players) {
                var body = bodies.players[i];
                var ch = characters[body.id];
                if (!ch) {
                    var ch = createCharacter(body.color);
                    characters[body.id] = ch;
                    dungeon.add(ch);
                }
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

                //coords.push('( ' + (Math.floor(10 * body.x) / 10) + ' , ' + (Math.floor(10 * body.y) / 10) + ' , ' + (Math.floor(10 * body.aimPower) / 10) + ' )');
            }
            //debug.innerHTML = coords.join(' ');
            for (var i in bodies.robots) {
                var body = bodies.robots[i];
                var rb = robots[body.id];
                if (!rb) {
                    var rb = createCharacter();
                    robots[body.id] = rb;
                    dungeon.add(rb);
                }
                rb.position.set(body.x + 0.5, -body.y + 0.5, 0);
                rb.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), body.angle);

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

        return ch;
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

        for (var i in characters)
            dungeon.add(characters[i]);
        for (var i in robots)
            dungeon.add(robots[i]);

        // TODO: the light shader is broken, don't add more lights!
        var light = new THREE.PointLight(0xFFF6BB, 1.0, 7.0);
        light.position.set(map[0].length / 2 + 0.5, -map.length / 2 + 1, 0);
        dungeon.add(light);
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