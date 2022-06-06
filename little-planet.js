import Program from "./webgl-program.js";
import { vs, fs } from "./shaders.js";


const RAD = Math.PI / 180;
const QUAD = new Float32Array([1, -1, -1, -1, 1, 1, -1, 1]);
const ATTRIBUTES = ["src", "width", "height"];

function createTexture(src, gl) {
	let texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
//	gl.generateMipmap(gl.TEXTURE_2D);
	return texture;
}

function createTextures(img, gl) {
	let tmp = document.createElement("canvas");
	tmp.width = img.naturalWidth/2;
	tmp.height = img.naturalHeight;
	let ctx = tmp.getContext("2d");

	ctx.drawImage(img, 0, 0);
	gl.activeTexture(gl.TEXTURE0);
	createTexture(tmp, gl);

	ctx.drawImage(img, -tmp.width, 0);
	gl.activeTexture(gl.TEXTURE1);
	createTexture(tmp, gl);
}

function loadImage(src) {
	return new Promise((resolve, reject) => {
		let image = new Image();
		image.src = src;
		image.onload = e => resolve(e.target);
		image.onerror = reject;
	});
}

function createContext(canvas) {
	const gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); // to allow canvas save-as

	let program = new Program(gl, {vs, fs});
	program.use();

	Object.values(program.attribute).forEach(a => a.enable());
	program.uniform.texLeft.set(0);
	program.uniform.texRight.set(1);
	program.uniform.hfov.set(120 * RAD);
	program.uniform.outside_inside_mix.set(0);

	let buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
	program.attribute.position.pointer(2, gl.FLOAT, false, 0, 0);

	return { gl, program };
}

export default class LittlePlanet extends HTMLElement {
	static observedAttributes = ATTRIBUTES;

	#dirty = false;
	#loaded = false;
	#camera = {
		lat: 0,
		lon: 0,
		hfov: 120
	}

	constructor(options) {
		super();

		const canvas = document.createElement("canvas");
		const { gl, program } = createContext(canvas);

		this.options = options;
		this.program = program;
		this.gl = gl;

		this.append(canvas);
	}

	get canvas() { return this.gl.canvas; }

	async attributeChangedCallback(name, oldValue, newValue) {
		const { gl, program, canvas } = this;

		switch (name) {
			case "width":
			case "height":
				canvas.setAttribute(name, newValue);
				let port = [canvas.width, canvas.height];
				gl.viewport(0, 0, ...port);
				program.uniform.port.set(port);
				this.#changed();
			break;

			case "src":
				this.#loaded = false;
				try {
					let image = await loadImage(newValue);
					createTextures(image, gl);
					this.#loaded = true;
					this.#render();
					this.dispatchEvent(new CustomEvent("load"));
				} catch (e) {
					this.dispatchEvent(new CustomEvent("error", {detail:e}));
				}
			break;
		}
	}

	get camera() { return this.#camera; }
	set camera(camera) {
		Object.assign(this.#camera, camera);
		this.#changed();
	}

	#changed() {
		if (this.#dirty || !this.#loaded) { return; }
		this.#dirty = true;
		requestAnimationFrame(() => this.#render());
	}

	#render() {
		const { gl, program } = this;

		let min = 0.2;
		let max = 1;
		let sin = Math.sin(performance.now() / 1000);

//		this.options.3 = min + (sin+1)/2 * (max - min);
//		this.options.altitude = 0.5;
//		this.options.altitude = 4 / Math.PI;

		let uniforms = {
			hfov: this.#camera.hfov * RAD,
			camera: [this.#camera.lon*RAD, this.#camera.lat*RAD]
		}

		console.log("render", uniforms);

		for (let name in uniforms) {
			program.uniform[name].set(uniforms[name]);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		this.#dirty = false;
	}

	// dom/attribute reflection

	get width() { return this.canvas.getAttribute("width"); }
	set width(width) { return this.setAttribute("width", width); }

	get height() { return this.canvas.getAttribute("height"); }
	set height(height) { return this.setAttribute("height", height); }

	get src() { return this.getAttribute("src"); }
	set src(src) { return this.setAttribute("src", src); }
}

customElements.define("little-planet", LittlePlanet);
