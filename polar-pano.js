import Program from "./webgl-program.js";
import { VS, FS } from "./shaders.js";


const RAD = Math.PI / 180;
const QUAD = new Float32Array([1, -1, -1, -1, 1, 1, -1, 1]);

function getScale(scale) {
	switch (scale) {
		case "linear": return "";
		case "atan": return "dist = atan(dist)";
		case "tan": return "dist = tan(dist) / (PI / 2.)";
		case "pow1.2": return "dist = pow(dist, 1.2)";
		case "pow1.5": return "dist = pow(dist, 1.5)";
		case "test1": return "dist = atan(dist) * height";
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

function loadImage(src) {
	return new Promise((resolve, reject) => {
		let image = new Image();
		image.src = src;
		image.onload = e => resolve(e.target);
		image.onerror = reject;
	});
}

function createContext(canvas, options) {
	const gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); // to allow canvas save-as

	let vs = VS;
	let fs = FS.replace("{scale}", getScale(options.scale));
	let program = new Program(gl, {vs, fs});
	program.use();

	Object.values(program.attribute).forEach(a => a.enable());
	program.uniform.texLeft.set(0);
	program.uniform.texRight.set(1);

	let buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
	program.attribute.position.pointer(2, gl.FLOAT, false, 0, 0);

	return { gl, program };
}

export default class PolarPano extends HTMLElement {
	static observedAttributes = ["src", "width", "height"];

	constructor(options) {
		super();

		const canvas = document.createElement("canvas");
		const { gl, program} = createContext(canvas, options);

		this.options = options;
		this.program = program;
		this.gl = gl;

		this.append(canvas);
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		const { gl, program } = this;

		switch (name) {
			case "width":
			case "height":
				gl.canvas.setAttribute(name, newValue);
				let port = [gl.canvas.width, gl.canvas.height];
				gl.viewport(0, 0, ...port);
				program.uniform.port.set(port);
				this.#tick();
			break;

			case "src":
				try {
					let image = await loadImage(newValue);
					createTextures(image, this.options, this.gl);
					this.dispatchEvent(new CustomEvent("load"));
					this.#tick();
				} catch (e) {
					this.dispatchEvent(new CustomEvent("error", {detail:e}));
				}
			break;
		}
	}

	#tick() {
		let min = 0.2;
		let max = 1;
		let sin = Math.sin(performance.now() / 1000);

		this.options.height = min + (sin+1)/2 * (max - min);
		this.options.height = 0.5;
		this.#render();
		requestAnimationFrame(() => this.#tick());
	}

	set camera(options) {
		Object.assign(this.options, options);
	}

	#render() {
		const { gl, program, options } = this;
//		console.log("render", options);

		program.uniform.height && program.uniform.height.set(options.height);
		program.uniform.hfov.set(options.hfov * RAD);
		program.uniform.camera.set([options.cameraX*RAD, options.cameraY*RAD]);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	// dom/attribute reflection

	get width() { return this.gl.canvas.getAttribute("width"); }
	set width(width) { return this.setAttribute("width", width); }

	get height() { return this.gl.canvas.getAttribute("height"); }
	set height(height) { return this.setAttribute("height", height); }

	get src() { return this.getAttribute("src"); }
	set src(src) { return this.setAttribute("src", src); }
}

customElements.define("polar-pano", PolarPano);
