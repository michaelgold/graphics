#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform vec3  uCursor; // CURSOR: xy=pos, z=mouse up/down
uniform float uTime;   // TIME, IN SECONDS
in vec3 vPos;          // POSITION IN IMAGE
out vec4 fragColor;    // RESULT WILL GO HERE

void main() {
    vec3 color = .5 * cos(10. * vPos);

    // HIGHLIGHT CURSOR POSITION WHILE MOUSE IS PRESSED

    if (uCursor.z > 0. && min(abs(uCursor.x - vPos.x), abs(uCursor.y - vPos.y)) < .01)
          color *= 2.;

    fragColor = vec4(sqrt(color), 1.0);
}


