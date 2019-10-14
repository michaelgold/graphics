"use strict"


const VERTEX_SIZE = 6; // EACH VERTEX CONSISTS OF: x,y,z, ny,ny,nz


 //////////////////////////////////////////////////////////////////
//                                                                //
//  FOR HOMEWORK, YOU CAN ALSO TRY DEFINING DIFFERENT SHAPES,     //
//  BY CREATING OTHER VERTEX ARRAYS IN ADDITION TO cubeVertices.  //
//                                                                //
 //////////////////////////////////////////////////////////////////

let createCubeVertices = () => {
   let v = [];
   let addVertex = a => {
      for (let i = 0 ; i < a.length ; i++)
         v.push(a[i]);
   }

   // EACH SQUARE CONSISTS OF TWO TRIANGLES.

   let addSquare = (a,b,c,d) => {
      addVertex(c);
      addVertex(b);
      addVertex(a);

      addVertex(b);
      addVertex(c);
      addVertex(d);
   }

   // VERTEX DATA FOR TWO OPPOSING SQUARE FACES. EACH VERTEX CONSISTS OF: x,y,z, nx,ny,nz

   let P = [[-1,-1,-1, 0,0,-1],[ 1,-1,-1, 0,0,-1],[-1, 1,-1, 0,0,-1],[ 1, 1,-1, 0,0,-1],
            [-1,-1, 1, 0,0, 1],[ 1,-1, 1, 0,0, 1],[-1, 1, 1, 0,0, 1],[ 1, 1, 1, 0,0, 1]];

   // LOOP THROUGH x,y,z. EACH TIME ADD TWO OPPOSING FACES, THEN PERMUTE COORDINATES.

   for (let n = 0 ; n < 3 ; n++) {
      addSquare(P[0],P[1],P[2],P[3]);
      addSquare(P[4],P[5],P[6],P[7]);
      for (let i = 0 ; i < P.length ; i++)
         P[i] = [P[i][1],P[i][2],P[i][0], P[i][4],P[i][5],P[i][3]];
   }

   return v;
}

let cubeVertices = createCubeVertices();


async function setup(state) {
    hotReloadFile(getPath('week5.js'));

    state.m = new Matrix();

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

                        //console.log(output[i]);
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

                state.uColorLoc        = gl.getUniformLocation(program, 'uColor');
                state.uCursorLoc       = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
                state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');
                state.uViewLoc         = gl.getUniformLocation(program, 'uView');
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

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());

    if (!shaderSource) {
        throw new Error("Could not load shader");
    }

    // Create a square as a triangle strip consisting of two triangles
    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);

 ///////////////////////////////////////////////////////////
//                                                         //
//  HINT: IF YOU WANT TO IMPLEMENT MORE THAN ONE SHAPE,    //
//  YOU MIGHT WANT TO CALL gl.bufferData()                 //
//  MULTIPLE TIMES IN onDraw() INSTEAD OF HERE,            //
//  USING OTHER ARRAY VALUES IN ADDITION TO cubeVertices.  //
//                                                         //
 ///////////////////////////////////////////////////////////

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( cubeVertices ), gl.STATIC_DRAW);

    let bpe = Float32Array.BYTES_PER_ELEMENT;

    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);

    let aNor = gl.getAttribLocation(state.program, 'aNor');
    gl.enableVertexAttribArray(aNor);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);
}


 /////////////////////////////////////////////////////////////////////
//                                                                   //
//  FOR HOMEWORK, YOU NEED TO IMPLEMENT THESE SIX MATRIX FUNCTIONS.  //
//  EACH FUNCTION SHOULD RETURN AN ARRAY WITH 16 VALUES.             //
//                                                                   //
//  SINCE YOU ALREADY DID THIS FOR THE PREVIOUS ASSIGNMENT,          //
//  YOU CAN JUST USE THE FUNCTION DEFINITIONS YOU ALREADY CREATED.   //
//                                                                   //
 /////////////////////////////////////////////////////////////////////





  
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
  
//   let getRow = (matrix, row) => {
//       return [ matrix[row], matrix[row + 4], matrix[row + 8], matrix[row + 12] ]
//   }
  
//   let getColumn = (matrix, column) => {
//       column = column * 4;
//       return [ matrix[column], matrix[column + 1], matrix[column + 2], matrix[column + 3] ];
//   }
  
//   let dotProduct = (row, column) => {
//       return (row[0] * column[0] + row[1] * column[1] + row[2] * column[2] + row[3] * column[3]);
//   }
  
//   let multiply = (matrix, other) => {
//       let result = [];
//       for (let column = 0; column < 4; column++) {
//           for (let row = 0; row < 4; row++ ) {
//               result.push(dotProduct(getRow(matrix, row), getColumn(other, column)));
//           }
//       }
//       return result;
//   }
  


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

let multiply = (a, b) => {
   let c = [];
   for (let n = 0 ; n < 16 ; n++)
      c.push( a[n&3     ] * b[    n&12] +
              a[n&3 |  4] * b[1 | n&12] +
              a[n&3 |  8] * b[2 | n&12] +
              a[n&3 | 12] * b[3 | n&12] );
   return c;
}

let Matrix = function() {
   let topIndex = 0,
       stack = [ identity() ],
       getVal = () => stack[topIndex],
       setVal = m => stack[topIndex] = m;

   this.identity  = ()      => setVal(identity());
   this.restore   = ()      => --topIndex;
   this.rotateX   = t       => setVal(multiply(getVal(), rotateX(t)));
   this.rotateY   = t       => setVal(multiply(getVal(), rotateY(t)));
   this.rotateZ   = t       => setVal(multiply(getVal(), rotateZ(t)));
   this.save      = ()      => stack[++topIndex] = stack[topIndex-1].slice();
   this.scale     = (x,y,z) => setVal(multiply(getVal(), scale(x,y,z)));
   this.translate = (x,y,z) => setVal(multiply(getVal(), translate(x,y,z)));
   this.value     = ()      => getVal();
}

function onStartFrame(t, state) {

    state.color0 = [1,.5,.2];


    // uTime IS TIME IN SECONDS SINCE START TIME.

    if (!state.tStart)
        state.tStart = t;
    state.time = (t - state.tStart) / 1000;

    gl.uniform1f (state.uTimeLoc  , state.time);


    // uCursor WILL GO FROM -1 TO +1 IN xy, WITH z = 0 FOR MOUSE UP, 1 FOR MOUSE DOWN.

    let cursorValue = () => {
       let p = state.cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }

    gl.uniform3fv(state.uCursorLoc, cursorValue());


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
}

let phase = {
    count: 0,
    value: 1,
    directionUp: true,
    deltaTheta: 0,
    theta: 0,
    increase: function() {
        this.count++;
    },
    isDirectionDifferent: function() {
        if (!this.directionUp && this.deltaTheta > 0) {
            this.directionUp = true;
            return true;
        }
        if (this.directionUp && this.deltaTheta < 0) {
            this.directionUp = false;
            return true;
        }
        return false;

    },
    set: function() {
        if (this.count %2 == 0) {
            this.value = -1;
        } else {
            this.value = 1;
        }
    },
    check: function(theta) {
        this.deltaTheta = theta - this.theta;
        this.theta = theta;
        if (this.isDirectionDifferent()) {
            console.log(this);
            this.count++;
            this.set();
        }
        return this.value;
    }
}

let armPhase = phase;

function onDraw(t, projMat, viewMat, state, eyeIdx) {

    let m = state.m;

    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));


 //////////////////////////////////////////////////////////////////////
//                                                                    //
//  THIS IS THE EXAMPLE OF TWO WAVING ARMS THAT WE CREATED IN CLASS.  //
//  FOR HOMEWORK, YOU WILL WANT TO DO SOMETHING DIFFERENT.            //
//                                                                    //
 //////////////////////////////////////////////////////////////////////

    m.save();
    m.identity();
    m.translate(0,0,-6);

    m.save(); // hips
        m.translate(0, .5 - Math.sin(state.time * 6) * .4, 0);
        m.rotateY( Math.sin(3 * state.time) *.2);
        
        
        m.save() // spine

            m.rotateX(.1 - Math.sin(1.5 * state.time) *.1);
            
            m.rotateZ( Math.sin(-3 * state.time) *.1);
            

            m.save() // torso
                m.rotateX(.2 - Math.sin(3 * state.time) *.1);
                m.rotateY( Math.sin(3 * state.time) *.1);

            

                m.save() // head
                    m.translate(0,1.1,0);
                    m.rotateZ( Math.sin(3 * state.time) *.2);
                    
                    m.scale(.2,.2,.1);
                    drawGeometry();
                m.restore()
        
         

                for (let side = -1 ; side <= 1 ; side += 2) {
                let theta = Math.sin(3 * state.time) * side;
                //    console.log(theta);
                //    console.log(phase.check());
                // armPhase.check(theta);
                    m.save();
                    m.translate(side * .4,.7,0);
                    m.rotateZ(theta);               // SHOULDER
                    m.rotateY(-side + .5 * theta);
                    m.translate(side * .3,0,0);
                    m.save();
                        m.scale(.3,.05,.05);
                        drawGeometry();
                    m.restore();
                    m.translate(side * .3,0,0);
                    m.rotateZ(theta);              // ELBOW
                    m.translate(side * .3,0,0);
                    m.save();
                        m.scale(.3,.05,.05);
                        
                        drawGeometry();
                    m.restore();
                    m.restore();
                    m.save();
                }
            
            m.rotateY( Math.sin(3 * state.time) *.1);
            m.translate(0,.5,0);   
            m.scale(.3,.3,.2);
            
            drawGeometry();
            m.restore();
        
        
        m.translate(0, .15, 0);
        m.scale(.1,.05,.1);
        drawGeometry();
    m.restore();
    
    m.rotateZ( Math.sin(3 * state.time) *.3);

    for (let side = -1 ; side <= 1 ; side += 2) {
        let theta = Math.sin(3 * state.time) * side;
     
        m.save();
        m.translate(side * .25,0,0);
        m.rotateY(3.14 * .5);
        m.rotateZ(theta - .3 ); // leg
        m.rotateZ(-side * 3.14 * .5 ) ;
        m.translate(side * .5,0,0);
        m.save();
          
          m.scale(.4,.05,.05);
          drawGeometry();
        m.restore();
        m.translate(side * .4,0,0);
        m.rotateZ(1. + theta* .4);              // calf
        m.translate(side * .4,0,0);
        m.save();
          m.scale(.45,.05,.05);
          drawGeometry();
        m.restore();
      m.restore();
      m.save();

       m.restore();
       
    }

    


    m.scale(.2,.05,.1,);
    
    drawGeometry();
    m.restore();

    m.restore();

    function drawGeometry() {
        gl.uniform3fv(state.uColorLoc, state.color0);
        gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
        gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / VERTEX_SIZE);
    }
}

function onEndFrame(t, state) {
}

export default function main() {
    const def = {
        name         : 'week5',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
