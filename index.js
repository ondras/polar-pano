const file = document.querySelector("[type=file]");
const source = document.querySelector("#source img");
const scene = document.querySelector("#target little-planet");
const form = document.querySelector("#options form");

function updateCamera() {
	let camera = {
		hfov: target.querySelector("[name=hfov]").valueAsNumber,
		lon: target.querySelector("[name=lon]").valueAsNumber,
		lat: target.querySelector("[name=lat]").valueAsNumber
	};
	scene.camera = camera;
}

function pair(selector, callback) {
	let node = form.querySelector(selector);
	node.addEventListener("change", e => callback(e.target));
	callback(node);
}

//pair("[name=altitude]", input => scene.altitude = Number(input.value));

source.addEventListener("load", e => {
	let image = e.target;
	let size = 2*image.naturalHeight;
	scene.width = scene.height = size;
	scene.src = image.src;
});

[...target.querySelectorAll("input")].forEach(i => i.addEventListener("input", updateCamera));

file.addEventListener("change", e => {
	let f = e.target.files[0];
	if (!f) { return; }
	source.src = URL.createObjectURL(f);
})

source.src = "sample.jpg"; // demo
//source.src = "canvas.png"; // demo
