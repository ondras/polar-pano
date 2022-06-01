import PolarPano from "./polar-pano.js";


const file = document.querySelector("[type=file]");
const source = document.querySelector("#source img");
const target = document.querySelector("#target");
const form = document.querySelector("#options form");
let scene;

function collectOptions() {
	return {
		filter: form.querySelector("[name=filter]").value,
		scale: form.querySelector("[name=scale]").value,
		hfov: target.querySelector("[name=hfov]").valueAsNumber,
		cameraX: target.querySelector("[name=cameraX]").valueAsNumber,
		cameraY: target.querySelector("[name=cameraY]").valueAsNumber
	};
}

function createScene() {
	let options = collectOptions();

	[...target.querySelectorAll("pano-scene")].forEach(c => c.remove());
	scene = new PolarPano(options);
	target.append(scene);

	let size = 2*source.naturalHeight;
	scene.setAttribute("width", size);
	scene.setAttribute("height", size);
	scene.setAttribute("src", source.src);

}

function updateCamera() {
	let options = collectOptions();
	scene.camera = options;
}

source.addEventListener("load", createScene);
[...form.elements].forEach(e => e.addEventListener("change", createScene));

[...target.querySelectorAll("input")].forEach(i => i.addEventListener("input", updateCamera));

file.addEventListener("change", e => {
	let f = e.target.files[0];
	if (!f) { return; }
	source.src = URL.createObjectURL(f);
})

source.src = "sample.jpg"; // demo
//source.src = "canvas-big.png"; // demo
