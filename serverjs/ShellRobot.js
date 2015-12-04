var Box2D = require('box2d.js').Box2D;

/**
 * A shell robot (shellbot)!
 * The shellbot can move towards a set target point.
 *
 * @param {Box2D.World} world       A Box2D world.
 * @param {number} x                X start coordinate.
 * @param {number} y                Y start coordinate.
 * @param {PathFinder} pathFinder   A PathFinder.
 */
function ShellRobot(world, x, y, pathFinder) {
    // create some kind of unique-ish id
    var unique = (ShellRobot.ID++) + Date.now();
    this.id = Math.floor(unique * (1 + Math.cos(unique))).toString(32);

    this.x = isNaN(x) ? 0 : x;
    this.y = isNaN(y) ? 0 : y;
    this.setCurrentTarget(this.x, this.y);
    this.aim = -1;
    this.aimPower = 0;

    // errors for the PID
    this.lastErrorX = 0;
    this.lastErrorY = 0;

    // limits the robots sling control behavior
    this.slingDelay = 0;
    this.slingMeter = 0;

    // create a circular dynamic body in the middle
    var shape = new Box2D.b2CircleShape();
    shape.set_m_radius(0.5);
    var bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_type(Box2D.b2_dynamicBody);
    bodyDef.set_position(new Box2D.b2Vec2(this.x, this.y));
    var fixDef = new Box2D.b2FixtureDef();
    fixDef.set_density(7.0);
    fixDef.set_friction(1.0);
    fixDef.set_restitution(0.5); // bounciness - higher is bouncier
    fixDef.set_shape(shape);
    var body = world.CreateBody(bodyDef);
    body.CreateFixture(fixDef);
    this.body = body;

    this.pathFinder = pathFinder;
    this.path = [];
    this.lastPoppedTime = 0;

}

/**
 * Updates the aiming and aiming power for the robot.
 * The robot uses two PID controllers, one for each axis.
 * To change the behavior of the PID controllers look at the bottom of this file.
 * @param {number} dt Time (in seconds) since last frame.
 */
ShellRobot.prototype.update = function(dt) {
    // error is distance to target point
    var errorX = Math.abs(this.x - this.currentTargetX);
    var errorY = Math.abs(this.y - this.currentTargetY);
    var d = Math.sqrt(Math.pow(errorX, 2) + Math.pow(errorY, 2));

    // calculate the PID control values
    var P, I, D;
    P = ShellRobot.KP * errorX;
    I = ShellRobot.KI * (errorX * dt);
    D = ShellRobot.KD * (errorX - this.lastErrorX) / dt;
    var controlX = P + I + D;
    P = ShellRobot.KP * errorY;
    I = ShellRobot.KI * (errorY * dt);
    D = ShellRobot.KD * (errorY - this.lastErrorY) / dt;
    var controlY = P + I + D;


    // correct position
    if (Math.max(controlX, controlY) > ShellRobot.CONTROL_MIN) {

        if (this.slingDelay < ShellRobot.SLING_DELAY) {
            // add a small delay between slings
            this.slingDelay += dt;
        } else {
            var dx = (this.currentTargetX - this.x) / d;
            var dy = (this.currentTargetY - this.y) / d;
            if (Math.max(controlX, controlY) > this.slingMeter && this.slingMeter < ShellRobot.CONTROL_MAX) {
                // draw the sling
                var aimPower = this.slingMeter / ShellRobot.CONTROL_MAX;
                this.slingMeter += dt * ShellRobot.getSlingMeterRecovery(aimPower);
                // update the aiming
                this.aim = 1.5 * Math.PI - Math.atan2(dx, dy);
                this.aimPower = aimPower;
            } else {
                // sling that jingle robot!
                var fx = ShellRobot.SLING_FORCE * dx * Math.min(1, controlX) / ShellRobot.CONTROL_MAX;
                var fy = ShellRobot.SLING_FORCE * dy * Math.min(1, controlY) / ShellRobot.CONTROL_MAX;
                this.body.ApplyForce(new Box2D.b2Vec2(fx, fy), this.body.GetWorldCenter());
                this.slingDelay = 0;
                this.slingMeter = 0;
                this.aim = -1;
            }
        }
    } else {
        this.aim = -1;

        // Do this when we are close enough to currentTarget
        if (!this.path) {this.path = []};
        if (this.path.length > 0 && this.lastPoppedTime > ShellRobot.POP_DELAY) {
            this.lastPoppedTime = 0;
            var next = this.path.pop();
            //console.log('popping path: ', next);
            var currentPos = this.body.GetPosition();
            this.setCurrentTarget(Math.floor(currentPos.get_x()) - next.x, Math.floor(currentPos.get_y()) - next.y);
        }

    }
    this.lastPoppedTime += dt;
    this.lastErrorX = errorX;
    this.lastErrorY = errorY;
};

/**
 * Sets the current target position.
 * @param {number} x X coordinate.
 * @param {number} y Y coordinate.
 */
ShellRobot.prototype.setCurrentTarget = function(x, y) {
    //console.log('setting current target', x, y);
    this.currentTargetX = x;
    this.currentTargetY = y;
};

/**
 * Sets a global target position.
 * @param {number} x X coordinate.
 * @param {number} y Y coordinate.
  */
ShellRobot.prototype.setGlobalTarget = function(x, y) {
    var currentPos = this.getDiscreteBodyPosition();
    //console.info('Setting global target! ');
    //console.info('from:', { x:Math.floor(currentPos.x),
    //                            y:Math.floor(currentPos.y)});
    //console.info('to:', {x:Math.floor(x), y:Math.floor(y)});

    this.path = this.pathFinder.findPath(
        { x:Math.floor(currentPos.x),
          y:Math.floor(currentPos.y)},
        { x:Math.floor(x),
          y:Math.floor(y)});
    //console.info(this.path);



    this.setCurrentTarget(currentPos.x, currentPos.y);
};

ShellRobot.prototype.getDiscreteBodyPosition = function() {
    var currentPos = this.body.GetPosition();
    var x = Math.floor(currentPos.get_x());
    var y = Math.floor(currentPos.get_y());
    return {x:x, y:y};
};

/**
 * Box2D body position.
 * @return {object} Position on the form {x: x, y: y}.
 */
ShellRobot.prototype.getPos = function() {
    var pos = this.body.GetPosition();
    return {
        x: pos.get_x(),
        y: pos.get_y()
    };
};

//////////////////
// CONSTANTS
//////////////////

ShellRobot.ID = 0;
// PID parameters (error is distance)
ShellRobot.KP = 0.8; // amount of direct error
ShellRobot.KI = 1; // amount of error per delta time
ShellRobot.KD = 0.5; // amount of error change per delta time
// control parameters
ShellRobot.CONTROL_MIN = 0.2; // floor where the PID output is not used
ShellRobot.CONTROL_MAX = 4; // roof where the PID output is cut
ShellRobot.SLING_FORCE = 5000; // force in banana units...
ShellRobot.SLING_DELAY = 0.3; // delay in seconds between slings
// pathFinder parameters
ShellRobot.POP_DELAY = 0.001 * 300; // delay in seconds

/**
 * Controls how fast the sling meter is refilled based on the aiming power.
 * @param  {number} power Aiming power (0-1).
 * @return {number}       Sling meter recovery speed in seconds.
 */
ShellRobot.getSlingMeterRecovery = function(power) {
    return 1 + 20 * Math.sqrt(power, 2);
};

module.exports = ShellRobot;
