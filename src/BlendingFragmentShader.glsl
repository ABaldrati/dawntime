uniform sampler2D tDiffuse;
uniform sampler2D tOcclusion;

varying vec2 vUv;

void main() {
    vec4 originalColor = texture(tDiffuse, vUv);
    vec4 blendingColor = texture(tOcclusion, vUv);
    gl_FragColor = originalColor + blendingColor;
}
