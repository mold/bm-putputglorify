varying vec2 vUv;
varying vec3 vecPos;
varying vec3 vecNormal;

varying vec2 pos;

void main() {
    vUv = uv;
    pos = position.xy;

    vecPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vecNormal = (modelViewMatrix * vec4(normal, 0.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}