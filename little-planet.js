import Program from "./webgl-program.js";
import { vs, fs } from "./shaders.js";


const RAD = Math.PI / 180;
const QUAD = new Float32Array([1, -1, -1, -1, 1, 1, -1, 1]);
const ATTRIBUTES = ["src", "width", "height", "inert"];
const HFOV_RANGE = [50, 120];
const LAT_RANGE = [-90, 90];
const DEFAULT_PANO_HFOV = (HFOV_RANGE[0]+HFOV_RANGE[1])/2;
const DEFAULT_PLANET_FOV = 240;


function pointerDistance(p1, p2) {
	let dx = p2.x-p1.x;
	let dy = p2.y-p1.y;
	return Math.sqrt(dx**2, dy**2);
}

function createTexture(src, gl) {
	let texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
	let buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
	program.attribute.position.pointer(2, gl.FLOAT, false, 0, 0);

	program.uniform.texLeft.set(0);
	program.uniform.texRight.set(1);

	program.uniform.pano_hfov.set(DEFAULT_PANO_HFOV * RAD);
	program.uniform.planet_fov.set(DEFAULT_PLANET_FOV * RAD);
	program.uniform.planet_pano_mix.set(0);

	return { gl, program };
}

export default class LittlePlanet extends HTMLElement {
	static observedAttributes = ATTRIBUTES;

	#dirty = false;
	#image = null;
	#camera = {
		lat: 0,
		lon: 0,
		hfov: DEFAULT_PANO_HFOV
	}
	#pointers = [];
	#originalCamera = null;

	constructor(options = {}) {
		super();

		const canvas = document.createElement("canvas");
		const { gl, program } = createContext(canvas);

		this.program = program;
		this.gl = gl;

		this.append(canvas);

//		this.addEventListener("pointerdown", e => this.#transition());

		this.addEventListener("pointerdown", e => this.#onPointerDown(e));
		this.addEventListener("pointerup", e => this.#onPointerUp(e));
		this.addEventListener("pointermove", e => this.#onPointerMove(e));
		this.addEventListener("wheel", e => this.#onWheel(e));

		Object.assign(this, options);
	}

	get canvas() { return this.gl.canvas; }
	get planetSize() { return this.#image ? 2*this.#image.naturalHeight : null; }

	get camera() { return this.#camera; }
	set camera(camera) {
		Object.assign(this.#camera, camera);
		this.#camera.hfov = Math.min(Math.max(this.#camera.hfov, HFOV_RANGE[0]), HFOV_RANGE[1]);
		this.#camera.lat = Math.min(Math.max(this.#camera.lat, LAT_RANGE[0]), LAT_RANGE[1]);

		this.#changed();
	}

	#onPointerDown(e) {
		if (this.inert) { return; }

		// FIXME start transition
		this.#transition();
		return;

		this.#pointers.push(e);
		if (this.#pointers.length == 1) {
			this.#originalCamera = Object.assign({}, this.#camera);
			this.setPointerCapture(e.pointerId);
		}
	}

	#onPointerUp(e) {
		if (this.inert) { return; }

		if (this.#pointers.length == 1) {
			this.releasePointerCapture(e.pointerId);
		}
		this.#pointers = this.#pointers.filter(pointer => pointer.pointerId != e.pointerId);
	}

	#onPointerMove(e) {
		if (this.inert) { return; }

		const pointers = this.#pointers;

		switch (pointers.length) {
			case 2: // zoom/fov
				let oldDist = pointerDistance(pointers[0], pointers[1]);
				pointers.forEach((p, i) => {
					if (p.pointerId == e.pointerId) { pointers[i] = e; }
				});
				let newDist = pointerDistance(pointers[0], pointers[1]);
				let diff = newDist - oldDist;
				this.camera = { hfov: this.#camera.hfov + diff * -0.1 };

			break;
			case 1: // pan
				let dx = e.x - this.#pointers[0].x;
				let dy = e.y - this.#pointers[0].y;

				let anglePerPixel = this.#camera.hfov / this.clientWidth;
				let dlon = dx * anglePerPixel;
				let dlat = dy * anglePerPixel;

				this.camera = {
					lon: this.#originalCamera.lon - dlon,
					lat: this.#originalCamera.lat + dlat
				}
			break;
		}
	}

	#onWheel(e) {
		if (this.inert) { return; }

		e.preventDefault();
		let fovDelta = e.deltaY * 0.05;
		this.camera = { hfov: this.#camera.hfov + fovDelta };
	}

	#transition() {
		const duration = 2000;
		const descendStop = 0.9;
		const rotateStart = 0.6;
		let startTime = performance.now();

		let step = () => {
			let time = performance.now();
			let phase = (time-startTime) / duration;

			let uniforms = {};

			if (phase < descendStop) {
				let frac = phase / descendStop;
				uniforms.planet_pano_mix = frac;
			} else {
				uniforms.planet_pano_mix = 1;
			}

			if (phase < rotateStart) {
				uniforms.rotation = [0, 0];
			} else {
				let frac = (phase-rotateStart)/(1-rotateStart);
				frac = frac*frac;
				uniforms.rotation = [0, frac*90*RAD];
			}

			this.#render(uniforms);
			if (phase < 1) { requestAnimationFrame(step); }
		}
		requestAnimationFrame(step);
	}

	#changed() {
		if (this.#dirty || !this.#image) { return; }
		this.#dirty = true;
		requestAnimationFrame(() => this.#render());
	}

	#render(forceUniforms = {}) {
		const { gl, program } = this;

		let uniforms = {
			pano_hfov: this.#camera.hfov * RAD,
			rotation: [this.#camera.lon*RAD, (90+this.#camera.lat)*RAD]
		}
		Object.assign(uniforms, forceUniforms);

		for (let name in uniforms) {
			program.uniform[name] && program.uniform[name].set(uniforms[name]);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		this.#dirty = false;
	}

	// dom/attribute reflection

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
				this.#image = null;
				try {
					this.#image = await loadImage(newValue);
					createTextures(this.#image, gl);
					this.#render();
					this.dispatchEvent(new CustomEvent("load"));
				} catch (e) {
					this.dispatchEvent(new CustomEvent("error", {detail:e}));
				}
			break;
		}
	}

	get width() { return this.canvas.getAttribute("width"); }
	set width(width) { return this.setAttribute("width", width); }

	get height() { return this.canvas.getAttribute("height"); }
	set height(height) { return this.setAttribute("height", height); }

	get src() { return this.getAttribute("src"); }
	set src(src) { return this.setAttribute("src", src); }

	get inert() { return this.hasAttribute("inert"); }
	set inert(inert) { return inert ? this.setAttribute("inert", "") : this.removeAttribute("inert"); }
}

customElements.define("little-planet", LittlePlanet);
