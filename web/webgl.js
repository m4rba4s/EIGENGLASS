/* ============================================================
   AXIOM Engine — WebGL 3D Visualization
   Raw WebGL implementation, no external libraries.
   ============================================================ */

const WebGLApp = (function() {
    'use strict';

    let gl;
    let programInfo;
    let buffers;
    let attractorBuffers;
    let canvas;

    // Orbit controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngleX = 0.5;
    let cameraAngleY = 0.5;
    let cameraDistance = 15.0;

    const GRID_RANGE = 5;

    // Simple mat4 library
    const mat4 = {
        create: function() {
            return new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
        },
        multiply: function(out, a, b) {
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

            let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
            out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
            out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
            out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
            out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

            b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
            out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
            out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
            out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
            out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

            b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
            out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
            out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
            out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
            out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

            b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
            out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
            out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
            out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
            out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
            return out;
        },
        perspective: function(out, fovy, aspect, near, far) {
            let f = 1.0 / Math.tan(fovy / 2);
            let nf = 1 / (near - far);
            out[0] = f / aspect;
            out[1] = 0;
            out[2] = 0;
            out[3] = 0;
            out[4] = 0;
            out[5] = f;
            out[6] = 0;
            out[7] = 0;
            out[8] = 0;
            out[9] = 0;
            out[10] = (far + near) * nf;
            out[11] = -1;
            out[12] = 0;
            out[13] = 0;
            out[14] = (2 * far * near) * nf;
            out[15] = 0;
            return out;
        },
        lookAt: function(out, eye, center, up) {
            let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
            let eyex = eye[0];
            let eyey = eye[1];
            let eyez = eye[2];
            let upx = up[0];
            let upy = up[1];
            let upz = up[2];
            let centerx = center[0];
            let centery = center[1];
            let centerz = center[2];

            z0 = eyex - centerx;
            z1 = eyey - centery;
            z2 = eyez - centerz;
            len = 1 / Math.hypot(z0, z1, z2);
            z0 *= len; z1 *= len; z2 *= len;

            x0 = upy * z2 - upz * z1;
            x1 = upz * z0 - upx * z2;
            x2 = upx * z1 - upy * z0;
            len = Math.hypot(x0, x1, x2);
            if (!len) {
                x0 = 0; x1 = 0; x2 = 0;
            } else {
                len = 1 / len;
                x0 *= len; x1 *= len; x2 *= len;
            }

            y0 = z1 * x2 - z2 * x1;
            y1 = z2 * x0 - z0 * x2;
            y2 = z0 * x1 - z1 * x0;

            out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
            out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
            out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
            out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
            out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
            out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
            out[15] = 1;
            return out;
        }
    };

    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        varying lowp vec4 vColor;
        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;
        }
    `;

    const fsSource = `
        varying lowp vec4 vColor;
        void main(void) {
            gl_FragColor = vColor;
        }
    `;

    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    function buildGrid() {
        const positions = [];
        const colors = [];

        function addLine(x1, y1, z1, x2, y2, z2, r, g, b, a) {
            positions.push(x1, y1, z1, x2, y2, z2);
            colors.push(r, g, b, a, r, g, b, a);
        }

        const gridColor = [0.39, 0.51, 0.75, 0.15]; // Subtle blue

        // XZ Grid (Ground)
        for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
            if (i === 0) continue;
            addLine(i, 0, -GRID_RANGE, i, 0, GRID_RANGE, ...gridColor);
            addLine(-GRID_RANGE, 0, i, GRID_RANGE, 0, i, ...gridColor);
        }
        
        // XY Grid (Wall)
        for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
            if (i === 0) continue;
            addLine(i, -GRID_RANGE, 0, i, GRID_RANGE, 0, ...gridColor);
            addLine(-GRID_RANGE, i, 0, GRID_RANGE, i, 0, ...gridColor);
        }

        // Basis Vectors (Thicker visually handled via multiple lines or just bright)
        // X Axis - Red
        addLine(0, 0, 0, GRID_RANGE, 0, 0, 1.0, 0.2, 0.2, 1.0);
        addLine(0, 0, 0, -GRID_RANGE, 0, 0, 1.0, 0.2, 0.2, 0.3); // negative axis faded
        
        // Y Axis - Green
        addLine(0, 0, 0, 0, GRID_RANGE, 0, 0.2, 1.0, 0.2, 1.0);
        addLine(0, 0, 0, 0, -GRID_RANGE, 0, 0.2, 1.0, 0.2, 0.3);
        
        // Z Axis - Blue
        addLine(0, 0, 0, 0, 0, GRID_RANGE, 0.2, 0.4, 1.0, 1.0);
        addLine(0, 0, 0, 0, 0, -GRID_RANGE, 0.2, 0.4, 1.0, 0.3);

        return {
            positions: new Float32Array(positions),
            colors: new Float32Array(colors),
            count: positions.length / 3
        };
    }

    function initBuffers(gl) {
        const grid = buildGrid();

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, grid.positions, gl.STATIC_DRAW);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, grid.colors, gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            color: colorBuffer,
            vertexCount: grid.count
        };
    }

    function initAttractorBuffers(gl) {
        const positionBuffer = gl.createBuffer();
        const colorBuffer = gl.createBuffer();
        return {
            position: positionBuffer,
            color: colorBuffer
        };
    }

    // Controls
    function setupControls() {
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.offsetX, y: e.offsetY };
        });
        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaMove = {
                x: e.offsetX - previousMousePosition.x,
                y: e.offsetY - previousMousePosition.y
            };
            cameraAngleX += deltaMove.x * 0.01;
            cameraAngleY -= deltaMove.y * 0.01;
            // Clamp pitch
            cameraAngleY = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraAngleY));
            previousMousePosition = { x: e.offsetX, y: e.offsetY };
        });
        window.addEventListener('mouseup', () => { isDragging = false; });
        canvas.addEventListener('wheel', (e) => {
            cameraDistance += e.deltaY * 0.01;
            cameraDistance = Math.max(5.0, Math.min(30.0, cameraDistance));
            e.preventDefault();
        });
    }

    return {
        init: function(canvasElement) {
            canvas = canvasElement;
            gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                console.error("WebGL not supported");
                return false;
            }

            const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
            programInfo = {
                program: shaderProgram,
                attribLocations: {
                    vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                    vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
                },
                uniformLocations: {
                    projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                    modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                },
            };

            buffers = initBuffers(gl);
            attractorBuffers = initAttractorBuffers(gl);
            setupControls();
            
            // Initial clear color (dark space)
            gl.clearColor(0.04, 0.055, 0.09, 1.0); 
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);

            // Enable alpha blending
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            return true;
        },

        render: function(matrix3x3) {
            if (!gl) return;

            const width = canvas.clientWidth * (window.devicePixelRatio || 1);
            const height = canvas.clientHeight * (window.devicePixelRatio || 1);
            
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            }

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            const fieldOfView = 45 * Math.PI / 180;
            const aspect = gl.canvas.width / gl.canvas.height;
            const zNear = 0.1;
            const zFar = 100.0;
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

            const camX = cameraDistance * Math.cos(cameraAngleY) * Math.sin(cameraAngleX);
            const camY = cameraDistance * Math.sin(cameraAngleY);
            const camZ = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
            
            const viewMatrix = mat4.create();
            mat4.lookAt(viewMatrix, [camX, camY, camZ], [0, 0, 0], [0, 1, 0]);

            // Apply the 3x3 transformation
            const modelMatrix = mat4.create();
            modelMatrix[0] = matrix3x3[0]; modelMatrix[4] = matrix3x3[1]; modelMatrix[8] = matrix3x3[2];
            modelMatrix[1] = matrix3x3[3]; modelMatrix[5] = matrix3x3[4]; modelMatrix[9] = matrix3x3[5];
            modelMatrix[2] = matrix3x3[6]; modelMatrix[6] = matrix3x3[7]; modelMatrix[10] = matrix3x3[8];
            // Translation column is 0, scale W is 1.

            const modelViewMatrix = mat4.create();
            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

            // Draw
            {
                const numComponents = 3;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
                gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
                gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
            }

            {
                const numComponents = 4;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
                gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, numComponents, type, normalize, stride, offset);
                gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
            }

            gl.useProgram(programInfo.program);
            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

            gl.drawArrays(gl.LINES, 0, buffers.vertexCount);
        },

        renderAttractor: function(positions, colors) {
            if (!gl) return;

            const width = canvas.clientWidth * (window.devicePixelRatio || 1);
            const height = canvas.clientHeight * (window.devicePixelRatio || 1);
            
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            }

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            const fieldOfView = 45 * Math.PI / 180;
            const aspect = gl.canvas.width / gl.canvas.height;
            const zNear = 0.1;
            const zFar = 200.0;
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

            // Orbit camera
            const camX = cameraDistance * Math.cos(cameraAngleY) * Math.sin(cameraAngleX);
            const camY = cameraDistance * Math.sin(cameraAngleY);
            const camZ = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
            const viewMatrix = mat4.create();
            mat4.lookAt(viewMatrix, [camX, camY, camZ], [0, 0, 0], [0, 1, 0]);

            const modelMatrix = mat4.create(); // Identity

            const modelViewMatrix = mat4.create();
            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

            // Update Dynamic Buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, attractorBuffers.position);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, attractorBuffers.color);
            gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);

            // Draw Attractor
            {
                const numComponents = 3;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, attractorBuffers.position);
                gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
                gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
            }

            {
                const numComponents = 4;
                const type = gl.FLOAT;
                const normalize = false;
                const stride = 0;
                const offset = 0;
                gl.bindBuffer(gl.ARRAY_BUFFER, attractorBuffers.color);
                gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, numComponents, type, normalize, stride, offset);
                gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
            }

            gl.useProgram(programInfo.program);
            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

            gl.drawArrays(gl.LINE_STRIP, 0, positions.length / 3);
        }
    };
})();
