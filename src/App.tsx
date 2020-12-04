import React, {
  useRef,
  Suspense,
  useMemo,
  useLayoutEffect,
  useState,
} from "react";
import { Canvas, extend, useFrame, useThree } from "react-three-fiber";
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
import * as dat from "dat.gui";
import {
  Bloom,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BloomEffect } from "postprocessing";

const mouse = {
  x: 0,
  y: 0,
};

const settings = {
  main: {
    edgeThickness: 4.5,
    edgeIntensity: 1.0,
    borderBlur: 2.4,
    borderIntensity: 1,
    borderAlpha: 0.06,
    refractionRatio: 1 / 2.4,
    refractionOffset: 0.3,
    rotationSpeed: 0.2,
    randomSpeed: 1,
    randomOffsetFactor: 0.15,
  },
  bloom: {
    intensity: 0.5,
    luminanceThreshold: 0.4,
    luminanceSmoothing: 0.6,
  },
};

const BgShaderMaterial = shaderMaterial(
  {
    uScale: null,
    uTexture: null,
    uResolution: null,
  },
  `precision highp float;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
  `precision highp float;

uniform vec2 uScale;
uniform sampler2D uTexture;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  // vec2 uv = (vUv - vec2(0.5)) * uScale + vec2(0.5);
  gl_FragColor = texture2D(uTexture, uv);
}`
);

const BorderedShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uResolution: null,
    uEdgeThickness: 0,
    uEdgeIntensity: 0,
    uBorderBlur: 0,
    uBorderIntensity: 1,
    uRefractionRatio: 0,
    uRefractionOffset: 0,
    uBorderAlphaFactor: 0,
    uRandomOffsetFactor: 0,
    uRandomSpeed: 0,
    uType: 1,
    uTexture: null,
    uMouse: null,
    uDistortFactor: 0,
    uScale: null
  },
  vertex,
  fragment
);

extend({
  BorderedShaderMaterial,
  BgShaderMaterial,
});

declare global {
  namespace JSX {
    interface IntrinsicElements {
      borderedShaderMaterial: any;
      bgShaderMaterial: any;
    }
  }
}

const Scene = () => {
  const { size, gl, aspect, viewport, scene } = useThree();
  const texture = useTexture(textureImg) as THREE.Texture;
  useLayoutEffect(() => {
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
  }, [texture]);
  const scale = useMemo(() => {
    const img = texture.image as HTMLImageElement;
    const imageAspect = img.naturalWidth / img.naturalHeight;
    if (imageAspect > aspect) {
      return new THREE.Vector2(aspect / imageAspect, 1);
    } else {
      return new THREE.Vector2(1, imageAspect / aspect);
    }
  }, [texture, aspect]);

  const group = useRef<THREE.Group>();

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

  const getUVScale = (w: number, h: number) => {
    const geomDimension = 2;
    let scale = 1;
    if (w > h) {
      scale = w / geomDimension;
    } else {
      scale = h / geomDimension;
    }
    return new THREE.Vector2(scale, scale);
  };

  const material = useRef<THREE.ShaderMaterial>();
  const angleRef = useRef(0);
  const noiseFactor = useRef(0);
  useFrame(({ clock, viewport, camera, aspect }, delta) => {
    const h = camera.position.z * Math.tan((camera as THREE.PerspectiveCamera).fov * Math.PI / 180 / 2) * 2;
    const w = aspect * h;
    
    const t = clock.getElapsedTime();
    material.current.uniforms.uBorderBlur.value = settings.main.borderBlur;
    material.current.uniforms.uBorderIntensity.value =
      settings.main.borderIntensity;
    material.current.uniforms.uEdgeThickness.value =
      settings.main.edgeThickness;
    material.current.uniforms.uEdgeIntensity.value =
      settings.main.edgeIntensity;
    material.current.uniforms.uBorderAlphaFactor.value =
      settings.main.borderAlpha;
    material.current.uniforms.uRefractionRatio.value =
      settings.main.refractionRatio;
    material.current.uniforms.uRefractionOffset.value =
      settings.main.refractionOffset;
    material.current.uniforms.uTime.value = t;
    material.current.uniforms.uRandomOffsetFactor.value =
      settings.main.randomOffsetFactor;
    material.current.uniforms.uRandomSpeed.value = settings.main.randomSpeed;
    material.current.uniforms.uScale.value = getUVScale(w, h);

    const mouseX = (mouse.x - 0.5) * viewport.width;
    const mouseY = -(mouse.y - 0.5) * viewport.height;
    const dist = Math.sqrt(mouseX ** 2 + mouseY ** 2);
    const newDistort = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(dist, 0.5, 1.5, 0.2, 0),
      0,
      0.2
    );
    noiseFactor.current = THREE.MathUtils.lerp(
      noiseFactor.current,
      newDistort,
      0.05
    );
    material.current.uniforms.uDistortFactor.value = noiseFactor.current;

    angleRef.current += delta * settings.main.rotationSpeed;
    // const angle = t * (settings.main.rotationSpeed as number);
    const angle = angleRef.current;
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(Math.cos(angle), Math.sin(angle), 1).normalize(),
      angle
    );
    group.current.setRotationFromQuaternion(q);
  });

  return (
    <>
      <mesh visible={false} scale={[viewport.width, viewport.height, 1]}>
        <planeBufferGeometry args={[1, 1]} attach="geometry" />
        <bgShaderMaterial
          transparent
          uTexture={texture}
          uScale={scale}
          uResolution={new THREE.Vector2(1024, 1024)}
        />
      </mesh>
      <group ref={group}>
        <mesh visible={true}>
          <primitive object={geometry} attach="geometry" />
          <borderedShaderMaterial
            ref={material}
            attach="material"
            transparent
            uType={0}
            uTexture={texture}
            uResolution={new THREE.Vector2(size.width, size.height)}
            uScale={[0, 0]}
          />
        </mesh>
      </group>
    </>
  );
};

const PostProcessing = () => {
  const bloom = useRef<BloomEffect>();
  useFrame(() => {
    if (bloom.current) {
      bloom.current.luminanceMaterial.smoothing =
        settings.bloom.luminanceSmoothing;
      bloom.current.luminanceMaterial.threshold =
        settings.bloom.luminanceThreshold;
      bloom.current.intensity = settings.bloom.intensity;
    }
  });
  return (
    <EffectComposer>
      <Bloom ref={bloom} />
      <Noise opacity={0.03} />
      <Vignette eskil={false} offset={0.1} darkness={1} />
    </EffectComposer>
  );
};

const App = () => {
  const [gui] = useState(() => {
    const datInst = new dat.GUI({});

    const mainSettings = datInst.addFolder("mainSettings");
    mainSettings.add(settings.main, "borderBlur", 1, 10);
    mainSettings.add(settings.main, "borderIntensity", 0, 10);
    mainSettings.add(settings.main, "borderAlpha", 0, 1);
    mainSettings.add(settings.main, "refractionRatio", 0, 1);
    mainSettings.add(settings.main, "refractionOffset", 0, 1);
    mainSettings.add(settings.main, "rotationSpeed", 0, 1);
    mainSettings.add(settings.main, "randomSpeed", 0, 10, 0.01);
    mainSettings.add(settings.main, "randomOffsetFactor", 0, 1, 0.01);
    mainSettings.add(settings.main, "edgeThickness", 0, 20, 0.1);
    mainSettings.add(settings.main, "edgeIntensity", 0, 10, 0.1);

    const bloomSettings = datInst.addFolder("bloomSettings");
    bloomSettings.add(settings.bloom, "intensity", 0, 3, 0.01);
    bloomSettings.add(settings.bloom, "luminanceThreshold", 0, 1, 0.01);
    bloomSettings.add(settings.bloom, "luminanceSmoothing", 0, 1, 0.01);

    datInst.close();
    return datInst;
  });

  // useEffect(() => {
  //   return () => {
  //     gui.destroy();
  //   };
  // }, []);
  return (
    <Canvas
      colorManagement
      onMouseMove={(e) => {
        const bbox = (e.target as HTMLElement).getBoundingClientRect();
        mouse.x = (e.clientX - bbox.left) / bbox.width;
        mouse.y = (e.clientY - bbox.top) / bbox.height;
      }}
      camera={{ position: [0, 0, 4], near: 0.1, far: 1000, fov: 45 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x111111);
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
      <PostProcessing />
    </Canvas>
  );
};

export default App;
