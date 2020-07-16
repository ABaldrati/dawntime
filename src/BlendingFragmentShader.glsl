#version 300 es

uniform sampler2D tDiffuse;
uniform sampler2D tOcclusion;

in vec2 vUv;

out vec4 fragColor;

void main() {
    vec4 originalColor = texture(tDiffuse, vUv);
    vec4 blendingColor = texture(tOcclusion, vUv);
    fragColor = originalColor + blendingColor;
}
