uniform sampler2D spritemap;
#if MAX_POINT_LIGHTS > 0
uniform vec3 pointLightColor[MAX_POINT_LIGHTS];
uniform vec3 pointLightPosition[MAX_POINT_LIGHTS];
uniform float pointLightDistance[MAX_POINT_LIGHTS];
#endif

varying vec2 vUv;
varying vec3 vecPos;
varying vec3 vecNormal;

varying vec2 pos;

void main() {
    vec3 addedLights = vec3(0.0, 0.0, 0.0);
    float dist = 1.0;

    #if MAX_POINT_LIGHTS > 0
    
    for(int l = 0; l < MAX_POINT_LIGHTS; l++) {
        float d = min(1.0, length(ceil(vecPos) - pointLightPosition[l]) / pointLightDistance[l]);
        dist = min(dist, d);
        float light = 1.0-d;
        addedLights += pointLightColor[l]*light;
    }
    addedLights = min(vec3(1.0,1.0,1.0), addedLights);
    float light = 1.0-floor(dist*20.0)/20.0;

    gl_FragColor = texture2D(spritemap, vUv)*(vec4(1.0,1.0,1.0,1.0)*(1.0-light)+vec4(addedLights, 1.0)*light)*(0.2+0.8*light);// * vec4(addedLights, 1.0);
    
    #endif
}