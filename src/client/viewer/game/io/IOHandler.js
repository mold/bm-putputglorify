define(
	["THREE", "SocketIO"],
	function (THREE, io) {
		var IOHandler = function () {
			socket = io();

			this.dir = 0;
			this.refTiltLR = 0;
			this.refTiltFB = 0;
			this.refDir = 0;
			this.tiltFB = 0;
			this.tiltLR = 0;

			socket.on('update movement', (function (msg) {
				this.tiltFB = msg.tiltFB;
				this.tiltLR = msg.tiltLR;
				this.dir = msg.dir;
				//console.log(tiltFB + ", " + tiltLR + ", " + dir);
			}).bind(this));

			this.map = null;
			socket.on('map-update', (function (map) {
				console.info('%c[socket-io] map-update', 'font-family: Comic Sans MS; font-size: 14pt; color: blue;');
				this.map = map;
			}).bind(this));
		};

		IOHandler.prototype.getMap = function () {
			return this.map;
		};

		IOHandler.prototype.getRotationAndPosition = function () {
			var rotation = new THREE.Vector3(0, 0, 0);
			var position = new THREE.Vector3(0, 0, 0);

			rotation.x = degToRad(this.tiltFB - this.refTiltFB);
			rotation.y = degToRad(this.dir - this.refDir);
			rotation.z = degToRad(this.refTiltLR - this.tiltLR);

			position.x = 0.02 * (this.refTiltLR - this.tiltLR);
			position.y = 0.02 * (this.refTiltFB - this.tiltFB);

			var q = new THREE.Quaternion();
			q.setFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));
			return [q, position];
		};

		var degToRad = function (deg) {
			return deg * (Math.PI / 180.0);
		}

		return IOHandler;
	});