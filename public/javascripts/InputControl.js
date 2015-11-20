define(["Airplane"],
function(Airplane) {

  var InputControl = function () {

      var socket = io();
      var tiltLR = 0;
      var tiltFB = 0;
      var dir = 0;
      var refTiltLR = 0;
      var refTiltFB = 0;
      var refDir = 0;

      socket.on('update movement', function(msg){
        tiltFB = msg.tiltFB;
        tiltLR = msg.tiltLR;
        dir = msg.dir;
        //console.log(tiltFB + ", " + tiltLR + ", " + dir);
      });      

      $(document).keypress(function(e) {
          if(e.which == 13) {
              refTiltFB = tiltFB;
              refTiltLR = tiltLR;
              refDir = dir;
              console.log(tiltFB);
          }
      });


      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

      var renderer = new THREE.WebGLRenderer();
      renderer.setSize( window.innerWidth, window.innerHeight );
      document.body.appendChild( renderer.domElement );

      var geometry = new THREE.BoxGeometry( 1, 0.2, 2 );
      var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
      var cube = new THREE.Mesh( geometry, material );
      scene.add( cube );

      camera.position.z = 5;
      camera.position.y = 0.5;

      var render = function () {
        requestAnimationFrame( render );

        cube.rotation.x =  degToRad(tiltFB - refTiltFB);
        cube.rotation.y = degToRad(dir - refDir);
        cube.rotation.z = degToRad(refTiltLR - tiltLR);

        cube.position.x = 0.02*(refTiltLR - tiltLR);
        cube.position.y = 0.02*(refTiltFB - tiltFB);
        
        
        renderer.render(scene, camera);
      };

      var degToRad = function (deg) {
        return deg*(Math.PI/180);
      }

      render();
    }
  return InputControl;
});
