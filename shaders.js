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

vec4 textureLookup(vec2 polar) {
	vec2 uv = polar / PI;

	if (uv.x < 0.) {
		uv.x += 1.0;
		return texture(texLeft, uv);
	} else {
		return texture(texRight, uv);
	}
}

vec2 cartesian_to_polar(vec2 cartesian) {
	return vec2(
		atan(cartesian.x, cartesian.y),
		length(cartesian)
	);
}

vec2 polar_to_cartesian(vec2 polar) {
	float phi = polar.x;
	float r = polar.y;
	return vec2(r*sin(phi), r*cos(phi));
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

vec3 test_inverse(vec2 polar, float d) {
	float phi = polar.x;
	float r = polar.y;

	float alpha = atan(r/(1.+d));
	float corr = asin(d * sin(alpha));
	float theta = PI - (alpha+corr);

	return vec3(phi, theta, 1);
}

vec3 stereographic_inverse(vec2 polar) {
	float phi = polar.x;
	float r = polar.y;

	return vec3(phi, 2. * atan(1./r), 1);
}

vec3 gnomonic_inverse_cartesian(vec2 ndc) { // ndc -> cartesian
    return normalize(vec3(ndc.x, -1.0, ndc.y));
}

vec3 gnomonic_inverse_spherical(vec2 polar) { // polar -> spherical
	float phi = polar.x;
	float r = polar.y;
	float theta = PI/2. + atan(1./r);
	return vec3(phi, theta, 1);
}

vec3 rotate_xy(vec3 p, vec2 angle) {
	vec2 c = cos(angle), s = sin(angle);
	p = vec3(p.x, c.y*p.y + s.y*p.z, -s.y*p.y + c.y*p.z);
	return vec3(c.x*p.x + s.x*p.z, p.y, -s.x*p.x + c.x*p.z);
}

vec3 unproject_test(vec2 ndc) {
	vec2 scale_planet = (port / min(port.x, port.y)) * 2. * tan(hfov * 0.5);
	vec2 scale_pano = tan(hfov * vec2(1, port.y/port.x) * 0.5);
	vec2 scale = mix(scale_pano, scale_planet, outside_inside_mix);
	ndc *= scale;

	vec2 polar = cartesian_to_polar(ndc);
	vec3 inverted = test_inverse(polar, outside_inside_mix);
	vec3 cartesian = spherical_to_cartesian(inverted);
	vec3 rotated = rotate_xy(cartesian, camera);

	return cartesian_to_spherical(rotated);
}

vec3 unproject_outside(vec2 ndc) {
	vec2 scale = (port / min(port.x, port.y)) * tan(hfov * .5);
	ndc *= scale;

	vec2 polar = cartesian_to_polar(ndc);
	vec3 inverted = stereographic_inverse(polar);

	vec3 cartesian = spherical_to_cartesian(inverted);
	vec3 rotated = rotate_xy(cartesian, camera);

	return cartesian_to_spherical(rotated);
}

vec3 unproject_inside(vec2 ndc) {
	vec2 fov = hfov * vec2(1, port.y/port.x);
	vec2 scale = tan(fov * .5);
	ndc *= scale;

	// cartesian version:
	vec3 inverted = gnomonic_inverse_cartesian(ndc);

	// polar version:
//	vec2 polar = cartesian_to_polar(ndc);
//	vec3 spherical = gnomonic_inverse_spherical(polar);
//	inverted = spherical_to_cartesian(spherical);

	vec3 rotated = rotate_xy(inverted, camera);
	return cartesian_to_spherical(rotated);
}

void main(void) {
	vec2 ndc = gl_FragCoord.xy * 2./port - 1.;

	vec3 outside = unproject_outside(ndc);
	vec3 inside = unproject_inside(ndc);
//	vec3 lonlat = mix(outside, inside, outside_inside_mix);
//	vec3 lonlat = unproject_test(ndc);
	vec3 lonlat = outside;
	FragColor = textureLookup(lonlat.xy);
	if (lonlat.x > 55. * PI / 180.) { FragColor.r = 1.0; }
}
`;
