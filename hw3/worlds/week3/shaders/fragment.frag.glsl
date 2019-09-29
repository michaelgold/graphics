#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform float uTime;   // TIME, IN SECONDS

struct Material {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float power;
    vec3 reflect;
};

in vec3 vPos;     // -1 < vPos.x < +1
// -1 < vPos.y < +1
//      vPos.z == 0

out vec4 fragColor; 
const int NS = 2; // Number of spheres in the scene
const int NL = 2; // Number of light sources in the scene

uniform Material uMaterials[NS];

struct Shape {
    int type; //0 sphere, 1 cube
    vec3 center;
    float size;
};

uniform Shape uShapes[NS];

// Declarations of arrays for spheres, lights and phong shading:

vec3 Ldir[NL], Lcol[NL], Ambient[NS], Diffuse[NS], V, W, VV, P, N, color;
vec4 Sphere[NS], Specular[NS];
float t;
float fl = 3.;

vec2 sortRoots(float roots[2]) { 
    // if ((roots[0] > 0.) && (roots[0] <= roots[1])) {
    //     return vec2(roots[0], roots[1]);
    // } else if (roots[1] > 0. && roots[1] < roots[0] ) {
    //     return vec2(roots[1], roots[0]);
    // } else {
    //     return vec2(-1., -1.);
    // }

    float tMin = 1000.;
    int minIndex = -1;

    for (int i = 0; i < 2; i++) {
        if ((roots[i] >= -2.) && (roots[i] < tMin))  {
            tMin = roots[i];
            minIndex = i;
        }
    }

    switch (minIndex) {
        case 0:
            return vec2(roots[0], roots[1]);
        case 1:
            return vec2(roots[1], roots[0]);
        case -2:
            return vec2(-1., -1.);
    }
    
}
        

vec2 rayShape(vec3 V, vec3 W, Shape shape) {
    VV = V - shape.center;
    
    float rootPart = sqrt( (dot(W,VV) * dot(W,VV))  - dot(VV,VV) + (shape.size * shape.size));
    float roots[2];
    roots[0] = -(dot(W,VV)) - rootPart;
    roots[1] = -(dot(W,VV)) + rootPart;

    return sortRoots(roots);
}

bool isInShadow(vec3 P, vec3 L) {
    for (int i = 0; i < NS; i++) {
        if (rayShape(P, L, uShapes[i]).x > 0.001) {
            return true;
        }
    }
    return false;
}

vec3 computeSurfaceNormal(vec3 P, Shape S) {
    return normalize(P - S.center);
}

vec3 phongShading(vec3 P, vec3 N, Shape S, Material M) {
    vec3 ambientComponent =  M.ambient;

    vec3 E = -W;
    vec3 specularComponent = vec3(0.,0.,0.);
    vec3 diffuseComponent = vec3(0.,0.,0.);


    for (int j = 0; j < Ldir.length(); j++) {
        vec3 R = 2. * dot(N,Ldir[j]) * N - Ldir[j];
        if (!isInShadow(P, Ldir[j])) {
            specularComponent += Lcol[j] * (M.specular * pow(max(0., dot(E,R) ), M.power));
            diffuseComponent +=  Lcol[j] * (M.diffuse * max(0., dot(N,Lcol[j])));
        }
    }
    
    return ambientComponent + diffuseComponent + specularComponent;
    
}


void main() {
    Ldir[0] = normalize(vec3(1.,1.,.5));
    Lcol[0] = vec3(1.,1.,1.);

    Ldir[1] = normalize(vec3(-1.,0.,-2.));
    Lcol[1] = vec3(.1,.07,.05);

    float tMin = 1000.;

    for (int i = 0; i < uShapes.length(); i++) {
        

        V = vec3(0,0,fl);
        W = normalize(vec3(vPos.x, vPos.y, -fl));
        t = rayShape(V, W, uShapes[i]).x;
        

        vec3 ambientComponent = vec3(0.,0.,0.);

        if (t > 0. && t < tMin) {
            P = V + t * W;   
            N = computeSurfaceNormal(P, uShapes[i]);
            tMin = t;
            
            color = phongShading(P, N, uShapes[i], uMaterials[i]);

            if (length(uMaterials[i].reflect) > 0.) {
                vec3 WW = W - 2. * dot(N, W) * N;
                float ttMin = 1000.;
                Shape S;
                Material M;
                vec3 PP, NN;
                for (int j = 0; j < NS; j++) {
                    float tt = rayShape(P, WW, uShapes[j]).x;
                    if (tt > 0. && tt < ttMin) {
                        S = uShapes[j];
                        M = uMaterials[j];
                        PP = P + t * WW;
                        NN = computeSurfaceNormal(PP, S);
                        ttMin = tt;
                    }
                }
                if (ttMin < 1000.) {
                    vec3 rgb = phongShading(PP, NN, S, M);
                    color += rgb * uMaterials[i].reflect;
                }

            }
            

        }
        
        
        fragColor = vec4((color), 1.0);

    }
}