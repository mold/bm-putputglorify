define(["THREE",
    "RandomEngine",
    "IOHandler",
    "Sprite",
    "Dungeon",
    "SocketIO"
], function(THREE,
    RandomEngine,
    IOHandler,
    Sprite,
    Dungeon,
    SocketIO) {

    // https://color.adobe.com/create/color-wheel
    var colorScheme = [0x4914CC, 0x665199, 0x0040FF, 0xFFB740, 0xCC6F14];
    var randomColorFromScheme = function() {
        return colorScheme[Math.floor(RandomEngine.random() * colorScheme.length)];
    };

    var addLights = function(scene) {
        var light = new THREE.AmbientLight(0x404040); // soft white light
        scene.add(light);
    };

    var socket = new SocketIO();


    (function() {

        var scene = new THREE.Scene();
        var clock = new THREE.Clock();
        var camera = new THREE.PerspectiveCamera(75,
            window.innerWidth /
            window.innerHeight,
            0.1,
            1000);
        var renderer = new THREE.WebGLRenderer();
        var iohandler = new IOHandler();


        renderer.setSize(window.innerWidth, window.innerHeight);
        var bgColor = 0x332222; //randomColorFromScheme();
        renderer.setClearColor(bgColor);

        document.body.appendChild(renderer.domElement);

        addLights(scene);

        var topObj = new THREE.Object3D();

        var cube = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 1), new THREE.MeshNormalMaterial());

        var walls = [];
        var character;

        var images = {};
        var imagesLoaded = false;

        var loadManager = new THREE.LoadingManager();
        loadManager.onLoad = function() {
            imagesLoaded = true;
        };

        var imgLoader = new THREE.ImageLoader(loadManager);

        function imageLoaded(img) {
            var fname = img.src.split("/");
            fname = fname[fname.length - 1].split(".")[0];
            images[fname] = img;
        }

        imgLoader.load("sprites/sprite_map.png", imageLoaded);

        scene.add(topObj);

        camera.position.z = 11;
        camera.position.y = 0;

        var resizeHandler = function(event) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        var loaded = false;

        var map;

        var load = function(offset) {
            while (topObj.children.length > 0)
                topObj.remove(topObj.children[0]);

            var map = iohandler.getMap();

            var dungeon = new Dungeon(images.sprite_map, map);
            dungeon.position.set(-map[0].length / 2, map.length / 2 - 1, 0);
            topObj.add(dungeon);
            console.log(dungeon);

            // add character
            character = new Sprite(images.sprite_map, images.sprite_map.width, images.sprite_map.height, 16, 16);
            character.setTile(16 * 12 + 1);
            character.setSize(1, 1);
            topObj.add(character);
        }

        window.addEventListener('resize',
            resizeHandler,
            false);

        socket.on("new-body", function(body) {
            // character.position.set(body.position)

        });

        socket.on("bodies", function(bodies) {
            // var pos = bodies[0];
            // character.position.set(pos.x, pos.y, pos.z)
        })

        // Main render loop
        window.paused = false;

        var ang = 0;
        var loop = function() {

            if (!loaded && imagesLoaded && iohandler.getMap()) {
                load();
                loaded = true;
            }

            if (window.paused) {
                return window.requestAnimationFrame(loop);
            }

            renderer.render(scene, camera);

            var deltaTime = clock.getDelta();

            for (var i = 0; i < walls.length; i++) {
                //walls[i].position.set(walls[i]._x + Math.random() * deltaTime * 2, walls[i]._y + Math.random() * deltaTime * 2, 0);
            }

            if (character) {
                character.position.set(Math.cos(ang) * 0.5, Math.sin(ang) * 0.5 + 0.5, 0);
                character.rotation.setFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang));
            }
            ang += Math.PI * deltaTime;

            return window.requestAnimationFrame(loop);
        };

        loop();
    })();

});