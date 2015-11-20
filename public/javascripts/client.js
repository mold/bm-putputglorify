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
			time: 0
		})
	}

	function onPan(evt) {
		// console.log(evt);
		var correctX = evt.center.x,
			correctY = evt.center.y;

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
			dpStart.add(dpEnd).add(dpLine).attr({
				class: ""
			});
		} else {
			dpEnd.add(dpLine).attr({
				class: "show"
			});
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

})();