define([
	'THREE'
], function(
	THREE
) {

	function Wall(x, y, type, vOffset) {
		this.vertices = [
			new THREE.Vector3(x + 0, y + 0, 0),
			new THREE.Vector3(x + 1, y + 0, 0),
			new THREE.Vector3(x + 1, y + 1, 0),
			new THREE.Vector3(x + 0, y + 1, 0)
		];

		this.faces = [
			new THREE.Face3(vOffset + 0, vOffset + 1, vOffset + 2),
			new THREE.Face3(vOffset + 0, vOffset + 2, vOffset + 3)
		];

		var coords = this.getTileCoords(type);
		var tx = coords[0] / 16,
			ty = (-coords[1] - 1) / 16,
			off = 1 / 16;

		this.faceVertexUvs = [
			[
				new THREE.Vector2(tx, ty),
				new THREE.Vector2(tx + off, ty),
				new THREE.Vector2(tx + off, ty + off)
			],
			[
				new THREE.Vector2(tx, ty),
				new THREE.Vector2(tx + off, ty + off),
				new THREE.Vector2(tx, ty + off)
			]
		];
	}

	Wall.prototype.setVertexOffset = function(offset) {
		this.faces[0].set(offset + 0, offset + 1, offset + 2);
		this.faces[1].set(offset + 0, offset + 2, offset + 3);
	};

	Wall.prototype.getTileCoords = function(type) {
		var top = Math.floor(type / Math.pow(16, 6)) & 0x111;
		var mid = Math.floor(type / Math.pow(16, 3)) & 0x111;
		var base = (type) & 0x111;

		if (!(top & 0x010) && (mid == 0x111) && !(base & 0x010)) {
			// top
			return [1, 0];
		} else if ((top == 0x111) && (mid == 0x111) && !(base & 0x010)) {
			// top
			return [4, 2];
		} else if (!(top & 0x010) && (mid == 0x111) && !(base & 0x010)) {
			// base
			return [1, 0];
		} else if (!(top & 0x010) && (mid == 0x111) && (base == 0x111)) {
			// base
			return [4, 0];
		} else if ((top & 0x010) && (mid == 0x010) && (base & 0x010)) {
			// left
			return [0, 1];
		} else if ((top & 0x010) && (mid == 0x010) && (base & 0x010)) {
			// right
			return [0, 1];

		} else if (!(top & 0x010) && (mid == 0x011) && (base & 0x010)) {
			// top left
			return [0, 0];
		} else if (!(top & 0x010) && (mid == 0x110) && (base & 0x010)) {
			// top right
			return [2, 0];
		} else if ((top & 0x010) && (mid == 0x011) && !(base & 0x010)) {
			// base left
			return [0, 2];
		} else if ((top & 0x010) && (mid == 0x110) && !(base & 0x010)) {
			// base right
			return [2, 2];

		} else if (!(top & 0x010) && (mid == 0x111) && (base & 0x010)) {
			// !top bottom left right
			return [4, 0];
		} else if ((top & 0x010) && (mid == 0x111) && !(base & 0x010)) {
			// top !bottom left right
			return [4, 2];

		} else if (!(top & 0x010) && (mid == 0x011) && !(base & 0x010)) {
			// !top !bottom right
			return [0, 2];
		} else if (!(top & 0x010) && (mid == 0x110) && !(base & 0x010)) {
			// !top !bottom left
			return [2, 2];

		} else if ((top & 0x010) && (mid == 0x011) && (base & 0x010)) {
			// top bottom right
			return [3, 1];
		} else if ((top & 0x010) && (mid == 0x110) && (base & 0x010)) {
			// top bottom left
			return [5, 1];
		} else if (((top == 0x010) || (top == 0x110)) && (mid == 0x111) && (base & 0x010)) {
			// top bottom left right
			return [4, 1];

		} else if ((top & 0x010) && (mid == 0x010) && !(base & 0x010)) {
			// top !bottom !left !right
			return [1, 1];
		} else if (!(top & 0x010) && (mid == 0x010) && (base & 0x010)) {
			// !top bottom !left !right
			return [0, 1];

		} else if (!(top & 0x010) && (mid == 0x010) && !(base & 0x010)) {
			// single
			return [1, 1];
		} else if ((top & 0x010) && (mid == 0x111) && (base & 0x010)) {
			// enclosed
			return [4, 1];

		} else {
			return [0, 14];
		}
	};

	return Wall;

});