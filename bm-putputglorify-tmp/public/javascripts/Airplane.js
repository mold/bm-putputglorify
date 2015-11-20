define(["THREE",
        "RandomEngine"],
function(THREE,
         RandomEngine) {

    // The green on the wings
    var GLOBAL_WIND_DIRECTION = new THREE.Vector3(-4, 0, 2);


    /**
       Creates a new AirPlane with a shader material.
    */
    var Airplane = function () {
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
        });*/


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

    return Airplane;
});
