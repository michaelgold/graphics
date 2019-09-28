#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform float uTime;   // TIME, IN SECONDS

struct Material {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float power;
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
float fl = 7.;

vec2 sortRoots(float roots[2]) { 
    if (roots[0] > 0. && roots[0] <= roots[1]) {
        return vec2(roots[0], roots[1]);
    } else if (roots[1] > 0. && roots[1] < roots[0] ) {
        return vec2(roots[1], roots[0]);
    } else {
        return vec2(-1., -1.);
    }
}

vec2 rayShape(vec3 V, vec3 W, Shape shape) {
    VV = V - shape.center;
    
    float rootPart = sqrt(pow(dot(W,VV), 2.0) - dot(VV,VV) + shape.size * shape.size);
    float roots[2];
    roots[0] = -(dot(W,VV)) - rootPart;
    roots[1] = -(dot(W,VV)) + rootPart;

    return sortRoots(roots);
}

bool isInShadow(vec3 P, vec3 L, Shape shape) {
    for (int i = 0; i < NS; i++) {
        if (rayShape(P, L, shape).x > 0.001) {
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



    for (int i = 0; i < uShapes.length(); i++) {
        

        V = vec3(0,0,fl);
        W = normalize(vec3(vPos.x, vPos.y, -fl));
        t = rayShape(V, W, uShapes[i]).x;
        float tMin = 1000.;

        vec3 ambientComponent = vec3(0.,0.,0.);


        if (t > 0. && t < tMin) {
            P = V + t * W;
            N = normalize(P - uShapes[i].size);      
            tMin = t;
            ambientComponent =  (uMaterials[i].ambient);
        }
        
        
        vec3 E = -W;
        vec3 specularComponent = vec3(0.,0.,0.);
        vec3 diffuseComponent = vec3(0.,0.,0.);
        
        for (int j = 0; j < Lcol.length(); j++) {
            vec3 R = 2. * N * dot(N,Ldir[j]) - Ldir[j];
            if (!isInShadow(P, Ldir[j], uShapes[i])){
                specularComponent += uMaterials[i].specular * pow(max(0., dot(E,R)), uMaterials[i].power);
                diffuseComponent += uMaterials[i].diffuse * max(0., dot(N,Lcol[j]));
            }

            
        

        }
        

        color =   ambientComponent + diffuseComponent + specularComponent;

        fragColor = vec4((color), 1.0);

    }
}