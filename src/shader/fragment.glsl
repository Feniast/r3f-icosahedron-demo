precision highp float;
varying vec2 vUv;
varying vec3 vBaryCoord;
varying vec3 vEyeVector;
varying vec3 vPos;
varying vec3 vCenter;

uniform float uTime;
uniform float uBorderBlur;
uniform float uBorderIntensity;
uniform float uBorderAlphaFactor;
uniform int uType;
uniform sampler2D uTexture;
uniform float uRefractionRatio;
uniform float uRefractionOffset;
uniform float uRandomOffsetFactor;
uniform float uRandomSpeed;

#define PI 3.141592653589793

vec2 hash22(vec2 p) {
	p = fract(p * vec2(5.3983, 5.4427));
  p += dot(p.yx, p.xy +  vec2(21.5351, 14.3137));
	return fract(vec2(p.x * p.y * 95.4337, p.x * p.y * 97.597));
}

mat4 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(
		oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
		0.0,                                0.0,                                0.0,                                1.0
	);
}

float edgeFactor(vec3 p, float factor, float intensity){
  vec3 d = fwidth(p);
  // vec3 grid = abs(fract(p - 0.5) - 0.5) / d * factor;
  vec3 a = pow(smoothstep(vec3(0.), d * factor, p), vec3(intensity));
  return min(a.x, min(a.y, a.z));
}

vec4 renderBorder() {
  float border = edgeFactor(vBaryCoord, uBorderBlur, uBorderIntensity);

  float c = mix(1., 0., border);
  return vec4(vec3(c), c * uBorderAlphaFactor);
}

vec4 renderDiffuse() {
  vec3 lightPos = vec3(1., 1., 1.);
  // lightPos = (vec4(lightPos, 1.) * rotation3d(vec3(-1., 1., 0.), uTime * 0.2)).xyz;
  vec3 normal = normalize(cross(dFdx(vPos), dFdy(vPos)));
  float diffuse = clamp(dot(normal, lightPos), 0., 1.);

  float edge = 1.0 - edgeFactor(vBaryCoord, 6.6, 1.5);
  vec2 displacement = (vCenter - vPos).xy * edge * 0.3;

  vec4 borderColor = renderBorder();
  
  vec2 uvOffset = hash22(floor(vec2(diffuse + uTime * 0.1) + vCenter.xy  * uRandomSpeed));
  uvOffset.x = (uvOffset.x - 0.5) * 2.;
  uvOffset.y = (uvOffset.y - 0.5) * 2.; 
  vec2 uv = gl_FragCoord.xy / 1024.;
  // vec2 uv = (gl_FragCoord.xy - 200.) * 1.2  / 1024.;
  uv += uvOffset * uRandomOffsetFactor;

  vec3 refractOffset = refract(vEyeVector, normal, uRefractionRatio);
  uv += refractOffset.xy * uRefractionOffset;

  uv += displacement;

  vec4 texColor = texture2D(uTexture, uv);
  vec4 color = texColor;
  if (borderColor.a > 0.) {
    color.rgb = borderColor.rgb * borderColor.a + texColor.rgb * (1. - borderColor.a);
    color.a = borderColor.a + texColor.a;
  }
  // return vec4(vec3(diffuse), 1.);
  // return color * max(diffuse, 0.2);
  return color;
}

void main() {
  if (uType == 0) {
    gl_FragColor = renderDiffuse();
  }
  if (uType == 1) {
    gl_FragColor = renderBorder();
  }
}