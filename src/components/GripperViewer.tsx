import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';

interface Props {
  openRatio: number;
  tilt: number;
  spread: number;
  isMoving: boolean;
  statusColor: string;
  objectDetected: boolean;
  connected: boolean;
  activated: boolean;
  eStop: boolean;
}

const FRONT_ANGLE = 0.8;
const INIT_CAMERA = { x: 0, y: 0.1, z: 0.35 };

const GripperViewer: React.FC<Props> = ({
  openRatio, isMoving, statusColor, objectDetected,
  connected, activated, eStop,
}) => {
  const mountRef      = useRef<HTMLDivElement>(null);
  const robotRef      = useRef<any>(null);
  const animFrameRef  = useRef<number>(0);
  const controlsRef   = useRef<any>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);

  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isRotating;
    }
  }, [isRotating]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.001, 100);
    camera.position.set(INIT_CAMERA.x, INIT_CAMERA.y, INIT_CAMERA.z);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    // 초기 임시 크기 설정 (flash 방지)
    renderer.setSize(160, 200);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ✅ RAF로 한 프레임 후 실제 크기 읽어서 초기 사이즈 적용
    const applySize = () => {
      if (!mountRef.current) return;
      const W = mountRef.current.clientWidth;
      const H = mountRef.current.clientHeight;
      if (W > 0 && H > 0) {
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
      }
    };

    // 첫 프레임 + 두 번째 프레임 모두 시도 (레이아웃 완성 보장)
    requestAnimationFrame(() => {
      applySize();
      requestAnimationFrame(applySize);
    });

    // ✅ 이후 ResizeObserver로 지속 감지
    const resizeObserver = new ResizeObserver(applySize);
    resizeObserver.observe(mountRef.current);

    // 조명
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(1, 2, 2);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-1, -1, -1);
    scene.add(fill);

    // OrbitControls
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 2.0;
      controls.minDistance = 0.05;
      controls.maxDistance = 1.5;
      controls.saveState();
      controlsRef.current = controls;
    });

    // URDF 로드
    const totalMeshes = 6;
    let loadedMeshes = 0;
    let robotObject: any = null;

    const tryFitRobot = () => {
      if (!robotObject) return;
      const box = new THREE.Box3().setFromObject(robotObject);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const center = box.getCenter(new THREE.Vector3());
        robotObject.position.sub(center);
        robotObject.position.y += 0.03;
        robotObject.scale.setScalar(0.2 / maxDim);
      }
    };

    const loader = new URDFLoader();
    loader.packages = { 'paeallel gripper': window.location.origin };

    loader.loadMeshCb = (
      path: string,
      _manager: THREE.LoadingManager,
      done: (mesh: THREE.Object3D) => void
    ) => {
      import('three/examples/jsm/loaders/STLLoader.js')
        .then(({ STLLoader }) => {
          new STLLoader().load(
            path,
            (geometry: THREE.BufferGeometry) => {
              geometry.computeVertexNormals();
              done(new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
                color: 0xb0bec5, specular: 0x333333, shininess: 50,
              })));
              loadedMeshes++;
              if (loadedMeshes >= totalMeshes) tryFitRobot();
            },
            undefined,
            () => { done(new THREE.Group()); loadedMeshes++; if (loadedMeshes >= totalMeshes) tryFitRobot(); }
          );
        })
        .catch(() => { done(new THREE.Group()); loadedMeshes++; if (loadedMeshes >= totalMeshes) tryFitRobot(); });
    };

    loader.load(
      '/urdf/paeallel%20gripper.urdf',
      (robot: any) => {
        robotObject = robot;
        robotRef.current = robot;
        robot.rotation.x = Math.PI / 2;
        robot.rotation.z = FRONT_ANGLE;
        scene.add(robot);
      },
      undefined,
      (err: unknown) => console.error('❌ URDF 로드 실패:', err)
    );

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const robot = robotRef.current;
    if (!robot?.joints) return;
    const motor = robot.joints['motor'];
    if (motor) motor.setJointValue(openRatio * 0.9601618283);
  }, [openRatio]);

  const handleReset = () => {
    if (controlsRef.current) controlsRef.current.reset();
    setIsRotating(false);
  };

  const handleToggleRotation = () => {
    setIsRotating(prev => {
      const next = !prev;
      if (!next && controlsRef.current) controlsRef.current.autoRotate = false;
      return next;
    });
  };

  const statusLabel = eStop ? 'E-Stop' : activated ? 'Active' : connected ? 'Online' : 'Offline';
  const statusBg    = eStop ? '#FFEBEE' : activated ? '#E8F5E9' : connected ? '#E3F2FD' : '#F0F4F8';
  const statusTxt   = eStop ? '#C62828' : activated ? '#2E7D32' : connected ? '#1565C0' : '#90A4AE';

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: 6, padding: '3px 7px',
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 2,
    transition: 'all 0.2s',
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* 상태 칩 + 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          padding: '2px 8px', borderRadius: 10,
          backgroundColor: statusBg,
          fontSize: 10, fontWeight: 700, color: statusTxt,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: statusColor, display: 'inline-block',
            boxShadow: objectDetected ? `0 0 6px ${statusColor}` : 'none',
          }} />
          {statusLabel}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleReset} title="원점 복귀"
            style={{ ...btnBase, backgroundColor: '#F0F4F8', color: '#546E7A' }}>
            ↺
          </button>
        </div>
      </div>

      {/* ✅ 3D 뷰어 - 남은 공간 전부 사용 */}
      <div
        ref={mountRef}
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          background: 'transparent',
          cursor: 'grab',
        }}
      >
        {isMoving && (
          <div style={{
            position: 'absolute', top: 4, right: 6,
            fontSize: 11, color: '#1976D2', fontWeight: 'bold',
            pointerEvents: 'none',
          }}>▶</div>
        )}
      </div>
    </div>
  );
};

export default GripperViewer;