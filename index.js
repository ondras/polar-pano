import * as engine from "./engine.js";

const file = document.querySelector("[type=file]");
const source = document.querySelector("#source img");
const target = document.querySelector("#target");
const form = document.querySelector("#options form");

function collectOptions() {
	return {
		filter: form.querySelector("[name=filter]").value,
		scale: form.querySelector("[name=scale]").value
	};
}

function go() {
	let options = collectOptions();

	[...target.querySelectorAll("canvas")].forEach(c => c.remove());
	let canvas = engine.process(source, options);
	target.append(canvas);
}

source.addEventListener("load", go);
[...form.elements].forEach(e => e.addEventListener("change", go));

file.addEventListener("change", e => {
	let f = e.target.files[0];
	if (!f) { return; }
	source.src = URL.createObjectURL(f);
})

source.src = "sample.jpg"; // demo
