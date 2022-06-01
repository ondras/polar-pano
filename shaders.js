export const vs = `#version 300 es
in vec2 position;

void main(void) {
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fs = `#version 300 es
#define PI 3.1415926538
precision mediump float;

uniform sampler2D texLeft, texRight;
uniform vec2 port;
uniform float hfov;
uniform vec2 camera;
uniform float altitude;
uniform bool is_polar;
out vec4 FragColor;

vec4 textureLookup(vec2 lonlat) {
	vec2 uv = vec2(lonlat.x / PI, 1. - (lonlat.y/PI + 0.5));

	if (lonlat.x < 0.) {
		uv.x += 1.0;
		return texture(texLeft, uv);
	} else {
		return texture(texRight, uv);
	}
}

vec2 rect_to_polar(vec2 fragCoord) {
	vec2 px = fragCoord.xy - (port / 2.);

	float r = min(port.x, port.y) / 2.;
	float dist = length(px) / r;  // 0..1
	if (!is_polar) { dist = atan(dist); }

	dist *= altitude;

	vec2 lonlat;
	lonlat.x = mod(-atan(px.y, px.x) + PI*1.5, 2.*PI) - PI;
	lonlat.y = (dist - 0.5)*PI;

	return lonlat;
}

vec3 rotate_xy(vec3 p, vec2 angle) {
	vec2 c = cos(angle), s = sin(angle);
	p = vec3(p.x, c.y*p.y + s.y*p.z, -s.y*p.y + c.y*p.z);
	return vec3(c.x*p.x + s.x*p.z, p.y, -s.x*p.x + c.x*p.z);
}

vec2 in_sphere(vec2 fragCoord) {
	float vfov = hfov * (port.y / port.x);
	vec2 fov = vec2(hfov, vfov);

	vec2 ndc = fragCoord.xy * 2./port - 1.;

    vec3 camDir = normalize(vec3(ndc.xy * tan(fov * 0.5), 1.0));  // to spherical
    vec3 rd = normalize(rotate_xy(camDir, camera));

	return vec2(atan(rd.x, rd.z), -asin(-rd.y));  // radial azimuth polar
}

void main(void) {
	vec2 lonlat1 = rect_to_polar(gl_FragCoord.xy);
	vec2 lonlat2 = in_sphere(gl_FragCoord.xy);
	vec2 lonlat = mix(lonlat1, lonlat2, 0.001);
	FragColor = textureLookup(lonlat);
}
`;
