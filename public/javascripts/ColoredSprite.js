/**
 * A 2-dimensional sprite.
 */
define([
    'THREE',
    'Sprite',
    'AssetManager'
], function(
    THREE,
    Sprite,
    AssetManager
) {

    var ColoredSprite = function(image, spriteWidth, spriteHeight, color) {
        Sprite.call(this, image, image.width, image.height, spriteWidth, spriteHeight);

        this.offsetRepeat = new THREE.Vector4();

        var c = new THREE.Color().setHex(color);
        var material = new THREE.ShaderMaterial({
            uniforms: {
                spritemap: {
                    type: "t",
                    value: this.texture
                },
                color: {
                    type: "v3",
                    value: new THREE.Vector3(c.r, c.g, c.b)
                },
                offsetRepeat: {
                    type: "v4",
                    value: this.offsetRepeat
                }
            },
            vertexShader: AssetManager.shaders.colored_vertex_shader,
            fragmentShader: AssetManager.shaders.colored_fragment_shader,
            transparent: true
        });
        this.material = material;

        this.setTile(0);
    };

    ColoredSprite.prototype = Object.create(Sprite.prototype);
    ColoredSprite.prototype.constructor = ColoredSprite;

    ColoredSprite.prototype.setTile = function(tile) {
        Sprite.prototype.setTile.apply(this, arguments);

        if (this.offsetRepeat) {
            this.offsetRepeat.set(this.texture.offset.x, this.texture.offset.y, this.texture.repeat.x, this.texture.repeat.y);
        }
    }

    return ColoredSprite;
});