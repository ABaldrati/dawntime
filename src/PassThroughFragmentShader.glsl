uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {
    vec4 color = texture(tDiffuse, vUv);
    gl_FragColor = color;
}
