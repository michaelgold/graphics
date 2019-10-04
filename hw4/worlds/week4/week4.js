"use strict"

let cursor;

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

let matrixMultiply = (matrix, other) => {
    let result = [];
    for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++ ) {
            result.push(dotProduct(getRow(matrix, row), getColumn(other, column)));
        }
    }
    return result;
}

// NOTE: t is the elapsed time since system start in ms, but
// each world could have different rules about time elapsed and whether the time
// is reset after returning to the world
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

    gl.uniform1i (state.uShapesLoc[0].type      , 0);
    gl.uniform3fv(state.uShapesLoc[0].center , [0.,0.,0.]);
    gl.uniform1f (state.uShapesLoc[0].size      , .6);
    gl.uniform1i (state.uShapesLoc[0].sides      , 0);


    // red floating diamond
    gl.uniform3fv(state.uMaterialsLoc[1].ambient , [.7,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[1].diffuse , [.5,.5,0]);
    gl.uniform3fv(state.uMaterialsLoc[1].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[1].reflect , [.1,.1,0.]);
    gl.uniform1f (state.uMaterialsLoc[1].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[1].transparent        , [.1,.1,0.]);
    gl.uniform1f (state.uMaterialsLoc[1].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[1].type      , 1);
    gl.uniform3fv(state.uShapesLoc[1].center , [Math.sin(time)/2,.5,.6]);
    gl.uniform1f (state.uShapesLoc[1].size      , .3);
    gl.uniform1i (state.uShapesLoc[1].sides      , 8);
    let rotationMatrix = rotateY(30);
    gl.uniformMatrix4fv(state.uShapesLoc[1].matrix , false, rotationMatrix);
    gl.uniformMatrix4fv(state.uShapesLoc[1].imatrix , false, inverse(rotationMatrix));
    

    // nose
    gl.uniform3fv(state.uMaterialsLoc[2].ambient , [0.,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[2].diffuse , [0.1,0.1,0.1]);
    gl.uniform3fv(state.uMaterialsLoc[2].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[2].reflect , [0.1,0.1,0.1]);
    gl.uniform1f (state.uMaterialsLoc[2].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[2].transparent        , [.1,.1,.1]);
    gl.uniform1f (state.uMaterialsLoc[2].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[2].type      , 1);
    gl.uniform3fv(state.uShapesLoc[2].center , [0., 0., .7]);
    gl.uniform1f (state.uShapesLoc[2].size      , .2);
    gl.uniform1i (state.uShapesLoc[2].sides      , 8);
    gl.uniformMatrix4fv(state.uShapesLoc[2].matrix , false, identity());
    gl.uniformMatrix4fv(state.uShapesLoc[2].imatrix , false, identity());
    


    // left part of mouth
    gl.uniform3fv(state.uMaterialsLoc[3].ambient , [0.,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[3].diffuse , [0.1,0.1,0.1]);
    gl.uniform3fv(state.uMaterialsLoc[3].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[3].reflect , [0.1,0.1,0.1]);
    gl.uniform1f (state.uMaterialsLoc[3].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[3].transparent        , [.1,.1,.1]);
    gl.uniform1f (state.uMaterialsLoc[3].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[3].type      , 1);
    gl.uniform3fv(state.uShapesLoc[3].center , [-.08, -.3, .5]);
    gl.uniform1f (state.uShapesLoc[3].size      , .159);
    gl.uniform1i (state.uShapesLoc[3].sides      , 6);
    gl.uniformMatrix4fv(state.uShapesLoc[3].matrix , false, identity());
    gl.uniformMatrix4fv(state.uShapesLoc[3].imatrix , false, identity());


    // right part of mouth
    gl.uniform3fv(state.uMaterialsLoc[4].ambient , [0.,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[4].diffuse , [0.1,0.1,0.1]);
    gl.uniform3fv(state.uMaterialsLoc[4].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[4].reflect , [0.1,0.1,0.1]);
    gl.uniform1f (state.uMaterialsLoc[4].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[4].transparent        , [.1,.1,.1]);
    gl.uniform1f (state.uMaterialsLoc[4].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[4].type      , 1);
    gl.uniform3fv(state.uShapesLoc[4].center , [.08, -.3, .5]);
    gl.uniform1f (state.uShapesLoc[4].size      , .159);
    gl.uniform1i (state.uShapesLoc[4].sides      , 6);
    gl.uniformMatrix4fv(state.uShapesLoc[4].matrix , false, identity());
    gl.uniformMatrix4fv(state.uShapesLoc[4].imatrix , false, identity());

    // left eye
    gl.uniform3fv(state.uMaterialsLoc[5].ambient , [0.,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[5].diffuse , [0.1,0.1,0.1]);
    gl.uniform3fv(state.uMaterialsLoc[5].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[5].reflect , [0.1,0.1,0.1]);
    gl.uniform1f (state.uMaterialsLoc[5].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[5].transparent        , [.1,.1,.1]);
    gl.uniform1f (state.uMaterialsLoc[5].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[5].type      , 0);
    gl.uniform3fv(state.uShapesLoc[5].center , [-.2 + Math.sin(time)/64 , .2, .5 ]);
    gl.uniform1f (state.uShapesLoc[5].size      , .1);
    gl.uniform1i (state.uShapesLoc[5].sides      , 0);

    // right eye
    gl.uniform3fv(state.uMaterialsLoc[6].ambient , [0.,0.,0.]);
    gl.uniform3fv(state.uMaterialsLoc[6].diffuse , [0.1,0.1,0.1]);
    gl.uniform3fv(state.uMaterialsLoc[6].specular, [1.,1.,1.]);
    gl.uniform3fv(state.uMaterialsLoc[6].reflect , [0.1,0.1,0.1]);
    gl.uniform1f (state.uMaterialsLoc[6].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[6].transparent        , [.1,.1,.1]);
    gl.uniform1f (state.uMaterialsLoc[6].indexOfRefaction   , 1.79);

    gl.uniform1i (state.uShapesLoc[6].type      , 0);
    gl.uniform3fv(state.uShapesLoc[6].center , [.2 + Math.sin(time)/64 , .2, .5]);
    gl.uniform1f (state.uShapesLoc[6].size      , .1);
    gl.uniform1i (state.uShapesLoc[6].sides      , 0);


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
