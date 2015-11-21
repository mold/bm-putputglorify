define(["THREE",
        "RandomEngine",
        "CameraMovement",
        "Airplane",
        "Skybox",
        "IOHandler"
    ],
    function(THREE,
        RandomEngine,
        CameraMovement,
        Airplane,
        Skybox,
        IOHandler) {

        // https://color.adobe.com/create/color-wheel
        var colorScheme = [0x4914CC, 0x665199, 0x0040FF, 0xFFB740, 0xCC6F14];
        var randomColorFromScheme = function() {
            return colorScheme[Math.floor(RandomEngine.random() * colorScheme.length)];
        };


        var NewCube = function(color) {
            var geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            var material = new THREE.MeshBasicMaterial({
                color: color,
                side: THREE.DoubleSide
            });

            var cube = new THREE.Mesh(geometry, material);

            return cube;
        };

        var NewAxis = function() {
            var redCube = NewCube(0xee0000);
            var blueCube = NewCube(0x00ee00);
            var greenCube = NewCube(0x0000ee);
            var whiteCube = NewCube(0xffffff);

            redCube.position.x = 1; // positive x-axis
            blueCube.position.y = 1; // positive y-axis
            greenCube.position.z = 1; // positive z-axis
            // white is origo

            var axis = new THREE.Object3D();

            axis.add(redCube);
            axis.add(blueCube);
            axis.add(greenCube);
            axis.add(whiteCube);

            return axis;
        };

        var addLights = function(scene) {

            var light = new THREE.AmbientLight(0x404040); // soft white light
            scene.add(light);

            var pointLight = new THREE.PointLight(0xeeeeee, 1, 0);
            scene.add(pointLight);

            pointLight.position.y = 5;
            pointLight.position.z = -2;
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
            var bgColor = randomColorFromScheme();
            renderer.setClearColor(bgColor);

            document.body.appendChild(renderer.domElement);

            // TODO: figure out how fog works
            scene.fog = new THREE.FogExp2(bgColor, 0.0025);

            addLights(scene);

            var topObj = new THREE.Object3D();

            var airplane = Airplane();
            var axis = NewAxis();
            var skybox = Skybox;

            topObj.add(airplane);

            topObj.add(axis);

            topObj.add(Skybox);


            scene.add(topObj);

            camera.position.z = 5;
            camera.position.y = 1;

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
            var cm = new CameraMovement(camera);
            cm.cameraPan(new THREE.Vector3(5, 2, 5));

            var loop = function() {

                if (window.paused) {
                    return window.requestAnimationFrame(loop);
                }

                renderer.render(scene, camera);

                var deltaTime = clock.getDelta();
                var ioRotationAndPos = iohandler.getRotationAndPosition();
                var ioRotation = ioRotationAndPos[0];
                var ioPosition = ioRotationAndPos[1];

                //console.log('%cRotation:', "color:green;", ioRotation);

                airplane.quaternion.slerp(ioRotation, 0.1);
                airplane.position.lerp(ioPosition, 0.1);
                //airplane.material.uniforms.time.value += 10 * deltaTime;

                //cm.move(deltaTime);

                return window.requestAnimationFrame(loop);
            };

            loop();
        })();

    });