define(["THREE",
    "RandomEngine",
    "IOHandler",
    "Sprite",
    "WallSprite"
], function(THREE,
    RandomEngine,
    IOHandler,
    Sprite,
    WallSprite) {

    // https://color.adobe.com/create/color-wheel
    var colorScheme = [0x4914CC, 0x665199, 0x0040FF, 0xFFB740, 0xCC6F14];
    var randomColorFromScheme = function() {
        return colorScheme[Math.floor(RandomEngine.random() * colorScheme.length)];
    };

    var addLights = function(scene) {
        var light = new THREE.AmbientLight(0x404040); // soft white light
        scene.add(light);
    };

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

        var map = [
            [1, 1, 1, 1],
            [1, 0, 0, 1],
            [1, 0, 0, 1],
            [1, 1, 1, 1]
        ];

        var tileMap = [
            [5, 1, 1, 6],
            [4, 0, 0, 2],
            [4, 0, 0, 2],
            [8, 3, 3, 7]
        ];

        var types = {
            1: "top",
            2: "right",
            3: "bottom",
            4: "left",
            5: "top-left",
            6: "top-right",
            7: "bottom-right",
            8: "bottom-left"
        };

        var walls = [];
        var character;

        var images = {};

        var loadManager = new THREE.LoadingManager();
        loadManager.onLoad = function() {
            console.log(loadManager, imgLoader);
            // add map
            for (var i = 0; i < map.length; i++) {
                for (var j = 0; j < map[i].length; j++) {
                    if (map[i][j] != 0) {
                        var wall = new WallSprite(images.Wall, types[tileMap[i][j]]);
                        wall._x = j - map[i].length / 2 + 0.5;
                        wall._y = map.length / 2 - i;
                        wall.position.set(wall._x, wall._y, 0);
                        wall.setSize(1, 1);
                        topObj.add(wall);
                        walls.push(wall);
                    }
                }
            }

            // add character
            character = new Sprite(images.Reptile1, images.Reptile1.width, images.Reptile1.height, 16, 16);
            character.setTile(8 * 11 + 1);
            character.setSize(1, 1);
            topObj.add(character);
        };

        var imgLoader = new THREE.ImageLoader(loadManager);

        function imageLoaded(img) {
            var fname = img.src.split("/");
            fname = fname[fname.length - 1].split(".")[0];
            images[fname] = img;
        }

        imgLoader.load("sprites/dawnlike/Characters/Reptile1.png", imageLoaded);
        imgLoader.load("sprites/dawnlike/Objects/Wall.png", imageLoaded);

        scene.add(topObj);

        camera.position.z = 5;
        camera.position.y = 0;

        var resizeHandler = function(event) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize',
            resizeHandler,
            false);

        // Main render loop
        window.paused = false;

        var ang = 0;
        var loop = function() {

            if (window.paused) {
                return window.requestAnimationFrame(loop);
            }

            renderer.render(scene, camera);

            var deltaTime = clock.getDelta();

            for (var i = 0; i < walls.length; i++) {
                walls[i].position.set(walls[i]._x + Math.random() * deltaTime * 2, walls[i]._y + Math.random() * deltaTime * 2, 0);
            }

            if (character) {
                character.position.set(Math.cos(ang) * 0.5 - 0.5, Math.sin(ang) * 0.5 + 0.5, 0);
                character.rotation.setFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang));
            }
            ang += Math.PI * deltaTime;

            return window.requestAnimationFrame(loop);
        };

        loop();
    })();

});