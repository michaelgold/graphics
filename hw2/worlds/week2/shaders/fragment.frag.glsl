#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform float uTime;   // TIME, IN SECONDS

in vec3 vPos;     // -1 < vPos.x < +1
// -1 < vPos.y < +1
//      vPos.z == 0

out vec4 fragColor; 
const int NS = 2; // Number of spheres in the scene
const int NL = 2; // Number of light sources in the scene

// Declarations of arrays for spheres, lights and phong shading:

vec3 Ldir[NL], Lcol[NL], Ambient[NS], Diffuse[NS], V, W, vPrime, P;
vec4 Sphere[NS], Specular[NS];
float t;
float fl = 1.0;


float raySphere(vec3 V, vec3 W, vec4 S) {

    vPrime = V - S.xyz;
    return -(dot(W,vPrime)) - sqrt(pow(dot(W,vPrime), 2.0) - dot(vPrime,vPrime) + pow(S.w, 2.0) );

}

void main() {
    Ldir[0] = normalize(vec3(1.,1.,.5));
    Lcol[0] = vec3(1.,1.,1.);

    Ldir[1] = normalize(vec3(-1.,0.,-2.));
    Lcol[1] = vec3(.1,.07,.05);

    Sphere[0]   = vec4(.2,0.,0.,.3);
    Ambient[0]  = vec3(0.,.1,.1);
    Diffuse[0]  = vec3(0.,.5,.5);
    Specular[0] = vec4(0.,1.,1.,10.); // 4th value is specular power

    Sphere[1]   = vec4(-.6,.4,-.1,.1);
    Ambient[1]  = vec3(.1,.1,0.);
    Diffuse[1]  = vec3(.5,.5,0.);
    Specular[1] = vec4(1.,1.,1.,20.); // 4th value is specular power


    for (int i = 0; i < Sphere.length(); i++) {
        
        
        W = normalize(vec3(vPos.x, vPos.y, -fl));
        t = raySphere(vPos, W, Sphere[i]);
        P = V + t * W;


        fragColor = vec4(sqrt(P), 1.0);

    }
    

}


