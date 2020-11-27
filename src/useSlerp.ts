import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "react-three-fiber";

const useSlerp = (
  ref: React.MutableRefObject<THREE.Mesh>,
  options: { ratio?: number; lerpSpeed?: number } = {}
) => {
  const { ratio = 1 / 100, lerpSpeed = 0.1 } = options;
  const { viewport } = useThree();

  const [rotationEuler, rotationQuaternion] = useMemo(
    () => [new THREE.Euler(0, 0, 0), new THREE.Quaternion(0, 0, 0, 0)],
    []
  );

  useFrame(({ mouse }) => {
    if (!ref.current) return;

    const x = mouse.x * viewport.width * ratio;
    const y = mouse.y * viewport.height * ratio;
    rotationEuler.set(y, x, 0);
    rotationQuaternion.setFromEuler(rotationEuler);
    ref.current.quaternion.slerp(rotationQuaternion, lerpSpeed);
  });
};

export default useSlerp;
