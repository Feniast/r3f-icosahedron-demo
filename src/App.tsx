import React, { useRef, Suspense, useMemo, useLayoutEffect } from "react";
import { Canvas, extend, useFrame } from "react-three-fiber";
import * as THREE from "three";
import {
  OrbitControls,
  Html,
  shaderMaterial,
  useTexture,
} from "@react-three/drei";
import useDatGui from "./useDatGui";
import vertex from "./shader/vertex.glsl";
import fragment from "./shader/fragment.glsl";
import textureImg from "url:./assets/texture.jpg";

const BorderedShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uBorderBlur: 0,
    uBorderIntensity: 1,
    uRefractionRatio: 0,
    uRefractionOffset: 0,
    uBorderAlphaFactor: 0,
    uRandomOffsetFactor: 0,
    uRandomSpeed: 0,
    uType: 1,
    uTexture: null,
  },
  vertex,
  fragment
);

extend({
  BorderedShaderMaterial,
});

declare global {
  namespace JSX {
    interface IntrinsicElements {
      borderedShaderMaterial: any;
    }
  }
}

const Scene = () => {
  const texture = useTexture(textureImg) as THREE.Texture;
  useLayoutEffect(() => {
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
  }, [texture]);
  const group = useRef<THREE.Group>();
  const settings = useDatGui({
    borderBlur: {
      value: 2.4,
      min: 1,
      max: 10,
    },
    borderIntensity: {
      value: 1,
      min: 0,
      max: 10,
    },
    borderAlpha: {
      value: 0.12,
      min: 0,
      max: 1,
    },
    refractionRatio: {
      value: 1 / 2.4,
      min: 0,
      max: 1,
      step: 0.01,
    },
    refractionOffset: {
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
    },
    rotationSpeed: {
      value: 0.15,
      min: 0,
      max: 1,
      step: 0.01
    },
    randomSpeed: {
      value: 1.,
      min: 0,
      max: 10,
      step: 0.01,
    },
    randomOffsetFactor: {
      value: 0.15,
      min: 0,
      max: 1,
      step: 0.01
    }
  });
  const geometry = useMemo(() => {
    const g = new THREE.IcosahedronBufferGeometry(1, 1);
    const len = g.attributes.position.array.length;
    const bary = [];
    const centers = [];
    const p = g.attributes.position.array;
    for (let i = 0; i < len / 9; i++) {
      const x = (p[i * 9 + 0] + p[i * 9 + 3] + p[i * 9 + 6]) / 3;
      const y = (p[i * 9 + 1] + p[i * 9 + 4] + p[i * 9 + 7]) / 3;
      const z = (p[i * 9 + 2] + p[i * 9 + 5] + p[i * 9 + 8]) / 3;
      centers.push(x, y, z, x, y, z, x, y, z);
    }
    for (let i = 0; i < len / 3; i++) {
      if (i % 3 === 0) {
        bary.push(1, 0, 0);
      } else if (i % 3 === 1) {
        bary.push(0, 1, 0);
      } else {
        bary.push(0, 0, 1);
      }
    }
    g.setAttribute("aBaryCoord", new THREE.Float32BufferAttribute(bary, 3)); // barycentric coordinates
    g.setAttribute("aCenter", new THREE.Float32BufferAttribute(centers, 3));
    return g;
  }, []);

  const material = useRef<THREE.ShaderMaterial>();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    material.current.uniforms.uBorderBlur.value = settings.borderBlur;
    material.current.uniforms.uBorderIntensity.value = settings.borderIntensity;
    material.current.uniforms.uBorderAlphaFactor.value = settings.borderAlpha;
    material.current.uniforms.uRefractionRatio.value = settings.refractionRatio;
    material.current.uniforms.uRefractionOffset.value =
      settings.refractionOffset;
    material.current.uniforms.uTime.value = t;
    material.current.uniforms.uRandomOffsetFactor.value = settings.randomOffsetFactor;
    material.current.uniforms.uRandomSpeed.value = settings.randomSpeed;

    const angle = t * (settings.rotationSpeed as number);
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(Math.cos(angle), Math.sin(angle), 1).normalize(),
      angle
    );
    group.current.setRotationFromQuaternion(q);
  });

  return (
    <>
      {/* <mesh>
        <planeBufferGeometry args={[2, 2]} attach="geometry" />
        <meshBasicMaterial map={texture} attach="material" />
      </mesh> */}
      <group ref={group}>
        <mesh visible={true}>
          <primitive object={geometry} attach="geometry" />
          <borderedShaderMaterial
            ref={material}
            attach="material"
            transparent
            uType={0}
            uTexture={texture}
          />
        </mesh>
      </group>
    </>
  );
};

const App = () => {
  return (
    <Canvas
      colorManagement
      camera={{ position: [0, 0, 4], near: 0.1, far: 1000, fov: 45 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0);
      }}
    >
      <ambientLight intensity={0.5} />
      <OrbitControls />
      <Suspense
        fallback={
          <Html>
            <div>Loading</div>
          </Html>
        }
      >
        <Scene />
      </Suspense>
    </Canvas>
  );
};

export default App;
