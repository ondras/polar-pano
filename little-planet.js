import Program from "./webgl-program.js";
import { vs, fs } from "./shaders.js";


const RAD = Math.PI / 180;
const QUAD = new Float32Array([1, -1, -1, -1, 1, 1, -1, 1]);
const ATTRIBUTES = ["src", "width", "height", "projection", "altitude"];

function createTexture(src, gl) {
	let texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
	gl.generateMipmap(gl.TEXTURE_2D);
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

	let buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
	program.attribute.position.pointer(2, gl.FLOAT, false, 0, 0);

	return { gl, program };
}

export default class LittlePlanet extends HTMLElement {
	static observedAttributes = ATTRIBUTES;

	constructor(options) {
		super();

		const canvas = document.createElement("canvas");
		const { gl, program} = createContext(canvas);

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
					createTextures(image, this.gl);
					this.dispatchEvent(new CustomEvent("load"));
					this.#tick();
				} catch (e) {
					this.dispatchEvent(new CustomEvent("error", {detail:e}));
				}
			break;

			case "projection":
				this.#tick();
			break;
		}
	}

	#tick() {
		let min = 0.2;
		let max = 1;
		let sin = Math.sin(performance.now() / 1000);

		this.options.altitude = min + (sin+1)/2 * (max - min);
		this.options.altitude = 0.5;
//		this.options.altitude = 4 / Math.PI;

		let uniforms = {
			altitude: Number(this.getAttribute("altitude")) || 1,
			is_polar: (this.getAttribute("projection") == "polar"),
			hfov: this.options.hfov * RAD,
			camera: [this.options.cameraX*RAD, this.options.cameraY*RAD]
		}
		this.#render(uniforms);
//		requestAnimationFrame(() => this.#tick());
	}

	set camera(options) {
		Object.assign(this.options, options);
		this.#tick();
	}

	#render(uniforms) {
		const { gl, program } = this;
		console.log("render", uniforms);

		for (let name in uniforms) {
			program.uniform[name].set(uniforms[name]);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	// dom/attribute reflection

	get width() { return this.gl.canvas.getAttribute("width"); }
	set width(width) { return this.setAttribute("width", width); }

	get height() { return this.gl.canvas.getAttribute("height"); }
	set height(height) { return this.setAttribute("height", height); }

	get src() { return this.getAttribute("src"); }
	set src(src) { return this.setAttribute("src", src); }

	get projection() { return this.getAttribute("projection"); }
	set projection(projection) { return this.setAttribute("projection", projection); }

	get altitude() { return this.getAttribute("altitude"); }
	set altitude(altitude) { return this.setAttribute("altitude", altitude); }
}

customElements.define("little-planet", LittlePlanet);
