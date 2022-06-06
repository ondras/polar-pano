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
uniform float outside_inside_mix;
out vec4 FragColor;

vec4 textureLookup(vec3 spherical) {
	vec2 uv = (spherical / PI).xy;

	if (spherical.x < 0.) {
		uv.x += 1.0;
		return texture(texLeft, uv);
	} else {
		return texture(texRight, uv);
	}
}

vec3 cartesian_to_spherical(vec3 cartesian) {
	float r = length(cartesian);

	return vec3(
		atan(cartesian.x, cartesian.z),
		acos(cartesian.y / r),
		r
	);
}

vec3 spherical_to_cartesian(vec3 spherical) {
	float phi = spherical.x;
	float theta = spherical.y;
	float r = spherical.z;

	return vec3(
		r * sin(phi) * sin(theta),
		r            * cos(theta),
		r * cos(phi) * sin(theta)
	);
}

vec3 unproject_outside(vec2 ndc) {
	ndc *= port / min(port.x, port.y); // aspect ratio correction

	float scale = tan(hfov/2.);
	float dist = length(ndc);

	vec3 spherical;
	spherical.x = mod(-atan(ndc.y, ndc.x) + PI*1.5, 2.*PI) - PI;
	spherical.y = 2. * atan(1./(dist*scale));

	return spherical;
}

vec3 rotate_xy(vec3 p, vec2 angle) {
	vec2 c = cos(angle), s = sin(angle);
	p = vec3(p.x, c.y*p.y + s.y*p.z, -s.y*p.y + c.y*p.z);
	return vec3(c.x*p.x + s.x*p.z, p.y, -s.x*p.x + c.x*p.z);
}

vec3 unproject_inside(vec2 ndc) {
	float vfov = hfov * (port.y / port.x);
	vec2 fov = vec2(hfov, vfov);
	vec2 scale = tan(fov * 0.5);

    vec3 camDir = normalize(vec3(ndc.xy * scale, 1.0));  // to cartesian
	vec3 rotated = normalize(rotate_xy(camDir, camera));
	return cartesian_to_spherical(rotated);
}

void main(void) {
	vec2 ndc = gl_FragCoord.xy * 2./port - 1.;

	vec3 outside = unproject_outside(ndc);
	vec3 inside = unproject_inside(ndc);
	vec3 lonlat = mix(outside, inside, outside_inside_mix);
	FragColor = textureLookup(lonlat);
//	if (lonlat.y < 1.57) { FragColor.r = 1.0; }
}
`;
