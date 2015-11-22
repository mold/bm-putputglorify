define([
    "THREE",
    "RandomEngine",
    "IOHandler",
    "Sprite",
    "Dungeon",
    "SocketIO",
    "AssetManager"
], function(
    THREE,
    RandomEngine,
    IOHandler,
    Sprite,
    Dungeon,
    SocketIO,
    AssetManager
) {

    var iohandler = new IOHandler();
    var socket = new SocketIO();

    var scene = new THREE.Scene();
    var clock = new THREE.Clock();

    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 11;
    camera.position.y = 0;

    var light = new THREE.PointLight(0xFFF6BB, 1.0, 5.0);

    var renderer = new THREE.WebGLRenderer();
    var bgColor = 0x332222;
    renderer.setClearColor(bgColor);
    document.body.appendChild(renderer.domElement);

    var map;
    var character;

    window.paused = false;

    window.addEventListener('resize', resizeHandler, false);

    socket.on("new-body", function(body) {
        // character.position.set(body.position)

    });

    socket.on("bodies", function(bodies) {
        // var pos = bodies[0];
        // character.position.set(pos.x, pos.y, pos.z)
    })

    socket.on("map-update", load);
    AssetManager.onLoad(init);

    resizeHandler();

    ///////////////////////////

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

        var dungeon = new Dungeon(map);
        dungeon.position.set(-map[0].length / 2, map.length / 2 - 1, 0);
        scene.add(dungeon);

        // add character
        var img = AssetManager.images.sprite_map;
        character = new Sprite(img, img.width, img.height, 16, 16);
        character.setTile(16 * 12 + 1);
        character.setSize(1, 1);
        dungeon.add(character);

        character.add(light);
    }

    function init() {
        if (iohandler.getMap()) {
            load();
        }

        loop();
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

        if (map) {
            var x = Math.cos(ang) * 4 + map[0].length / 2;
            var y = Math.cos(ang * 0.35678) * 4 - map.length / 2;
            // 16 pixels per tile
            x = Math.floor(x * 16) / 16;
            y = Math.floor(y * 16) / 16;
            var scale = 1.2 + 0.4 * Math.cos(ang * 2);
            character.scale.set(scale, scale, scale);
            character.position.set(x, y, 0);
        }

        ang += deltaTime * Math.PI * 1 / 2;

        renderer.render(scene, camera);

        return window.requestAnimationFrame(loop);
    }

});