/**
 * A 2-dimensional sprite.
 */
define([
    'THREE'
    //'utils/animation'
], function(
    THREE
    //Animation
) {

    var Sprite = function(image, width, height, spriteWidth, spriteHeight, lights) {
        THREE.Mesh.call(this);

        if (width === undefined || height === undefined) {
            width = image.width;
            height = image.height;
        }
        if (spriteWidth === undefined || spriteHeight === undefined) {
            spriteWidth = image.width;
            spriteHeight = image.height;
        }
        this.width = width;
        this.height = height;
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;
        var geometry = new THREE.PlaneGeometry(1, 1);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(-0.5,0, 0));
        this.cols = image.width / spriteWidth;
        this.rows = image.height / spriteHeight;
        var texture = new THREE.Texture(image);
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1 / this.cols, 1 / this.rows);
        var material;
        if (lights == undefined || lights) {
            material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true
            });
        } else {
            material = new THREE.MeshLambertMaterial({
                map: texture,
                color: new THREE.Color(0x000000),
                ambient: new THREE.Color(0x000000),
                emissive: new THREE.Color(0xffffff),
                transparent: true
            });
        }
        texture.needsUpdate = true;
        this.texture = texture;

        this.geometry = geometry;
        this.material = material;

        this.setTile(0);

        this.castShadow = false;
        this.receiveShadow = false;

        this.setSize(width, height);
    };

    Sprite.prototype = Object.create(THREE.Mesh.prototype);

    Sprite.prototype.clone = function(object, recursive) {
        if (object === undefined) {
            object = new Sprite(this.texture.image, this.width, this.height, this.spriteWidth, this.spriteHeight);
        }
        THREE.Object3D.prototype.clone.call(this, object, recursive);

        return object;
    };

    Sprite.prototype.setSize = function(width, height) {
        this.scale.set(width, height, 1);
    };

    Sprite.prototype.setImage = function(image) {
        this.material.map = image;
        this.material.needsUpdate = true;
    }

    Sprite.prototype.setTile = function(index) {
        var y = Math.floor(index / this.cols);
        var x = index - y * this.cols;
        this.texture.offset.x = x / this.cols;
        this.texture.offset.y = 1 - (y + 1) / this.rows;
    };

    /*Sprite.prototype.animate = function(cycle, duration) {
        var prevIndex = 0;
        this.stop();
        this.animation = Animation.animate({
            loop: (function(d) {
                var index = Math.floor(d * cycle.length);
                if (index !== prevIndex) {
                    if (index < cycle.length) {
                        this.setTile(cycle[index]);
                        prevIndex = index;
                    }
                }
            }).bind(this),
            duration: duration,
            continuous: true
        });
        this.setTile(cycle[0]);
    };

    Sprite.prototype.stop = function() {
        Animation.removeAnimation(this.animation);
    };*/

    Sprite.prototype.update = function() {
        this.texture.needsUpdate = true;
    }

    return Sprite;
});
