var Box2D = require("box2d.js").Box2D;

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
    this.prevX = this.x;
    this.prevY = this.y;
    this.currentTargetX = this.x;
    this.currentTargetY = this.y;
    this.prevTargetX = this.x;
    this.prevTargetY = this.y;
    this.setCurrentTarget(this.x, this.y);
    this.aim = -1;
    this.aimPower = 0;

    this.willReachGoal = false;
    this.timeLeftTillGoal = -1;

    // errors for the PID
    this.lastErrorX = 0;
    this.lastErrorY = 0;

    //Integrating errors
    this.inteErrorX = 0.0;
    this.inteErrorY = 0.0;

    // limits the robots sling control behavior
    this.slingDelay = 0;
    this.slingMeter = 0;

    this.saved = false;

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

    //Calculates the mass given that the shape is a circle.
    //this.mass = shape.get_m_radius()*shape.get_m_radius()*Math.pi*fixDef.get_density();
    this.mass = 0.5*0.5*3.141592649*7.0;

    this.pathFinder = pathFinder;
    this.path = null;
    this.lastPoppedTime = 0;

    this._stuckTime = 0;
    this._isStuck = false;
    this._targetReached = true;

    /*
    this.KP = p;
    this.KD = d;
    this.KI = i;
    */
}

ShellRobot.prototype.calcDeltaV = function (goalX, goalY, travelTime, dt, vMax, deltavMax) {
  //Calculates a target velocity that makes the shell get to
  //the goal (Assuming there's nothing in the way) after travelTime seconds.
  //console.log("DELTAVMAX:", deltavMax);
  var deltaX = goalX-this.x;
  var deltaY = goalY-this.y;

  var dir = new Array(2);
  var norm = Math.sqrt(deltaY*deltaY + deltaX*deltaX);
  dir[0] = deltaX/norm;
  dir[1] = deltaY/norm;

  //Uses an half-interval search to approximate
  //the necessary delta-V.
  timeIterations = Math.round(travelTime/dt);

  var deltaPos = new Array(2);
  deltaPos[0] = deltaX;
  deltaPos[1] = deltaY;

  var velHigh = new Array(2);
  velHigh[0] = Math.min(deltavMax, vMax/1.42 ); velHigh[1] = Math.min(deltavMax, vMax/1.42 );
  var velLow = new Array(2);
  velLow[0] = Math.max(-deltavMax, -vMax/1.42 ); velLow[1] = Math.max(-deltavMax,-vMax/1.42);
  var velMid = new Array(2);
  var pos = new Array(2);

  var velObj = this.body.GetLinearVelocity();
  var velCurr = velObj.Length();

  var vel = new Array(2);
  var vMag = Math.sqrt(vel[0]*vel[0]+vel[1]*vel[1]);

  var dimensions = 2;
  //for(var iterationNr = 0; iterationNr<20; iterationNr++){
  var mag = Math.min(deltavMax, vMax);
  var bestError = 100000;
  var bestPhi; var bestK;
  for(var xIter=0; xIter<8; xIter++){
    var phi = 2*Math.PI*(xIter/8);
    for(var yIter=0; yIter<6; yIter++){
      var k = mag * (yIter/6);
      pos[0] = 0.0; pos[1] = 0.0;
      //velMid[0] = (velHigh[0]+velLow[0])/2.0;
      //velMid[1] = (velHigh[1]+velLow[1])/2.0;

      velMid[0] = Math.cos(phi)*k;
      velMid[1] = Math.sin(phi)*k;

      vel[0] = velObj.get_x();
      vel[1] = velObj.get_y();
      vel[0] += velMid[0];
      vel[1] += velMid[1];

      for (var tNr = 0; tNr < timeIterations; tNr++) {
        vMag = Math.sqrt(vel[0]*vel[0]+vel[1]*vel[1]);
        //if (vMag > vMax) {
        //  console.log(vMag);
        //  console.log(vMax);
        //  throw new Error("vMag > vMax");
        //}
        vel[0] -= Math.pow(vMax-vMag , 1.5)*vel[0]/this.mass*dt;
        vel[1] -= Math.pow(vMax-vMag , 1.5)*vel[1]/this.mass*dt;
        pos[0] += vel[0]*dt;
        pos[1] += vel[1]*dt;
      }
      /*
      for (var i = 0; i < dimensions; i++) {
        //console.log("pos[i]", pos[i]);
        //Overshoot
        if(pos[i] > deltaPos[i]){
          velHigh[i] = velMid[i];
        }
        //Undershoot
        else if (pos[i] < deltaPos[i]) {
          velLow[i] = velMid[i];
        }
        //MUDDAFUCKING BULLSEYE!
        else{
          velLow[i] = velMid[i];
          velHigh[i] = velMid[i];
        }
        */
        if (isNaN(pos[0])==false && isNaN(pos[1])==false) {
          var error = Math.pow(pos[0]-deltaPos[0],2)+ Math.pow(pos[1]-deltaPos[1],2);
          if (error<bestError) {
            bestError = error;
            bestPhi = phi;
            bestK = k;
          }
        }
      }
    }

  velMid[0] = Math.cos(bestPhi)*bestK;
  velMid[1] = Math.sin(bestPhi)*bestK;
  //console.log("VELMID:", velMid);
  return velMid;

  if ( Math.abs(pos[0]-deltaPos[0])+Math.abs(pos[0]-deltaPos[0])>0.2 || Math.sqrt(velMid[0]*velMid[0]+velMid[1]*velMid[1]) > vMax ) {
    vMag = Math.sqrt(velMid[0]*velMid[0]+velMid[1]*velMid[1]);
    velMid[0] = velMid[0]/vMag*vMax;
    velMid[1] = velMid[1]/vMag*vMax;
    this.willReachGoal = false;
    //Fix so that the aim is accurate. It might be weird if the shell can't reach.
    vel[0] = velObj.get_x();
    vel[1] = velObj.get_y();
    var dirAfterDeltaV = new Array(2);
    dirAfterDeltaV[0] = vel[0]+velMid[0];
    dirAfterDeltaV[1] = vel[1]+velMid[1];

    var dirRadians = Math.atan(dir[1]/dir[0]);
    var dirRadiansAfterDeltaV = Math.atan(dirAfterDeltaV[1]/dirAfterDeltaV[0]);
    var dirRadiansDiff = (dirRadians-dirRadiansAfterDeltaV);

    //console.log("dir:",dir);
    if (Math.abs(dirRadiansDiff) >= 0.0) {
      //console.log("CORRECTING POSITIONS...........................................");
      //console.log(velMid);
      //console.log("pos", pos);
      //console.log(vMax);
      velMid[0] = dir[0]*vMax;
      velMid[1] = dir[1]*vMax;
    }
  }
  else{
    this.willReachGoal = true;
  }
  //console.log("AWAY WE GO, MOFO!!");
  //console.log(velMid);
  return velMid;
};

ShellRobot.prototype.stopMotion = function (dt) {
  //Does its best to stop the motion of the shell.

  var deltavMax = ShellRobot.SLING_FORCE*dt/this.mass;
  var deltaV = this.calcDeltaV(this.x, this.y, 1, dt, 5, deltavMax);
  var fx = (deltaV[0]/dt*this.mass) / ShellRobot.CONTROL_MAX;
  var fy = (deltaV[1]/dt*this.mass) / ShellRobot.CONTROL_MAX;

  if (Math.sqrt(fx*fx+fy*fy)>ShellRobot.SLING_FORCE) {
    var norm = Math.sqrt(fx*fx+fy*fy);
    fx = fx / norm * ShellRobot.SLING_FORCE;
    fy = fy / norm * ShellRobot.SLING_FORCE;
  }
  this.body.ApplyForce(new Box2D.b2Vec2(fx, fy), this.body.GetWorldCenter());
};

/**
 * Updates the aiming and aiming power for the robot.
 * The robot uses two PID controllers, one for each axis.
 * To change the behavior of the PID controllers look at the bottom of this file.
 * @param {number} dt Time (in seconds) since last frame.
 */
ShellRobot.prototype.update = function(dt) {

    /*if (this.saved != false) {
      console.log("-------!");
      console.log(this.oldVel);
      var tmp = this.body.GetLinearVelocity();
      console.log(tmp.get_x(),tmp.get_y());
      console.log(this.saved);

      console.log("...........!");
      this.saved = false;
    }*/

    var tmp = this.body.GetPosition();

    // error is distance to target point
    var errorX = Math.abs(this.x - this.currentTargetX);
    var errorY = Math.abs(this.y - this.currentTargetY);
    var d = Math.sqrt(Math.pow(errorX, 2) + Math.pow(errorY, 2));
    this.slingDelay += dt;
    //console.log("error: ", d);

    //If we won't reach the current goal any time soon...
    if (this.willReachGoal == false && this.slingDelay > ShellRobot.SLING_DELAY) {
      var travelTime = Math.pow(Math.abs(this.currentTargetX-this.x)+ Math.abs(this.currentTargetY-this.y),2) + 2.5; //This is ad hoc and should be fixed.
      var deltavMax = ShellRobot.SLING_FORCE*dt/this.mass;
      var deltaV = this.calcDeltaV( this.currentTargetX, this.currentTargetY, 3, dt, 5, deltavMax);
      // sling that jingle robot!
      var dx = (this.currentTargetX - this.x) / d;
      var dy = (this.currentTargetY - this.y) / d;
      var fx = deltaV[0]/dt*this.mass;// / ShellRobot.CONTROL_MAX;
      var fy = deltaV[1]/dt*this.mass;// / ShellRobot.CONTROL_MAX;

      if (Math.sqrt(fx*fx+fy*fy) > ShellRobot.SLING_FORCE) {
        var norm = Math.sqrt(fx*fx+fy*fy);
        fx = fx / norm * ShellRobot.SLING_FORCE;
        fy = fy / norm * ShellRobot.SLING_FORCE;
      }
      //console.log("force:", fx,fy);
      this.body.ApplyForce(new Box2D.b2Vec2(fx, fy), this.body.GetWorldCenter());
      this.slingDelay = 0;
      this.slingMeter = 0;
      this.aim = -1;

      this.saved = deltaV;
      var tmp = this.body.GetLinearVelocity();
      this.oldVel = new Array(2);
      this.oldVel[0] = tmp.get_x();
      this.oldVel[1] = tmp.get_y();
    }
    else{
      if (errorX < 0.2 && errorY < 0.2 && this.slingDelay > ShellRobot.SLING_DELAY) {
        this.stopMotion(dt);
        this.slingDelay = 0;
        this.slingMeter = 0;
        this.aim = -1;
        this.willReachGoal = false;
      }
    }

    if (Math.floor(this.x) == Math.floor(this.prevX) && Math.floor(this.y) == Math.floor(this.prevY)) {
        this._stuckTime += dt;
        if (this._stuckTime > ShellRobot.STUCK_TIME) {
            this._isStuck = true;
        }
    } else {
        this._stuckTime = 0;
        this._isStuck = false;
    }

    /*
    // calculate the PID control values
    var P, I, D;
    P = this.KP * errorX;
    //Second order integration (watch out for overflow)
    I = ( ((errorX+this.lastErrorX) / 2.0) * dt);
    this.inteErrorX += I;
    //First order derivative
    D = this.KD * (errorX - this.lastErrorX) / dt;
    var controlX = P + this.KI*this.inteErrorX + D;
    P = this.KP * errorY;
    I = ( ((errorY+this.lastErrorY) / 2.0) * dt);
    this.inteErrorY += I;
    D = this.KD * (errorY - this.lastErrorY) / dt;
    var controlY = P + this.KI*this.inteErrorY + D;

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

        if (Math.floor(this.x) == Math.floor(this.prevX) && Math.floor(this.y) == Math.floor(this.prevY)) {
            this._stuckTime += dt;
            if (this._stuckTime > ShellRobot.STUCK_TIME) {
                this._isStuck = true;
            }
        } else {
            this._stuckTime = 0;
            this._isStuck = false;
        }
    } else {
        this.aim = -1;

    }
*/
    // Do this when we are close enough to currentTarget
    if (d < 0.5) {
        this.aim = -1;
        if (this.path) {
            if (this.path.length > 0) {
                var next = this.path.shift();
                this.setCurrentTarget(next.x, next.y);
            } else {
                this.path = null;
                this._targetReached = true;
            }
        } else {
            this._targetReached = true;
        }
    }
    this.lastErrorX = errorX;
    this.lastErrorY = errorY;
    this.prevX = this.x;
    this.prevY = this.y;
};

/**
 * Sets the current target position.
 * @param {number} x X coordinate.
 * @param {number} y Y coordinate.
 */
ShellRobot.prototype.setCurrentTarget = function(x, y) {
    this.prevTargetX = this.currentTargetX;
    this.prevTargetY = this.currentTargetY;
    this.currentTargetX = x;
    this.currentTargetY = y;
    this._targetReached = false;

    //Reset these to avoid overflow
    this.inteErrorX = 0.0;
    this.inteErrorY = 0.0;
};

/**
 * Sets a global target position.
 * @param {number} x X coordinate.
 * @param {number} y Y coordinate.
 */
ShellRobot.prototype.setGlobalTarget = function(x, y) {
    var currentPos = this.getPos();

    //console.log('Global');
    //console.log(x,y);
    this.path = this.pathFinder.findKeypointsPath({
        x: Math.round(currentPos.x),
        y: Math.round(currentPos.y)
    }, {
        x: Math.round(x),
        y: Math.round(y)
    });

    if (!this.path || this.path.length == 0) {
        this.path = null;
    } else {
        var next = this.path.shift();
        //console.log('popping path: ', next);
        this.setCurrentTarget(Math.round(currentPos.x), Math.round(currentPos.y));
        this.setCurrentTarget(next.x, next.y);
    }
    this._targetReached = false;
};

ShellRobot.prototype.targetReached = function() {
    return this._targetReached;
};

ShellRobot.prototype.isStuck = function() {
    return this._isStuck;
};

ShellRobot.prototype.getDiscreteBodyPosition = function() {
    var currentPos = this.body.GetPosition();
    var x = Math.floor(currentPos.get_x());
    var y = Math.floor(currentPos.get_y());
    return {
        x: x,
        y: y
    };
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
// CONSTANTS    //
//////////////////

ShellRobot.ID = 0;
// PID parameters (error is distance)
//ShellRobot.KP = 0.005;//0.8; // amount of direct error
//ShellRobot.KI = 0.003;//1; // amount of error per delta time
//ShellRobot.KD = 0.0001;//0.5; // amount of error change per delta time
// control parameters
ShellRobot.CONTROL_MIN = 0.2; // floor where the PID output is not used
ShellRobot.CONTROL_MAX = 4; // roof where the PID output is cut
ShellRobot.SLING_FORCE = 5000; // force in banana units...
ShellRobot.SLING_DELAY = 0.3; // delay in seconds between slings
// pathFinder parameters
ShellRobot.STUCK_TIME = 5;

/**
 * Controls how fast the sling meter is refilled based on the aiming power.
 * @param  {number} power Aiming power (0-1).
 * @return {number}       Sling meter recovery speed in seconds.
 */
ShellRobot.getSlingMeterRecovery = function(power) {
    return 1 + 20 * Math.sqrt(power, 2);
};

module.exports = ShellRobot;
