uniform sampler2D spritemap;
uniform vec3 color;
uniform vec4 offsetRepeat;

varying vec2 vUv;

void main() {
    vec4 tex = texture2D(spritemap, offsetRepeat.xy+offsetRepeat.zw*vUv);
    gl_FragColor = vec4(color*tex.xyz, tex.w);
}