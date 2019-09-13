#version 300 es
precision highp float;

uniform float uTime;   // TIME, IN SECONDS
in vec3 vPos;     // -1 < vPos.x < +1
// -1 < vPos.y < +1
//      vPos.z == 0

out vec4 fragColor; 
 
void main() {

  // HERE YOU CAN WRITE ANY CODE TO
  // DEFINE A COLOR FOR THIS FRAGMENT

  float lava = noise((1.5 * vPos - uTime/3.) + sin(vec3(2.,3.,.2)));
  
  float red = lava;
  float green = lava;
  float blue = lava;

  vec3 colorIntensity = vec3(0.5, 0., 1.); 

  // R,G,B EACH RANGE FROM 0.0 TO 1.0  
  vec3 color = vec3(red , green, blue) * colorIntensity;
  
 

  // THIS LINE OUTPUTS THE FRAGMENT COLOR
  fragColor = vec4(sqrt(color), 1.0);
}