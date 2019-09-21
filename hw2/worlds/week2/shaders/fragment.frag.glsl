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

vec3 Ldir[NL], Lcol[NL], Ambient[NS], Diffuse[NS], V, W, VV, P, N, color;
vec4 Sphere[NS], Specular[NS];
float t;
float fl = 7.;
 

float calculateMinT (float tCandidate[2]) {
    float tMinInit = 1000.;
    float tMin = tMinInit;
    
    for (int i = 0; i < tCandidate.length(); i++) {
        if (tCandidate[i] < tMin && tCandidate[i] >= -1.) {
            tMin = tCandidate[i];
        }
    }
    
    if (tMin < tMinInit) {
        return tMin;
    } else {
        return -1.;
    }
}

float raySphere(vec3 V, vec3 W, vec4 S) {
    VV = V - S.xyz;
    
    float sqrtResult = sqrt(pow(dot(W,VV), 2.0) - dot(VV,VV) + pow(S.w, 2.0));
    
    float tCandidate[2];
    tCandidate[0] = -(dot(W,VV)) - sqrtResult;
    tCandidate[1] = -(dot(W,VV)) + sqrtResult;
    
    return calculateMinT(tCandidate);
}

bool isInShadow(vec3 P, vec3 L) {
    for (int i = 0; i < NS; i++) {
        if (raySphere(P, L, Sphere[i]) > 0.001) {
            return true;
        }
    }
    return false; 
}

void main() {
    float animate = sin(uTime)/4.;
    Ldir[0] = normalize(vec3(1.,1.,.8));
    Lcol[0] = vec3(1.,1.,1.);

    Ldir[1] = normalize(vec3(-10.,0.,-10.));
    Lcol[1] = vec3(.1,.07,.05);

    Sphere[0]   = vec4(.5, .7 - animate, .6, .5);
    Ambient[0]  = vec3(0.,.1,.1);
    Diffuse[0]  = vec3(0.,.5,.5);
    Specular[0] = vec4(0.,1.,1.,10.); // 4th value is specular power

    Sphere[1]   = vec4(-0.3,animate,.6,.5);
    Ambient[1]  = vec3(.1,.1,0.);
    Diffuse[1]  = vec3(.5,.5,0.);
    Specular[1] = vec4(1.,1.,1.,20.); // 4th value is specular power


    for (int i = 0; i < Sphere.length(); i++) {
        V = vec3(0,0,fl);
        W = normalize(vec3(vPos.x, vPos.y, -fl));
        t = raySphere(V, W, Sphere[i]);
        vec3 ambientComponent = vec3(0.,0.,0.);
        
        float tMin = 1000.;
        if (t > 0. && t < tMin) {
            P = V + t * W;
            N = normalize(P - Sphere[i].w);      
            tMin = t;
            ambientComponent =  (Ambient[i]);
        }
        
        vec3 E = -W;
        vec3 specularComponent = vec3(0.,0.,0.);
        vec3 diffuseComponent = vec3(0.,0.,0.);
        
        for (int j = 0; j < Lcol.length(); j++) {
            vec3 R = 2. * N * dot(N,Ldir[j]) - Ldir[j];
            if (!isInShadow(P, Ldir[j])){
                specularComponent += Specular[i].rgb * pow(max(0., dot(E,R)), Specular[i].w);
                diffuseComponent += Diffuse[i].rgb * max(0., dot(N,Lcol[j]));
            }
        }
       
        color =   ambientComponent + diffuseComponent + specularComponent;

        fragColor = vec4((color), 1.0);

    }
}