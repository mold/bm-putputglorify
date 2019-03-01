define(["THREE"],
function (THREE) {
	var geometry = new THREE.BoxGeometry(100,100,100);
	var material = new THREE.MeshBasicMaterial( {color: 0XF20F25} );
	material.side = THREE.DoubleSide;
	var cube = new THREE.Mesh( geometry, material );

	//TODO: add texture on inside of cube
	
	return cube;
});