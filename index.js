import LittlePlanet from "./little-planet.js";


const file = document.querySelector("[type=file]");
const source = document.querySelector("#source img");
const target = document.querySelector("#target");
const form = document.querySelector("#options form");
let scene;

function collectOptions() {
	return {
		projection: form.querySelector("[name=projection]").value,
		hfov: target.querySelector("[name=hfov]").valueAsNumber,
		cameraX: target.querySelector("[name=cameraX]").valueAsNumber,
		cameraY: target.querySelector("[name=cameraY]").valueAsNumber
	};
}

function createScene() {
	let options = collectOptions();

	[...target.querySelectorAll("little-planet")].forEach(c => c.remove());
	scene = new LittlePlanet(options);
	target.append(scene);

	let size = 2*source.naturalHeight;
	scene.width = scene.height = size;
	scene.src = source.src;
//	scene.projection = options.projection;
	scene.setAttribute("projection", options.projection);
	scene.setAttribute("altitude", form.querySelector("[name=altitude]").value);
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
