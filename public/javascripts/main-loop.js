define(["THREE", "MersenneTwister"], function(THREE, MersenneTwister) {

    // Makes sure we have same 'random' every time
    var RandomEngine = new MersenneTwister(42);


    // The green on the wings
    var GLOBAL_WIND_DIRECTION = new THREE.Vector3(-4, 0, 2);

    // https://color.adobe.com/create/color-wheel
    var colorScheme = [0x4914CC, 0x665199, 0x0040FF, 0xFFB740, 0xCC6F14];
    var randomColorFromScheme = function () {
        return colorScheme[Math.floor(RandomEngine.random()*colorScheme.length)];
    };


    /**
       Creates a new AirPlane with a shader material.
    */
    var NewAirplane = function () {
        var i;
        var geometry = new THREE.BufferGeometry();
        var vertexPositions = [
            [  -1,     0,    0],
            [-0.2,     0,    0],
            [   0,     0,   -2],
            [   0,  -0.5,    0],
            [   0.2,   0,    0],
            [   1,     0,    0],
        ];

        var numberOfVertices = vertexPositions.length;
        var numberOfTriangles = 4;

        /*** Attributes ***/

        /* indices for making triangles of the airplane */
        var indices = new Uint32Array( numberOfTriangles * 3 );
        var indicesArr = [
            [0, 2, 1], // Left wing
            [1, 2, 3],
            [4, 2, 3],
            [4, 2, 5]
        ];
        var iflattened = indicesArr.reduce(function(a, b){
            return a.concat(b);
        });

        for (var ii in iflattened) {
            indices[ii] = iflattened[ii];
        }


        geometry.setIndex(new THREE.BufferAttribute(indices, 1));

        /* position */
        var positions = new Float32Array(numberOfVertices * 3);
        for (i = 0; i < numberOfVertices; i++) {
            positions[i*3] = vertexPositions[i][0];
            positions[i*3 + 1] = vertexPositions[i][1];
            positions[i*3 + 2] = vertexPositions[i][2];
        };

        geometry.addAttribute('position',
                              new THREE.Float32Attribute(
                                  positions,
                                  3));

        /* color
        var colors = new Uint32Array(numberOfVertices * 3);
        for (i = 0; i < numberOfVertices; i++) {
            var color = colorScheme[3];
            colors[3*i] = color & 0xff;
            colors[3*i + 1] = color & 0xff00;
            colors[3*i + 2] = color & 0xff0000;
        }
        geometry.addAttribute('color', new THREE.Float32Attribute(colors, 3));
        */

        /* density - mock attribute */
        var densities = new Float32Array(numberOfVertices);
        for (i = 0; i < numberOfVertices; i++) {
            densities[i] = 0.1 + (RandomEngine.random()*0.9);
        }

        geometry.addAttribute('density',
                              new THREE.Float32Attribute(densities, 1));

        /*
        var material = new THREE.RawShaderMaterial({
            uniforms: {
                time: {
                    type: "f",
                    value: 1.0
                },
                vWindDirection: {
                    type: "v3",
                    value: GLOBAL_WIND_DIRECTION
                }
            },
            vertexShader: document.getElementById('airPlaneVertexShader').textContent,
            fragmentShader: document.getElementById('airPlaneFragmentShader').textContent,
            side: THREE.DoubleSide
        });
        */

          var material = new THREE.MeshPhongMaterial({
          color: 0xeeeeee,
          emissive: 0x0,
          specular: 0x009000,
          shininess: 30,
          shading: THREE.FlatShading, //THREE.SmoothShading,
          //wireframe: true,
          side: THREE.DoubleSide
          });


        return new THREE.Mesh(geometry, material);
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

        redCube.position.x = 1;      // positive x-axis
        blueCube.position.y = 1;     // positive y-axis
        greenCube.position.z = 1;    // positive z-axis
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


    window.onload = function () {

        var scene = new THREE.Scene();
        var clock = new THREE.Clock();
        var camera = new THREE.PerspectiveCamera(75,
                                                 window.innerWidth /
                                                 window.innerHeight,
                                                 0.1,
                                                 100);
        var renderer = new THREE.WebGLRenderer();

        renderer.setSize(window.innerWidth, window.innerHeight);
        var bgColor = randomColorFromScheme();
	       renderer.setClearColor( bgColor );

        document.body.appendChild(renderer.domElement);

        // TODO: figure out how fog works
        scene.fog = new THREE.FogExp2( bgColor, 0.0025 );

        addLights(scene);

        var topObj = new THREE.Object3D();

        var airplane = NewAirplane();
        var axis = NewAxis();

        topObj.add(airplane);

        topObj.add(axis);

        scene.add(topObj);

        camera.position.z = 5;
        camera.position.y = 1;

        var resizeHandler = function( event ) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize',
                                resizeHandler,
                                false);


        //Camera movement
        var phi;
        var theta;
        var cameraPan = function (deltaTime) {

        };


        // Main render loop

        window.paused = false;



        var loop = function () {

            if (window.paused) { return window.requestAnimationFrame( loop ); }

            renderer.render( scene, camera );

            var deltaTime = clock.getDelta();

            //airplane.rotation.y += 1 * deltaTime;
//            airplane.rotation.z += 1 * deltaTime;
//            topObj.rotation.y += 1 * deltaTime;

            airplane.material.uniforms.time.value += 10 * deltaTime;

            return window.requestAnimationFrame( loop );
        };

        loop();
    };

});
