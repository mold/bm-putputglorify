;
(function() {
	var socket = io();
	var MAX_DIMENSION = Math.max($(window).width(), $(window).height());
	var MIN_DIMENSION = Math.min($(window).width(), $(window).height());
	var MAX_DISTANCE = MIN_DIMENSION * 0.8;

	var dpStart = $("#dragger-pointer-starter"),
		dpLine = $("#dragger-liner"),
		dpEnd = $("#dragger-pointer-ender");

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

		// // gotta do this so we don't refresh 
		// $(document.body).on("touchstart", function(event) {
		// 	event.preventDefault();
		// });
	}

	function onPan(evt) {
		// console.log(evt);
		evt.preventDefault();
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

		dpEnd.attr({
			cx: correctX,
			cy: correctY
		})

		dpLine.attr({
			x1: startX,
			y1: startY,
			x2: correctX,
			y2: correctY,
		})

		if (evt.isFinal) {
			// send shot!!! it's done!!!
			dpStart.add(dpEnd).add(dpLine).attr({
				class: ""
			});

			socket.emit("shot-fired", {
				power: Math.min(evt.distance, MAX_DISTANCE) / MAX_DISTANCE,
				angle: evt.angle,
				deltaX: correctX - startX,
				deltaY: correctY - startY,
			})

			startX = startY = null;

		} else {
			dpEnd.add(dpLine).attr({
				class: "show"
			});

			socket.emit("aim-change", {
				power: Math.min(evt.distance, MAX_DISTANCE) / MAX_DISTANCE,
				angle: evt.angle,
				deltaX: correctX - startX,
				deltaY: correctY - startY,
			})
		}
	}

	function onPress(evt) {
		// console.log(evt);
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