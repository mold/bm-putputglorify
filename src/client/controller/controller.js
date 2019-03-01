;
(function() {
	var socket = io('/controller');
	var MAX_DIMENSION = Math.max($(window).width(), $(window).height());
	var MIN_DIMENSION = Math.min($(window).width(), $(window).height());
	var MAX_DISTANCE = MIN_DIMENSION * 0.6;

	var dpStart = $("#dragger-pointer-starter"),
		dpLine = $("#dragger-liner"),
		dpPointerLine = $("#dragger-liner-pointer"),
		dpEnd = $("#dragger-pointer-ender"),
		dpPointerLineBall = $("#dragger-liner-pointer-ball");

	var startX, startY;

	init();

	function init() {
		var hammer = new Hammer(document.body);

		// Dragging the pointer
		hammer.on("pan", onPan);
		hammer.get("pan").set({
			direction: Hammer.DIRECTION_ALL,
		})

		// pressing down
		hammer.on("press", onPress);
		hammer.get("press").set({
			time: 0,
		})

		socket.on("connected", function(data) {
			$("body").css("background", "#" + data.color.toString(16));
		})

		// // gotta do this so we don't refresh 
		// $(document.body).on("touchstart", function(event) {
		// 	event.preventDefault();
		// });
	}

	function onPan(evt) {
		// console.log(evt);
		evt.preventDefault(); // // gotta do this so we don't refresh 
		var correctX = evt.center.x,
			correctY = evt.center.y;

		if (typeof startX !== "number") {
			// "PRESS" event didnt get fired (thanks fucking phones)
			onPress(evt);
			return;
		}

		if (evt.distance > MAX_DISTANCE) {
			// Snap to max distance
			var angle = evt.angle * Math.PI / 180;
			correctX = startX + MAX_DISTANCE * Math.cos(angle);
			correctY = startY + MAX_DISTANCE * Math.sin(angle);
		}

		var power = Math.min(evt.distance, MAX_DISTANCE) / MAX_DISTANCE;

		dpEnd.attr({
			cx: correctX,
			cy: correctY,
			x: correctX,
			y: correctY,
			rx: 20 + 80 * power,
			ry: 20 + 80 * power,
		})

		dpLine.attr({
			x1: startX,
			y1: startY,
			x2: correctX,
			y2: correctY,
		})

		dpPointerLine.attr({
			x1: startX,
			y1: startY,
			x2: startX + (startX - correctX),
			y2: startY + (startY - correctY),
		})

		dpPointerLineBall.attr({
			cx: startX + (startX - correctX),
			cy: startY + (startY - correctY),
			rx: 10,
			ry: 10,
		})

		var angle = (evt.angle < 0 ? 360 + evt.angle : evt.angle) * Math.PI / 180;

		if (evt.isFinal) {
			// send shot!!! it's done!!!
			dpStart.add(dpEnd).add(dpLine).add(dpPointerLine).add(dpPointerLineBall)
				.attr({
					class: ""
				});

			socket.emit("shot-fired", {
				power: power,
				angle: angle,
				deltaX: -(correctX - startX),
				deltaY: -(correctY - startY),
			})

			startX = startY = null;

		} else {
			dpEnd.add(dpLine).add(dpPointerLine).add(dpPointerLineBall)
				.attr({
					class: "show"
				});

			socket.emit("aim-change", {
				power: power,
				angle: angle,
				deltaX: correctX - startX,
				deltaY: correctY - startY,
			})
		}
	}

	function onPress(evt) {
		console.log(evt);
		startX = evt.center.x;
		startY = evt.center.y;
		dpStart.attr({
			class: "show",
			cx: startX,
			cy: startY
		})
	}

	function debug(msg) {
		$("#debug").html(JSON.stringify(msg));
		console.log(msg);
	}

})();