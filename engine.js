import Program from "./webgl-program.js";
import { VS, FS } from "./shaders.js";

function getScale(scale) {
	switch (scale) {
		case "linear": return "";
		case "atan": return "dist = atan(dist)";
		case "tan": return "dist = tan(dist) / (PI / 2.)";
		case "pow1.2": return "dist = pow(dist, 1.2)";
		case "pow1.5": return "dist = pow(dist, 1.5)";
		default: throw new Error(`Unknown scale "${scale}"`);
	}
}

function getFilter(filter, gl) {
	switch (filter) {
		case "nearest": return gl.NEAREST;
		case "linear": return gl.LINEAR;
		case "nearest-mipmap-nearest": return gl.NEAREST_MIPMAP_NEAREST;
		case "nearest-mipmap-linear": return gl.NEAREST_MIPMAP_LINEAR;
		case "linear-mipmap-nearest": return gl.LINEAR_MIPMAP_NEAREST;
		case "linear-mipmap-linear": return gl.LINEAR_MIPMAP_LINEAR;
		default: throw new Error(`Unknown filter "${filter}"`);
	}
}

function createTexture(src, filter, gl) {
	let texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
	gl.generateMipmap(gl.TEXTURE_2D);
	return texture;
}

function createTextures(img, options, gl) {
	let tmp = document.createElement("canvas");
	tmp.width = img.naturalWidth/2;
	tmp.height = img.naturalHeight;
	let ctx = tmp.getContext("2d");

	let filter = getFilter(options.filter, gl);

	ctx.drawImage(img, 0, 0);
	gl.activeTexture(gl.TEXTURE0);
	createTexture(tmp, filter, gl);

	ctx.drawImage(img, -tmp.width, 0);
	gl.activeTexture(gl.TEXTURE1);
	createTexture(tmp, filter, gl);
}

export function process(image, options) {
	console.log("process", options)

	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 2*image.naturalHeight;

	const gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); // to allow canvas save-as

	let vs = VS;
	let fs = FS.replace("{scale}", getScale(options.scale));
	let program = new Program(gl, {vs, fs});
	program.use();

	let buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

	createTextures(image, options, gl);

	Object.values(program.attribute).forEach(a => a.enable());
	program.attribute.position.pointer(2, gl.FLOAT, false, 0, 0);
	program.uniform.texLeft.set(0);
	program.uniform.texRight.set(1);
	program.uniform.port.set([canvas.width, canvas.height]);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	return canvas;
}

const QUAD = new Float32Array([1, -1, -1, -1, 1, 1, -1, 1]);
