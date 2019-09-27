"use strict"

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

                // Assign MVP matrices
                state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
                state.uViewLoc         = gl.getUniformLocation(program, 'uView');
                state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
                state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');

                let NS = 2;
                
                state.uMaterialsLoc = [];
                state.uShapesLoc = [];


                for (let i = 0; i < NS; i +=1) {
                    state.uMaterialsLoc[i] = {};
                    state.uMaterialsLoc[i].diffuse  = gl.getUniformLocation(program, 'uMaterials['+i+'].diffuse');
                    state.uMaterialsLoc[i].ambient  = gl.getUniformLocation(program, 'uMaterials['+i+'].ambient');
                    state.uMaterialsLoc[i].specular  = gl.getUniformLocation(program, 'uMaterials['+i+'].specular');
                    state.uMaterialsLoc[i].power  = gl.getUniformLocation(program, 'uMaterials['+i+'].power');
                    
                    state.uShapesLoc[i] = {};
                    state.uShapesLoc[i].type =  gl.getUniformLocation(program, 'uShapes['+i+'].type');
                    state.uShapesLoc[i].center =  gl.getUniformLocation(program, 'uShapes['+i+'].center');
                    state.uShapesLoc[i].size =  gl.getUniformLocation(program, 'uShapes['+i+'].size');
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

// NOTE: t is the elapsed time since system start in ms, but
// each world could have different rules about time elapsed and whether the time
// is reset after returning to the world
function onStartFrame(t, state) {
    // (KTR) TODO implement option so a person could pause and resume elapsed time
    // if someone visits, leaves, and later returns
    let tStart = t;
    if (!state.tStart) {
        state.tStart = t;
        state.time = t;
    }

    tStart = state.tStart;

    let now = (t - tStart);
    // different from t, since t is the total elapsed time in the entire system, best to use "state.time"
    state.time = now;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let time = now / 1000;

    gl.uniform1f(state.uTimeLoc, time);

    gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.05,0,0]);
    gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.5,0,0]);
    gl.uniform3fv(state.uMaterialsLoc[0].specular, [.5,.5,.5]);
    gl.uniform1f (state.uMaterialsLoc[0].power   , 20);

    gl.uniform1f (state.uShapesLoc[0].type      , 0);
    gl.uniform3fv(state.uShapesLoc[0].center , [.5,Math.sin(time),.6]);
    gl.uniform1f (state.uShapesLoc[0].size      , .5);


    gl.uniform3fv(state.uMaterialsLoc[1].ambient , [.1,.1,0]);
    gl.uniform3fv(state.uMaterialsLoc[1].diffuse , [.5,.5,0]);
    gl.uniform3fv(state.uMaterialsLoc[1].specular, [1.,1.,1.]);
    gl.uniform1f (state.uMaterialsLoc[1].power   , 20);

    gl.uniform1f (state.uShapesLoc[1].type      , 0);
    gl.uniform3fv(state.uShapesLoc[1].center , [-0.3,0.,.5]);
    gl.uniform1f (state.uShapesLoc[1].size      , .5);


    gl.enable(gl.DEPTH_TEST);
}

function onDraw(t, projMat, viewMat, state, eyeIdx) {
    const sec = state.time / 1000;

    const my = state;
  
    newFunction(my);
    gl.uniformMatrix4fv(my.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(my.uProjLoc, false, new Float32Array(projMat));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function newFunction(my) {
    gl.uniformMatrix4fv(my.uModelLoc, false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1, 1]));
}

function onEndFrame(t, state) {
}

export default function main() {
    const def = {
        name         : 'week3',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
