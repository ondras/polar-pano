export const VS = `#version 300 es
in vec2 position;

void main(void) {
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FS = `#version 300 es
#define PI 3.1415926538
precision mediump float;

uniform sampler2D texLeft, texRight;
uniform vec2 port;
out vec4 FragColor;

void main(void) {
	vec2 px = gl_FragCoord.xy - (port / 2.);

	float r = min(port.x, port.y) / 2.;

	float dist = length(px);
	dist = dist / r;  // normalize to 0..1
	{scale};

	float angle = -atan(px.y, px.x);  // -pi..pi

	if (angle < 0.) {
		float x = (angle + PI) / PI;
		vec2 uv = vec2(x, 1.-dist);
		FragColor = texture(texLeft, uv);
	} else {
		float x = angle / PI;
		vec2 uv = vec2(x, 1.-dist);
		FragColor = texture(texRight, uv);
	}
}
`;
