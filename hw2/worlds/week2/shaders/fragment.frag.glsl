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
float fl = 4.;


float raySphere(vec3 V, vec3 W, vec4 S) {
    VV = V - S.xyz;
    
    float t = -(dot(W,VV)) - sqrt(pow(dot(W,VV), 2.0) - dot(VV,VV) + pow(S.w, 2.0));
    float tt = -(dot(W,VV)) + sqrt(pow(dot(W,VV), 2.0) - dot(VV,VV) + pow(S.w, 2.0));
    if (t > 0. && t < tt) {
        return t;
    } else if (tt > 0. && tt < t ) {
        return tt;
    } else {
        return -1.;
    }

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

    Ldir[1] = normalize(vec3(-1.,0.,-2.));
    Lcol[1] = vec3(.1,.07,.05);

    Sphere[0]   = vec4(.5, .7 - animate, .6, .4);
    Ambient[0]  = vec3(0.,.1,.1);
    Diffuse[0]  = vec3(0.,.5,.5);
    Specular[0] = vec4(0.,1.,1.,10.); // 4th value is specular power

    Sphere[1]   = vec4(0,-animate,.6,.61);
    Ambient[1]  = vec3(.1,.1,0.);
    Diffuse[1]  = vec3(.5,.5,0.);
    Specular[1] = vec4(1.,1.,1.,20.); // 4th value is specular power


    for (int i = 0; i < Sphere.length(); i++) {
        
        V = vec3(0,0,fl);
        W = normalize(vec3(vPos.x, vPos.y, -fl));
        t = raySphere(V, W, Sphere[i]);
        float tMin = 1000.;
        if (t > 0. && t < tMin) {
            P = V + t * W;
            N = normalize(P - Sphere[i].w);      
            tMin = t;
        }
        
        
        vec3 E = -W;
        vec3 specularComponent = vec3(0.,0.,0.);
        vec3 diffuseComponent = vec3(0.,0.,0.);
        
        vec3 ambientComponent = vec3(0.,0.,0.);

        for (int j = 0; j < Lcol.length(); j++) {
            vec3 R = 2. * N * dot(N,Ldir[j]) - Ldir[j];
            if (!isInShadow(P, Ldir[j])){
                specularComponent += Specular[i].rgb * pow(max(0., dot(E,R)), Specular[i].w);
                diffuseComponent += Diffuse[i].rgb * max(0., dot(N,Lcol[j]));
            }

        }
        ambientComponent = P * (Ambient[i]);
        

        color =   ambientComponent + diffuseComponent + specularComponent;

        fragColor = vec4(sqrt(color), 1.0);

    }
}


