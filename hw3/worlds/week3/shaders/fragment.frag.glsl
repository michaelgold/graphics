#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform float uTime;   // TIME, IN SECONDS

struct Material {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float power;
    vec3 reflect;
    vec3 transparent;        // Transparency color. Black means the object is opaque.
    float indexOfRefraction; // Higher value means light will bend more as it refracts.
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


struct Cube {
    vec4 plane[6];
};

Cube initCube(float r) {
    Cube c;
    c.plane[0] = vec4(-1.,  0.,  0., -r);
    c.plane[1] = vec4( 1.,  0.,  0., -r);
    c.plane[2] = vec4( 0., -1.,  0., -r);
    c.plane[3] = vec4( 0.,  1.,  0., -r);
    c.plane[4] = vec4( 0.,  0., -1., -r);
    c.plane[5] = vec4( 0.,  0.,  1., -r);
    return c;
}

uniform Shape uShapes[NS];

// Declarations of arrays for spheres, lights and phong shading:

vec3 Ldir[NL], Lcol[NL], Ambient[NS], Diffuse[NS], V, W, VV, P, N, color, frontSurfaceNormal, rearSurfaceNormal;
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
        case -1:
            return vec2(-1., -1.);
    }
}
        
vec2 castRaytoSphere(vec3 V, vec3 W, Shape shape) {
    float roots[2];
    VV = V - shape.center;
    
    float rootPart = sqrt( (dot(W,VV) * dot(W,VV))  - dot(VV,VV) + (shape.size * shape.size));
    
    roots[0] = -(dot(W,VV)) - rootPart;
    roots[1] = -(dot(W,VV)) + rootPart;

    return sortRoots(roots);
}

vec2 castRaytoCube(vec3 V, vec3 W, Shape shape) {
    vec4 VV = vec4(V - shape.center, 1.);
    vec4 WW = vec4(W, 0.);

    float tMin = -1000.;
    float tMax = 1000.;
    
    Cube c = initCube(shape.size / 2.);

    bool rayMissed = false;

    for (int i = 0; i < c.plane.length(); i++ ) {

        vec4 P = c.plane[i];

        float t = -(dot(P, VV)) / dot(P,WW);

        if (dot(P,VV) > 0.) {
        
            if (t < 0.) {
                // case 1 - ray missed
                rayMissed = true;
            }

            if (t > 0.) {
                // case 2
                if (t > tMin) {
                    frontSurfaceNormal = c.plane[i].xyz;
                    tMin = t;
                }
            }
        }

        if (dot(P,VV) < 0.) {
        
            if (t > 0.) {
                // case 3
                if (t < tMax) {
                    rearSurfaceNormal = c.plane[i].xyz;
                    tMax = t;
                }
            }
            
            if (t < 0.) {
                // case 4 - do nothing
            }
        }
    }

    if (!rayMissed && tMin <= tMax) {
        return vec2(tMin, tMax);
    }
    
    return vec2(-1., -1.);
    

 
}


vec2 rayShape(vec3 V, vec3 W, Shape shape) {
    vec2 roots;
    switch (shape.type) {
        case 0:
            return castRaytoSphere(V, W, shape);
        case 1:
            return castRaytoCube(V, W, shape);
    }
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

    switch (S.type) {
        case 0:
            return normalize(P - S.center);
        case 1:
            return frontSurfaceNormal;
    }    
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

vec3 addReflection(Material material) {
    if (length(material.reflect) > 0.) {
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
            return rgb * material.reflect;
        }
    }
    return vec3(0.,0.,0.);
}

vec3 refractRay(vec3 W, vec3 N, float indexOfRefraction) {

    vec3 Wc = dot(W,N) * N;
    vec3 Ws = W - Wc;
    vec3 WWs = Ws / indexOfRefraction;
    vec3 WWc = -N * sqrt(1. - dot(WWs,WWs));

    vec3 WW = WWc + WWs;
    return WW;
}

vec3 addRefraction(Material material, Shape shape) {
    if (length(material.transparent) > 0.) {
    // compute ray that refracts to shape

        vec3 WW = refractRay(W, N, material.indexOfRefraction);

        float tt = rayShape(P - WW / 1000., WW, shape).y; // second root

        // compute second refacted ray that goes out of shape

        vec3 PP = P + tt * WW;
        vec3 NN = computeSurfaceNormal(PP, shape);
        vec3 WWW = refractRay(WW, NN, 1. / material.indexOfRefraction);

        // if emergent ray hits a shape, do Phong shading on nearest one to add color

        Shape S;
        Material M;
        float tttMin = 1000.;
        vec3 PPP, NNN;
        for (int j = 0; j < NS; j++) {
            float ttt = rayShape(PP, WWW, uShapes[j]).x;
            if (ttt > .001 && ttt < tttMin) {
                S = uShapes[j];
                M = uMaterials[j];
                PPP = PP + tt * WWW;
                NNN = computeSurfaceNormal(PPP, S);
                tttMin = ttt;
            }
        }
        if (tttMin < 1000.) {
            vec3 rgb = phongShading(PPP, NNN, S, M);
            return rgb * material.transparent;
        }
    }

    return vec3(0.,0.,0.);
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
            color += addReflection(uMaterials[i]);
            color += addRefraction(uMaterials[i], uShapes[i]);    
        }
        
        fragColor = vec4((color), 1.);

    }
}