uniform sampler2D tDiffuse;
uniform vec2 lightPosition;
uniform float decay;
uniform float exposure;
uniform int samples;
uniform float weight;
uniform float density;

varying vec2 vUv;

void main() {
    vec2 ray = vUv - lightPosition;
    vec2 delta = ray * (1. / float(samples)) * density;
    vec4 color = texture(tDiffuse, vUv);
    vec2 currentPos = vUv;
    float illuminationDecay = 1.;

    for (int i = 1; i < samples; ++i){
        currentPos -= delta;
        vec4 currentColor = texture(tDiffuse, currentPos);
        illuminationDecay *= decay;
        currentColor *= illuminationDecay * weight;
        color += currentColor;
    }

    gl_FragColor = color * exposure;
}
