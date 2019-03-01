define(["THREE"], function (THREE) {

	var AssetManager = {};

	var loadCallbacks = [];
	var hasLoaded = false;

	AssetManager.images = {};
	AssetManager.shaders = {};
	AssetManager.onLoad = onLoad;
	AssetManager.loaded = loaded;

	init();

	return AssetManager;

	////////////////////

	function onLoad(callback) {
		if (hasLoaded) {
			callback();
		} else {
			loadCallbacks.push(callback);
		}
	}

	function loaded() {
		return hasLoaded;
	}

	function init() {
		var loadManager = new THREE.LoadingManager();
		loadManager.onLoad = function () {
			hasLoaded = true;
			for (var i = 0; i < loadCallbacks.length; i++) {
				loadCallbacks[i]();
			}
		};

		var imgLoader = new THREE.ImageLoader(loadManager);

		function imageCallback(name) {
			return function (img) {
				AssetManager.images[name] = img;
			};
		}

		imgLoader.load("sprites/sprite_map.png", imageCallback("sprite_map"));

		var shaderLoader = new THREE.FileLoader(loadManager);

		function shaderCallback(name) {
			return function (data) {
				AssetManager.shaders[name] = data;
			};
		}

		shaderLoader.load("shaders/dungeon_vertex_shader.glsl", shaderCallback("dungeon_vertex_shader"));
		shaderLoader.load("shaders/dungeon_fragment_shader.glsl", shaderCallback("dungeon_fragment_shader"));
		shaderLoader.load("shaders/colored_vertex_shader.glsl", shaderCallback("colored_vertex_shader"));
		shaderLoader.load("shaders/colored_fragment_shader.glsl", shaderCallback("colored_fragment_shader"));
	}

});