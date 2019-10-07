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
const int NS = 4; // Number of shapes in the scene
const int NL = 2; // Number of light sources in the scene
const int SPHERE = 0;
const int CUBE = 1;
const int CYLINDER = 2;
const int OCTAHEDRON = 3;

const int CYLINDERSURFACES = 2;
const int CUBESURFACES = 6;
const int OCTAHEDRONSURFACES = 8;


float a, b, c, d, e, f, g, h, i, j;

uniform Material uMaterials[NS];



struct Poly {
    vec4 plane[8];
};


struct Shape {
    int type; //0 sphere, 1 poly
    vec3 center;
    float size;
    int sides;
    mat4 matrix;
    mat4 imatrix; // this is just the inverse of the above
    mat4 quadraticSurface;
    vec4 plane1;
    vec4 plane2;
    vec4 plane3;
    vec4 plane4;
    vec4 plane5;
    vec4 plane6;
    vec4 plane7;
    vec4 plane8;
    float followCursor;
};


uniform Shape uShapes[NS];
uniform vec3 uCursor;

// Declarations of arrays for spheres, lights and phong shading:

vec3 Ldir[NL], Lcol[NL], Ambient[NS], Diffuse[NS], V, W, VV, P, N, color, frontSurfaceNormal, rearSurfaceNormal;
vec4 Sphere[NS], Specular[NS];
float t;
float fl = 3.;

vec2 sortRoots(float roots[2]) { 
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
            break;
        case 1:
            return vec2(roots[1], roots[0]);
            break;
        case -1:
            return vec2(-1., -1.);
            break;
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



vec3 cursorOffset (float followCursor) {
    return followCursor * vec3(uCursor.xy, 0.);
}

int getShapeSurfaces (int type) {
switch (type) {
    case CYLINDER:
        return CYLINDERSURFACES;
        break;
    case CUBE:
        return CUBESURFACES;
        break;
    case OCTAHEDRON:
        return OCTAHEDRONSURFACES;
        break;
    }
}

vec2 castRaytoPoly(vec3 V, vec3 W, Shape shape) {
    V = V - cursorOffset(shape.followCursor);
    vec4 VV = vec4(V, 1.);
    vec4 WW = vec4(W, 0.);

    float tMin = -1000.;
    float tMax = 1000.;


    bool rayMissed = false;

    int numberOfSurfaces = getShapeSurfaces(shape.type);

    vec4[8] plane;
    plane[0] = shape.plane1;
    plane[1] = shape.plane2;
    plane[2] = shape.plane3;
    plane[3] = shape.plane4;
    plane[4] = shape.plane5;
    plane[5] = shape.plane6;
    plane[6] = shape.plane7;
    plane[7] = shape.plane8;

    for (int i = 0; i < numberOfSurfaces; i++ ) {
        vec4 P = plane[i] *= shape.imatrix;

        // vec4 P = planeSurfaces.plane[i];

        float t = -(dot(P, VV)) / dot(P,WW);

        if (dot(P,VV) > 0.) {
            if (t < 0.) {
                // case 1 - ray missed
                rayMissed = true;
            }

            if (t > 0.) {
                // case 2
                if (t > tMin) {
                    frontSurfaceNormal = plane[i].xyz;
                    tMin = t;
                }
            }
        }

        if (dot(P,VV) < 0.) {
            if (t > 0.) {
                // case 3
                if (t < tMax) {
                    rearSurfaceNormal = plane[i].xyz;
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

vec2 castRaytoCylinder(vec3 V, vec3 W, Shape shape) {
    V = V - cursorOffset(shape.followCursor);

    vec4 VV = vec4(V, 1.);

    vec4 WW = vec4(W, 0.);

    mat4 S = mat4(1.,0.,0.,0., 0.,1.,0.,0., 0.,0.,0.,0., 0.,0.,0.,-1.);

    // mat4 S = quadraticSurface;


    S = transpose(shape.imatrix) * S * shape.imatrix;


    S = mat4( S[0].x  ,  S[0].y + S[1].x  ,  S[0].z + S[2].x  ,  S[0].w + S[3].x  , 
              0.      ,  S[1].y           ,  S[1].z + S[2].y  ,  S[1].w + S[3].y  , 
              0.      ,  0.               ,  S[2].z           ,  S[2].w + S[3].z  , 
              0.      ,  0.               ,  0.               ,  S[3].w 
    ); 

    a = S[0][0];    
    b = S[0][1];
    c = S[0][2];
    d = S[0][3];
    e = S[1][1];
    f = S[1][2];
    g = S[1][3];
    h = S[2][2];
    i = S[2][3];
    j = S[3][3];


    float A = a * WW.x * WW.x + b * WW.x * WW.y + c * WW.x * WW.z + 
              e * WW.y * WW.y + f * WW.y * WW.z + 
              h * WW.z * WW.z; 
    
    float B = a * (VV.x * WW.x + VV.x * WW.x) + b * (VV.x * WW.y + VV.y * WW.x) + 
              c * (VV.x * WW.z + VV.z * WW.x) + d * WW.x +
              e * (VV.y * WW.y + VV.y * WW.y) + f * (VV.y * WW.z + VV.z * WW.y) + 
              g * WW.y + h * (VV.z * WW.z + VV.z * WW.z) + i * WW.z; 
              
    float C = a * VV.x * VV.x + b * VV.x * VV.y + c * VV.x * VV.z + d * VV.x +
              e * VV.y * VV.y + f * VV.y * VV.z + g * VV.y +
              h * VV.z * VV.z + i * VV.z + j;    

    // A t2 + B t + C ≤ 0

    float roots[2];

    //t = (-B +- sqrt(bb - 4* A * C)) / 2*A
    
    float rootPart = sqrt(B * B - (4. * A * C));
    roots[0] = (-B + rootPart) / (2. * A);
    roots[1] = (-B - rootPart) / (2. * A);


    return sortRoots(roots);
}


vec2 rayShape(vec3 V, vec3 W, Shape shape) {
    vec2 roots;
    switch (shape.type) {
        case SPHERE:
            return castRaytoSphere(V, W, shape);
            break;
        case CUBE:
            return castRaytoPoly(V, W, shape);
            break;
        case OCTAHEDRON:
            return castRaytoPoly(V, W, shape);
            break;
        case CYLINDER:
            return castRaytoCylinder(V, W, shape);
            break;
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

vec3 computeQuadraticNormal(vec3 P) {
    return normalize( vec3( 2. * a * P.x  +  b * P.y  +  c * P.z  +  d,
                                        2. * e * P.y  +  f * P.z  +  g,
                                                    2. * h * P.z  +  i ) );
}

vec3 computeSurfaceNormal(vec3 P, Shape S) {

    switch (S.type) {
        case SPHERE:
            return normalize(P - S.center);
            break;
        case CUBE:
            return frontSurfaceNormal;
            break;
        case OCTAHEDRON:
            return frontSurfaceNormal;
            break;
        case CYLINDER:
            return computeQuadraticNormal(P);
            break;
    }    
}

vec3 phongShading(vec3 P, vec3 N, Shape S, Material M) {
    vec3 ambientComponent =  M.ambient;

    vec3 E = -W;
    vec3 specularComponent = vec3(0.,0.,0.);
    vec3 diffuseComponent = vec3(0.,0.,0.);

    for (int j = 0; j < NL; j++) {
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

    for (int i = 0; i < NS; i++) {
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
        
        fragColor = vec4(sqrt(color), 1.);
    }
}