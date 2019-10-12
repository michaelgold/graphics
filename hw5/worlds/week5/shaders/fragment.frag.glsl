#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform vec3  uColor;
uniform vec3  uCursor; // CURSOR: xy=pos, z=mouse up/down
uniform float uTime;   // TIME, IN SECONDS

in vec2 vXY;           // POSITION ON IMAGE
in vec3 vPos;          // POSITION
in vec3 vNor;          // NORMAL

out vec4 fragColor;    // RESULT WILL GO HERE

void main() {
    vec3 lDir  = vec3(.57,.57,.57);
    vec3 shade = vec3(.1,.1,.1) + vec3(1.,1.,1.) * max(0., dot(lDir, normalize(vNor)));
    vec3 color = shade;

    // HIGHLIGHT CURSOR POSITION WHILE MOUSE IS PRESSED

    if (uCursor.z > 0. && min(abs(uCursor.x - vXY.x), abs(uCursor.y - vXY.y)) < .01)
          color = vec3(1.,1.,1.);

    fragColor = vec4(sqrt(color * uColor), 1.0);
}


