precision highp float;
attribute vec3 aBaryCoord;
attribute vec3 aCenter;

varying vec3 vBaryCoord;
varying vec2 vUv;
varying vec3 vEyeVector;
varying vec3 vPos;
varying vec3 vCenter;
varying vec3 vLocalCenter;

void main() {
  vUv = uv;
  vBaryCoord = aBaryCoord;
  
  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vEyeVector = worldPos - cameraPosition;
  vPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
  vCenter = (modelViewMatrix * vec4(aCenter, 1.0)).xyz;
  vLocalCenter = aCenter;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}