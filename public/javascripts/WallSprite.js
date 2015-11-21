define([
	'THREE',
    'Sprite'
], function(
	THREE,
    Sprite
) {

	function WallSprite(img, type) {
		Sprite.call(this, img, img.width, img.height, 16, 16);

		this.setWallType(type);
	}

	WallSprite.prototype = Object.create(Sprite.prototype);

	WallSprite.prototype.setWallType = function(type) {
		switch (type) {
			case "top":
				this.setTile(20*3+1);
				break;
			case "bottom":
				this.setTile(20*3+1);
				break;
			case "left":
				this.setTile(20*4);
				break;
			case "right":
				this.setTile(20*4);
				break;
			case "top-left":
				this.setTile(20*3);
				break;
			case "top-right":
				this.setTile(20*3+2);
				break;
			case "bottom-left":
				this.setTile(20*5);
				break;
			case "bottom-right":
				this.setTile(20*5+2);
				break;
		}
	};

	return WallSprite;

});