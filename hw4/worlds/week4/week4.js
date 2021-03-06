"use strict"

let cursor;

const SPHERE = 0;
const CUBE = 1;
const CYLINDER = 2;
const OCTAHEDRON = 3;

async function setup(state) {
    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        },
        {
            key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true
        },      
    ]);

    if (!libSources) {
        throw new Error("Could not load shader library");
    }

    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        gl,
        "mainShader",
        { 
            onNeedsCompilation : (args, libMap, userData) => {
                const stages = [args.vertex, args.fragment];
                const output = [args.vertex, args.fragment];

                const implicitNoiseInclude = true;
                if (implicitNoiseInclude) {
                    let libCode = MREditor.libMap.get("pnoise");

                    for (let i = 0; i < 2; i += 1) {
                        const stageCode = stages[i];
                        const hdrEndIdx = stageCode.indexOf(';');
                        
                        /*
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        output[i] = hdr + "\n#line 1 1\n" + 
                                    libCode + "\n#line " + (hdr.split('\n').length) + " 0\n" + 
                                    stageCode.substring(hdrEndIdx + 1);
                        console.log(output[i]);
                        */
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        
                        output[i] = hdr + "\n#line 2 1\n" + 
                                    "#include<pnoise>\n#line " + (hdr.split('\n').length + 1) + " 0" + 
                            stageCode.substring(hdrEndIdx + 1);

                        console.log(output[i]);
                    }
                }

                MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                    output[0],
                    output[1],
                    libMap
                );
            },
            onAfterCompilation : (program) => {
                state.program = program;

                gl.useProgram(program);

                state.uCursorLoc       = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
                state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');
                state.uViewLoc         = gl.getUniformLocation(program, 'uView');


                let NS = 7;
                
                state.uMaterialsLoc = [];
                state.uShapesLoc = [];


                for (let i = 0; i < NS; i +=1) {
                    state.uMaterialsLoc[i] = {};
                    state.uMaterialsLoc[i].diffuse          = gl.getUniformLocation(program, 'uMaterials['+i+'].diffuse');
                    state.uMaterialsLoc[i].ambient          = gl.getUniformLocation(program, 'uMaterials['+i+'].ambient');
                    state.uMaterialsLoc[i].specular         = gl.getUniformLocation(program, 'uMaterials['+i+'].specular');
                    state.uMaterialsLoc[i].reflect          = gl.getUniformLocation(program, 'uMaterials['+i+'].reflect');
                    state.uMaterialsLoc[i].power            = gl.getUniformLocation(program, 'uMaterials['+i+'].power');
                    state.uMaterialsLoc[i].transparent      = gl.getUniformLocation(program, 'uMaterials['+i+'].transparent');
                    state.uMaterialsLoc[i].indexOfRefaction = gl.getUniformLocation(program, 'uMaterials['+i+'].indexOfRefraction');
                    
                    state.uShapesLoc[i] = {};
                    state.uShapesLoc[i].type =  gl.getUniformLocation(program, 'uShapes['+i+'].type');
                    state.uShapesLoc[i].center =  gl.getUniformLocation(program, 'uShapes['+i+'].center');
                    state.uShapesLoc[i].size =  gl.getUniformLocation(program, 'uShapes['+i+'].size');
                    state.uShapesLoc[i].sides =  gl.getUniformLocation(program, 'uShapes['+i+'].sides');
                    state.uShapesLoc[i].matrix = gl.getUniformLocation(program, 'uShapes['+i+'].matrix');
                    state.uShapesLoc[i].imatrix = gl.getUniformLocation(program, 'uShapes['+i+'].imatrix');
                    state.uShapesLoc[i].followCursor = gl.getUniformLocation(program, 'uShapes['+i+'].followCursor');
                    
                    state.uShapesLoc[i].plane1 = gl.getUniformLocation(program, 'uShapes['+i+'].plane1');
                    state.uShapesLoc[i].plane2 = gl.getUniformLocation(program, 'uShapes['+i+'].plane2');
                    state.uShapesLoc[i].plane3 = gl.getUniformLocation(program, 'uShapes['+i+'].plane3');
                    state.uShapesLoc[i].plane4 = gl.getUniformLocation(program, 'uShapes['+i+'].plane4');
                    state.uShapesLoc[i].plane5 = gl.getUniformLocation(program, 'uShapes['+i+'].plane5');
                    state.uShapesLoc[i].plane6 = gl.getUniformLocation(program, 'uShapes['+i+'].plane6');
                    state.uShapesLoc[i].plane7 = gl.getUniformLocation(program, 'uShapes['+i+'].plane7');
                    state.uShapesLoc[i].plane8 = gl.getUniformLocation(program, 'uShapes['+i+'].plane8');
                }







            } 
        },
        {
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            foldDefault : {
                vertex   : true,
                fragment : false
            }
        }
    );

    cursor = ScreenCursor.trackCursor(MR.getCanvas());

    if (!shaderSource) {
        throw new Error("Could not load shader");
    }


    // Create a square as a triangle strip consisting of two triangles
    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]), gl.STATIC_DRAW);

    // Assign aPos attribute to each vertex
    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);






}





// I HAVE IMPLEMENTED inverse() FOR YOU. FOR HOMEWORK, YOU WILL STILL NEED TO IMPLEMENT:
// identity(), translate(x,y,z), rotateX(a), rotateY(a) rotateZ(a), scale(x,y,z), multiply(A,B)

let inverse = src => {
  let dst = [], det = 0, cofactor = (c, r) => {
     let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];
     return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                                 - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                                 + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
  }
  for (let n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
  for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
  for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
  return dst;
}

let identity = () => {
    return [ 1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1 ];
}

let translate = (x, y, z) => {
    return [ 1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  x, y, z, 1 ];
}

let rotateX = (theta) => {
    let c = Math.cos(theta);
    let s = Math.sin(theta); 
    return [ 1, 0, 0, 0,  0, c, s, 0,  0, -s, c, 0,  0, 0, 0, 1 ];
}

let rotateY = (theta) => {
    let c = Math.cos(theta);
    let s = Math.sin(theta); 
    return [ c, 0, -s, 0,  0, 1, 0, 0,  s, 0, c, 0,  0, 0, 0, 1 ];
}

let rotateZ = (theta) => {
    let c = Math.cos(theta);
    let s = Math.sin(theta); 
    return [ c, s, 0, 0,  -s, c, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1 ];
}

let scale = (x, y, z) => {
    return [ x, 0, 0, 0,  0, y, 0, 0,  0, 0, z, 0,  0, 0, 0, 1 ];
}

let perspective = (x, y, z, w) => {
    return [ 1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  x, y, z, w ];
}

let getRow = (matrix, row) => {
    return [ matrix[row], matrix[row + 4], matrix[row + 8], matrix[row + 12] ]
}

let getColumn = (matrix, column) => {
    column = column * 4;
    return [ matrix[column], matrix[column + 1], matrix[column + 2], matrix[column + 3] ];
}

let dotProduct = (row, column) => {
    return (row[0] * column[0] + row[1] * column[1] + row[2] * column[2] + row[3] * column[3]);
}

let multiply = (matrix, other) => {
    let result = [];
    for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++ ) {
            result.push(dotProduct(getRow(matrix, row), getColumn(other, column)));
        }
    }
    return result;
}

let r = 2;

let cubeGeometry = {
                    plane1: [],
                    plane2: [],
                    plane3: [],
                    plane4: [],
                    plane5: [],
                    plane6: [],
                    plane7: [0.,0.,0.,0.],
                    plane8: [0.,0.,0.,0.],
                    set: function(r) {
                        this.plane1 = [-1.,  0.,  0., -r];
                        this.plane2 = [1.,  0.,  0., -r],
                        this.plane3 = [0., -1.,  0., -r],
                        this.plane4 = [0.,  1.,  0., -r],
                        this.plane5 = [0.,  0., -1., -r],
                        this.plane6 = [0.,  0.,  1., -r]; 
                    }
                } 

let octahedronGeometry = {
    plane1: [],
    plane2: [],
    plane3: [],
    plane4: [],
    plane5: [],
    plane6: [],
    plane7: [],
    plane8: [],
    set: function(r) {
        let r3 =  1 / Math.sqrt(3);
        this.plane1 = [ -r3,  -r3,  -r3, -r];
        this.plane2 = [r3,  -r3,  -r3, -r];
        this.plane3 = [-r3,   r3,  -r3, -r,];
        this.plane4 = [r3,   r3,  -r3, -r];
        this.plane5 = [-r3,  -r3,   r3, -r];
        this.plane6 = [r3,  -r3,   r3, -r];
        this.plane7 = [-r3,   r3,   r3, -r];
        this.plane8 = [r3,   r3,   r3, -r];
        return this;
    }
}

let cylinderGeometry = {
    plane1: [0., 0.,-1.,-1.],
    plane2: [0., 0., 1., -1.],
    plane3: [0. ,0. ,0. ,0.],
    plane4: [0. ,0. ,0. ,0.],
    plane5: [0. ,0. ,0. ,0.],
    plane6: [0. ,0. ,0. ,0.],
    plane7: [0. ,0. ,0. ,0.],
    plane8: [0. ,0. ,0. ,0.]
}
                       

let setGeometry = (loc, geometry) => {
    gl.uniform4fv(loc['plane1'], geometry.plane1);
    gl.uniform4fv(loc['plane2'], geometry.plane2);
    gl.uniform4fv(loc['plane3'], geometry.plane3);
    gl.uniform4fv(loc['plane4'], geometry.plane4);
    gl.uniform4fv(loc['plane5'], geometry.plane5);
    gl.uniform4fv(loc['plane6'], geometry.plane6);
    gl.uniform4fv(loc['plane7'], geometry.plane7);
    gl.uniform4fv(loc['plane8'], geometry.plane8);
}

// NOTE: t is the elapsed time since system start in ms, but
// each world could have different rules about time elapsed and whether the time
// is reset after returning to the world

let theta = {
    value: 0,
    frames: 0,
    delay: 2,
    increase: function(amt) {
        this.frames++;
        if (this.frames % this.delay == 0) {
            if (this.value < 360) {
                this.value += amt;
            } else {
                this.value = 0;
            }   
        }
    }
}

let x = theta;
let y = theta;
let z = theta;

let setMatrix = (loc, mat) => {
    gl.uniformMatrix4fv(loc['matrix' ], false, mat);
    gl.uniformMatrix4fv(loc['imatrix'], false, inverse(mat));
 }

function onStartFrame(t, state) {

    let tStart = t;
    if (!state.tStart) {
        state.tStart = t;
        state.time = t;
    }

    let cursorValue = () => {
       let p = cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }

    tStart = state.tStart;

    let now = (t - tStart);
    // different from t, since t is the total elapsed time in the entire system, best to use "state.time"
    state.time = now;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let time = now / 1000;

    gl.uniform3fv(state.uCursorLoc     , cursorValue());
    gl.uniform1f (state.uTimeLoc       , time);


    // big yellow sphere for head
    gl.uniform3fv(state.uMaterialsLoc[0].ambient            , [.1,.1,0.]);
    gl.uniform3fv(state.uMaterialsLoc[0].diffuse            , [.5,.5,0.]);
    gl.uniform3fv(state.uMaterialsLoc[0].specular           , [0.,.1,.1]);
    gl.uniform3fv(state.uMaterialsLoc[0].reflect            , [0.,.1,.1]);
    gl.uniform1f (state.uMaterialsLoc[0].power              , 10.);
    gl.uniform3fv(state.uMaterialsLoc[0].transparent        , [0.,0.,0.]);
    gl.uniform1f (state.uMaterialsLoc[0].indexOfRefaction   , 1.);

    gl.uniform1i (state.uShapesLoc[0].type      , SPHERE);
    gl.uniform3fv(state.uShapesLoc[0].center , [0.,0.,0.]);
    gl.uniform1f (state.uShapesLoc[0].size      , .6);
    gl.uniform1i (state.uShapesLoc[0].sides      , 0);
    gl.uniform1f (state.uShapesLoc[0].followCursor      , 0);


    // red floating diamond
    gl.uniform3fv(state.uMaterialsLoc[1].ambient , [.7,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[1].diffuse , [.5,.5,0]);
    gl.uniform3fv(state.uMaterialsLoc[1].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[1].reflect , [.1,.1,0.]);
    gl.uniform1f (state.uMaterialsLoc[1].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[1].transparent        , [.1,.1,0.]);
    gl.uniform1f (state.uMaterialsLoc[1].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[1].type      , OCTAHEDRON);
    gl.uniform3fv(state.uShapesLoc[1].center , [0.,0, .85]);
    gl.uniform1f (state.uShapesLoc[1].size      , .3);
    gl.uniform1i (state.uShapesLoc[1].sides      , 8);
    gl.uniform1f (state.uShapesLoc[1].followCursor      , 1);

    let diamondSize = 0.3;
    let diamondGeometry = octahedronGeometry.set(diamondSize);

    setGeometry(state.uShapesLoc[1], diamondGeometry);

    let redDiamondMatrix = multiply( translate (0,0, .7), ( multiply( scale(.5,.5,.5),  multiply( rotateY(y.value) , rotateX(x.value) ) )));
    // let redDiamondMatrix = rotateY(x.value) ;
    
    redDiamondMatrix =  multiply(redDiamondMatrix, translate(0 , 0, .01  ));
    x.increase(.01);
    y.increase(.01);

    setMatrix(state.uShapesLoc[1], redDiamondMatrix);
    

    // nose
    gl.uniform3fv(state.uMaterialsLoc[2].ambient , [0.,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[2].diffuse , [0.1,0.1,0.1]);
    gl.uniform3fv(state.uMaterialsLoc[2].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[2].reflect , [0.1,0.1,0.1]);
    gl.uniform1f (state.uMaterialsLoc[2].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[2].transparent        , [.1,.1,.1]);
    gl.uniform1f (state.uMaterialsLoc[2].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[2].type      , OCTAHEDRON);
    gl.uniform3fv(state.uShapesLoc[2].center , [0., 0., .7]);
    gl.uniform1f (state.uShapesLoc[2].size      , .2);
    gl.uniform1i (state.uShapesLoc[2].sides      , 8);
    

    let noseSize = 0.3;
    let noseGeometry = octahedronGeometry.set(noseSize);
    let noseMatrix  = multiply(translate(.5,0,.3), scale(0.5,0.5,0.5));
    setMatrix(state.uShapesLoc[2], noseMatrix);

    gl.uniform1f (state.uShapesLoc[2].followCursor      , 0);
    setGeometry(state.uShapesLoc[2], noseGeometry);


    // right eye
    gl.uniform3fv(state.uMaterialsLoc[3].ambient , [0.,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[3].diffuse , [0.1,0.1,0.1]);
    gl.uniform3fv(state.uMaterialsLoc[3].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[3].reflect , [0.1,0.1,0.1]);
    gl.uniform1f (state.uMaterialsLoc[3].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[3].transparent        , [.1,.1,.1]);
    gl.uniform1f (state.uMaterialsLoc[3].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[3].type      , SPHERE);
    gl.uniform3fv(state.uShapesLoc[3].center , [.2 + Math.sin(time)/64 , .2, .5]);
    gl.uniform1f (state.uShapesLoc[3].size      , .1);
    gl.uniform1i (state.uShapesLoc[3].sides      , 0);
    gl.uniform1f (state.uShapesLoc[3].followCursor      , 0);


    // // left part of mouth
    // gl.uniform3fv(state.uMaterialsLoc[3].ambient , [0.,0.,0.]);
    // gl.uniform3fv(state.uMaterialsLoc[3].diffuse , [0.1,0.1,0.1]);
    // gl.uniform3fv(state.uMaterialsLoc[3].specular, [1.,1.,1.]);
    // gl.uniform3fv(state.uMaterialsLoc[3].reflect , [0.1,0.1,0.1]);
    // gl.uniform1f (state.uMaterialsLoc[3].power   , 20.);
    // gl.uniform3fv(state.uMaterialsLoc[3].transparent        , [.1,.1,.1]);
    // gl.uniform1f (state.uMaterialsLoc[3].indexOfRefaction   , 1.79);

    // gl.uniform1i (state.uShapesLoc[3].type      , CUBE);
    // gl.uniform3fv(state.uShapesLoc[3].center , [-.08, -.3, .5]);
    // gl.uniform1f (state.uShapesLoc[3].size      , .159);
    // gl.uniform1i (state.uShapesLoc[3].sides      , 6);
    // gl.uniformMatrix4fv(state.uShapesLoc[3].matrix , false, identity());
    // gl.uniformMatrix4fv(state.uShapesLoc[3].imatrix , false, identity());
    // gl.uniform1f (state.uShapesLoc[3].followCursor      , 0);

    // // right part of mouth
    // gl.uniform3fv(state.uMaterialsLoc[4].ambient , [0.,0.,0.]);
    // gl.uniform3fv(state.uMaterialsLoc[4].diffuse , [0.1,0.1,0.1]);
    // gl.uniform3fv(state.uMaterialsLoc[4].specular, [1.,1.,1.]);
    // gl.uniform3fv(state.uMaterialsLoc[4].reflect , [0.1,0.1,0.1]);
    // gl.uniform1f (state.uMaterialsLoc[4].power   , 20.);
    // gl.uniform3fv(state.uMaterialsLoc[4].transparent        , [.1,.1,.1]);
    // gl.uniform1f (state.uMaterialsLoc[4].indexOfRefaction   , 1.79);

    // gl.uniform1i (state.uShapesLoc[4].type      , CUBE);
    // gl.uniform3fv(state.uShapesLoc[4].center , [.08, -.3, .5]);
    // gl.uniform1f (state.uShapesLoc[4].size      , .159);
    // gl.uniform1i (state.uShapesLoc[4].sides      , 6);
    // gl.uniformMatrix4fv(state.uShapesLoc[4].matrix , false, identity());
    // gl.uniformMatrix4fv(state.uShapesLoc[4].imatrix , false, inverse(identity()));
    // gl.uniform1f (state.uShapesLoc[4].followCursor      , 0);

    // left eye
    // gl.uniform3fv(state.uMaterialsLoc[5].ambient , [0.,0.,0.]);
    // gl.uniform3fv(state.uMaterialsLoc[5].diffuse , [0.1,0.1,0.1]);
    // gl.uniform3fv(state.uMaterialsLoc[5].specular, [1.,1.,1.]);
    // gl.uniform3fv(state.uMaterialsLoc[5].reflect , [0.1,0.1,0.1]);
    // gl.uniform1f (state.uMaterialsLoc[5].power   , 20.);
    // gl.uniform3fv(state.uMaterialsLoc[5].transparent        , [.1,.1,.1]);
    // gl.uniform1f (state.uMaterialsLoc[5].indexOfRefaction   , 1.79);


    // gl.uniform1i (state.uShapesLoc[5].type      , CUBE);
    // gl.uniform3fv(state.uShapesLoc[5].center , [-.2 , .2, .5 ]);
    // gl.uniform1f (state.uShapesLoc[5].size      ,  .1);
    // gl.uniform1i (state.uShapesLoc[5].sides      , 0);
    // gl.uniform1f (state.uShapesLoc[5].followCursor      , 0);

    // let leftEyeMatrix = multiply(scale(.2, .2, .2), rotateY(y.value));

    // setMatrix(state.uShapesLoc[5], leftEyeMatrix);



    gl.enable(gl.DEPTH_TEST);
}



function onDraw(t, projMat, viewMat, state, eyeIdx) {
    const sec = state.time / 1000;

    const my = state;
  
    gl.uniformMatrix4fv(my.uModelLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));
    gl.uniformMatrix4fv(my.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(my.uProjLoc, false, new Float32Array(projMat));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function onEndFrame(t, state) {
}

export default function main() {
    const def = {
        name         : 'week4',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
