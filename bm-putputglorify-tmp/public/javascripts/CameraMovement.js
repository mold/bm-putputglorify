define(["THREE",
        "RandomEngine"],
function(THREE,
RandomEngine) {

    var CAM_MIN = 5;
    var CAM_MAX = 12;

    var CameraMovement = function(camera) {
        this.camera = camera;
        this.rnd = RandomEngine;
        this.lerpCount = 0;
    };

    CameraMovement.prototype.generateRandomPositionTarget = function () {
        var x, y, z, phi, theta, r;

        r = Math.floor(this.rnd.random() * (CAM_MAX - CAM_MIN)) + CAM_MIN;
        theta = this.rnd.random() * Math.PI/2 + Math.PI * 1.25;
        phi = this.rnd.random() * Math.PI/2 + Math.PI/4;

        // console.log("(r: %f, θ: %f, φ: %f)", r, theta, phi);

        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);


        this.posTarget = new THREE.Vector3(x, y, z);
        this.posTarget.applyEuler(new THREE.Euler( -Math.PI/2, 0, 0, 'XYZ'));

    };

    // Camera panning movement
    CameraMovement.prototype.cameraPan = function (posTarget) {
        this.posTarget = posTarget;
    };

    CameraMovement.prototype.move = function() {

        if (this.lerpCount > 100) {
            this.generateRandomPositionTarget();
            this.lerpCount = 0;
        }

        this.camera.position.lerp(this.posTarget, 0.01);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.lerpCount++;
    };

    return CameraMovement;
});
