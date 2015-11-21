define([
    "THREE",
    "Wall"
], function(
    THREE,
    Wall
) {

    function Dungeon(img, map) {
        THREE.Mesh.call(this);

        var geometry = new THREE.Geometry();

        var tileMap = new Array(map.length);
        for (var i = 0; i < map.length; i++) {
            tileMap[i] = new Array(map[0].length);
            for (var j = 0; j < map[0].length; j++) {
                tileMap[i][j] = 0;
            }
        }
        for (var i = 0; i < map.length; i++) {
            for (var j = 0; j < map[0].length; j++) {
                for (var k = -1; k <= 1; k++) {
                    for (var l = -1; l <= 1; l++) {
                        if (map[i][j] != 0) {
                            var block = false;
                            if (i + k >= 0 && i + k < map.length &&
                                j + l >= 0 && j + l < map[0].length) {
                                block = map[i + k][j + l] != 0;
                            } else {
                                //block = true;
                            }
                            if (block) {
                                tileMap[i][j] += Math.pow(16, (1 - k) * 3 + 1 - l);
                            }
                        }
                    }
                }
            }
        }
        var vertexOffset = 0;
        for (var i = 0; i < map.length; i++) {
            for (var j = 0; j < map[i].length; j++) {
                if (map[i][j] != 0) {
                    var wall = new Wall(j, -i, tileMap[i][j], vertexOffset);
                    geometry.vertices = geometry.vertices.concat(wall.vertices);
                    geometry.faces = geometry.faces.concat(wall.faces);
                    geometry.faceVertexUvs[0] = geometry.faceVertexUvs[0].concat(wall.faceVertexUvs);
                    vertexOffset += 4;
                }
            }
        }

        var texture = new THREE.Texture(img);
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        var material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        texture.needsUpdate = true;

        this.texture = texture;
        this.geometry = geometry;
        this.material = material;

        this.geometry.verticesNeedsUpdate = true;
        this.geometry.uvsNeedsUpdate = true;
    }

    Dungeon.prototype = Object.create(THREE.Mesh.prototype);

    return Dungeon;

});