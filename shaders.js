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
uniform float outside_inside_mix;
out vec4 FragColor;

vec4 textureLookup(vec2 polar) {
	vec2 uv = polar / PI;

	if (polar.x < 0.) {
		uv.x += 1.0;
		return texture(texLeft, uv);
	} else {
		return texture(texRight, uv);
	}
}

vec3 cartesian_to_polar(vec3 cartesian) {
	float r = length(cartesian);

	return vec3(
		atan(cartesian.x, cartesian.z),
		acos(cartesian.y / r),
		r
	);
}

vec3 polar_to_cartesian(vec3 polar) {
	float phi = polar.x;
	float theta = polar.y;
	float r = polar.z;

	return vec3(
		r * sin(phi) * sin(theta),
		r            * cos(theta),
		r * cos(phi) * sin(theta)
	);
}

vec2 project_outside(vec2 fragCoord) {
	vec2 px = fragCoord.xy - (port / 2.);

	float r = min(port.x, port.y) / 2.;
	float dist = length(px) / r;  // 0..1

	if (is_polar) {
		dist = 1. - dist;
	} else {
		dist = 2. * atan(1./dist);
	}

	dist /= altitude;

	vec2 polar;
	polar.x = mod(-atan(px.y, px.x) + PI*1.5, 2.*PI) - PI;
	polar.y = dist;

	return polar;
}

vec3 rotate_xy(vec3 p, vec2 angle) {
	vec2 c = cos(angle), s = sin(angle);
	p = vec3(p.x, c.y*p.y + s.y*p.z, -s.y*p.y + c.y*p.z);
	return vec3(c.x*p.x + s.x*p.z, p.y, -s.x*p.x + c.x*p.z);
}

vec2 project_inside(vec2 fragCoord) {
	float vfov = hfov * (port.y / port.x);
	vec2 fov = vec2(hfov, vfov);

	vec2 ndc = fragCoord.xy * 2./port - 1.;

    vec3 camDir = normalize(vec3(ndc.xy * tan(fov * 0.5), 1.0));  // to cartesian
	vec3 rotated = normalize(rotate_xy(camDir, camera));
	return cartesian_to_polar(rotated).xy;
}

void main(void) {
	vec2 lonlat_outside = project_outside(gl_FragCoord.xy);
	vec2 lonlat_inside = project_inside(gl_FragCoord.xy);
	vec2 lonlat = mix(lonlat_outside, lonlat_inside, outside_inside_mix);
	FragColor = textureLookup(lonlat);
//	if (lonlat.y < 1.57) { FragColor.r = 1.0; }
}
`;
