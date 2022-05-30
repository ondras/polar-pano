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
uniform float hfov;
uniform vec2 camera;
uniform float height;
out vec4 FragColor;

vec4 textureLookup(vec2 lonlat) {
//	lonlat.x = mod(lonlat.x + PI, 2.*PI) - PI;
//	lonlat.y = clamp(lonlat.y, -PI/2., PI/2.);

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
	float dist = length(px);
	dist = dist / r;  // normalize to 0..1
	{scale};

	vec2 lonlat;
	lonlat.x = mod(-atan(px.y, px.x) + PI*1.5, 2.*PI) - PI;
	lonlat.y = (dist - 0.5)*PI;

	return lonlat;
}

vec2 in_sphere(vec2 fragCoord) {
	vec2 lonlat;

	float vfov = hfov * (port.y / port.x);

	lonlat.x = ((fragCoord.x / port.x)-0.5) * hfov;
	lonlat.y = ((fragCoord.y / port.y)-0.5) * vfov;

	return camera + lonlat;
}

vec3 rotateXY(vec3 p, vec2 angle) {
	vec2 c = cos(angle), s = sin(angle);
	p = vec3(p.x, c.y*p.y + s.y*p.z, -s.y*p.y + c.y*p.z);
	return vec3(c.x*p.x + s.x*p.z, p.y, -s.x*p.x + c.x*p.z);
}

vec2 in_sphere_2(vec2 fragCoord) {
	float vfov = hfov * (port.y / port.x);
	vec2 fov = vec2(hfov, vfov);

	vec2 uv = fragCoord.xy * 2./port - 1.;

    // to spherical
    vec3 camDir = normalize(vec3(uv.xy * tan(fov * 0.5), 1.0));

    vec3 rd = normalize(rotateXY(camDir, camera));

    // radial azimuth polar
	return vec2(atan(rd.x, rd.z), -asin(-rd.y));
}

void main(void) {
	vec2 lonlat1 = rect_to_polar(gl_FragCoord.xy);
	vec2 lonlat2 = in_sphere(gl_FragCoord.xy);
	vec2 lonlat3 = in_sphere_2(gl_FragCoord.xy);
	vec2 lonlat = mix(lonlat1, lonlat3, 1.);
	FragColor = textureLookup(lonlat);
}
`;
