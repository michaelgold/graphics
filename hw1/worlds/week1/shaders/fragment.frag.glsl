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

  float red   = noise((4. * vPos - uTime/4.) + sin(vec3(2.,4.,0.)));
  float green = noise((2.3 * vPos - uTime/3.) + sin(vec3(2.,1.,.2)));
  float blue  = noise((1.5 * vPos - uTime/3.) + sin(vec3(2.,3.,.2)));
  
  // R,G,B EACH RANGE FROM 0.0 TO 1.0  
  vec3 color = vec3(red, green, blue) ;
  

  // THIS LINE OUTPUTS THE FRAGMENT COLOR
  fragColor = vec4(sqrt(color), 1.0);
}