import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { logger } from '../utils/logger';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import BrainIcon from './icons/BrainIcon.tsx';

type CameraAngle = 'frontal' | 'lateral' | 'superior' | 'free';

interface HologramViewerProps {
    modelUrl: string;
    targetMuscle?: string;
    animationType?: 'ideal' | 'deviation';
    deviationPart?: string;
    suggestedView?: 'frontal' | 'lateral' | 'superior';
}

const HologramViewer: React.FC<HologramViewerProps> = ({ modelUrl, targetMuscle, animationType = 'ideal', deviationPart, suggestedView }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<{
        mixer?: THREE.AnimationMixer;
        actions: { [key: string]: THREE.AnimationAction };
    }>({ actions: {} });
    const sceneRef = useRef<THREE.Scene | null>(null);
    const materialsRef = useRef<{
        hologramMaterial: THREE.ShaderMaterial;
        glowingHologramMaterial: THREE.ShaderMaterial;
        deviationMaterial: THREE.ShaderMaterial;
    } | null>(null);

    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const isUserInteractingRef = useRef(false);
    const targetPositionRef = useRef(new THREE.Vector3(0, 1.2, 2.5));
    const targetLookAtRef = useRef(new THREE.Vector3(0, 1, 0));
    const [activeAngle, setActiveAngle] = useState<CameraAngle>('frontal');

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.set(0, 1.2, 2.5);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 1, 0);
        controls.update();
        controlsRef.current = controls;

        controls.addEventListener('start', () => {
            isUserInteractingRef.current = true;
            setActiveAngle('free');
        });

        scene.add(new THREE.AmbientLight(0x404040, 2));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const createShaderMaterial = (color: THREE.Color, isPulsing: boolean) => {
            return new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: color },
                    glowIntensity: { value: 1.0 }
                },
                // FIX: Integrate shader source code directly, removing placeholder comments.
                vertexShader: `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`,
                fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float glowIntensity;
    varying vec3 vNormal;
    void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        float pulse = 0.7 + 0.3 * sin(time * 3.0);
        float scanline = sin(gl_FragCoord.y * 0.8 - time * 10.0) * 0.05;
        float baseAlpha = (intensity + scanline) * pulse * glowIntensity;
        ${isPulsing ? 'float errorPulse = 0.6 + 0.4 * sin(time * 8.0); baseAlpha *= errorPulse;' : ''}
        gl_FragColor = vec4(color, clamp(baseAlpha, 0.0, 1.0));
    }
`,
                transparent: true, side: THREE.DoubleSide, depthWrite: false,
            });
        };

        const hologramMaterial = createShaderMaterial(new THREE.Color(0x00e5ff), false);
        const glowingHologramMaterial = createShaderMaterial(new THREE.Color(0x00e5ff), false);
        glowingHologramMaterial.uniforms.glowIntensity.value = 1.5;
        const deviationMaterial = createShaderMaterial(new THREE.Color(0xff0000), true);
        materialsRef.current = { hologramMaterial, glowingHologramMaterial, deviationMaterial };

        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0 });
        const lineGeometries = [
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.35, 0.2, 0), new THREE.Vector3(-0.35, 1.0, 0)]),
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.35, 0.2, 0), new THREE.Vector3(0.35, 1.0, 0)])
        ];
        const guideLines = new THREE.Group();
        lineGeometries.forEach(geom => guideLines.add(new THREE.Line(geom, lineMaterial.clone())));
        scene.add(guideLines);

        const loader = new GLTFLoader();
        loader.load(modelUrl, (gltf) => {
            const model = gltf.scene;
            scene.add(model);

            const mixer = new THREE.AnimationMixer(model);
            animationRef.current.mixer = mixer;
            animationRef.current.actions = {};

            if (gltf.animations[0]) animationRef.current.actions['ideal'] = mixer.clipAction(gltf.animations[0]);
            if (gltf.animations[1]) animationRef.current.actions['deviation'] = mixer.clipAction(gltf.animations[1]);

            const initialAction = animationRef.current.actions[animationType];
            if (initialAction) initialAction.play();
        }, undefined, (error) => logger.error('An error happened loading the model:', { metadata: { error: error instanceof Error ? error.message : String(error) } }));

        const clock = new THREE.Clock();
        const animate = () => {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const time = clock.getElapsedTime();

            if (!isUserInteractingRef.current && cameraRef.current && controlsRef.current) {
                cameraRef.current.position.lerp(targetPositionRef.current, 0.05);
                controlsRef.current.target.lerp(targetLookAtRef.current, 0.05);
            }
            controls.update();

            if (animationRef.current.mixer) animationRef.current.mixer.update(delta);

            // FIX: Add type assertion to shader material to resolve 'unknown' type error.
            Object.values(materialsRef.current || {}).forEach(mat => (mat as THREE.ShaderMaterial).uniforms.time.value = time);

            guideLines.children.forEach(line => {
                ((line as THREE.Line).material as THREE.Material).opacity = animationType === 'deviation' ? Math.max(0, 0.7 * Math.sin(time * 5.0)) : 0;
            });

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!currentMount) return;
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
            Object.values(animationRef.current.actions).forEach(action => (action as THREE.AnimationAction)?.stop());
            if (animationRef.current.mixer) animationRef.current.mixer.uncacheRoot(animationRef.current.mixer.getRoot());
        };
    }, [modelUrl]);

    useEffect(() => {
        const { actions } = animationRef.current;
        const scene = sceneRef.current;
        const materials = materialsRef.current;

        if (!actions || !scene || !materials) return;

        const currentAction = animationType === 'ideal' ? actions.deviation : actions.ideal;
        const nextAction = animationType === 'ideal' ? actions.ideal : actions.deviation;

        if (currentAction) currentAction.stop();
        if (nextAction) {
            nextAction.reset().play();
        }

        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const childName = child.name.toLowerCase();
                const targetMuscleName = targetMuscle?.toLowerCase().split(' ')[0] || '';
                const deviationPartName = deviationPart?.toLowerCase() || '';

                if (animationType === 'deviation' && deviationPart && childName.includes(deviationPartName)) {
                    mesh.material = materials.deviationMaterial;
                } else if (animationType === 'ideal' && targetMuscle && childName.includes(targetMuscleName)) {
                    mesh.material = materials.glowingHologramMaterial;
                } else {
                    mesh.material = materials.hologramMaterial;
                }
            }
        });

    }, [animationType, targetMuscle, deviationPart]);

    const setView = (angle: CameraAngle, position: THREE.Vector3, lookAt: THREE.Vector3) => {
        targetPositionRef.current.copy(position);
        targetLookAtRef.current.copy(lookAt);
        isUserInteractingRef.current = false;
        setActiveAngle(angle);
    };

    const viewSuggestionMap: Record<string, string> = {
        frontal: "Vista Frontal: evalúa la estabilidad de rodillas.",
        lateral: "Vista Lateral: evalúa profundidad y espalda.",
        superior: "Vista Superior: evalúa la trayectoria."
    };

    const getButtonClass = (angle: CameraAngle) => {
        const isSuggested = suggestedView === angle;
        return `px-3 py-1 rounded-md transition-colors text-sm relative ${activeAngle === angle ? 'bg-spartan-gold text-spartan-bg' : isSuggested ? 'bg-spartan-gold/20 text-spartan-gold animate-pulse' : 'hover:bg-spartan-surface'}`;
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full px-4">
                {suggestedView && (
                    <div className="flex justify-center mb-2">
                        <div className="bg-spartan-card/80 backdrop-blur-sm text-spartan-text-secondary text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-2 animate-fadeIn">
                            <BrainIcon className="w-4 h-4 text-spartan-gold" />
                            <span>Sugerencia del Coach: {viewSuggestionMap[suggestedView]}</span>
                        </div>
                    </div>
                )}
                <div className="flex justify-center items-center gap-2 bg-spartan-card/50 backdrop-blur-sm p-1.5 rounded-lg">
                    <button onClick={() => setView('frontal', new THREE.Vector3(0, 1.2, 2.5), new THREE.Vector3(0, 1, 0))} className={getButtonClass('frontal')}>Frontal</button>
                    <button onClick={() => setView('lateral', new THREE.Vector3(2.5, 1.2, 0), new THREE.Vector3(0, 1, 0))} className={getButtonClass('lateral')}>Lateral</button>
                    <button onClick={() => setView('superior', new THREE.Vector3(0, 3, 0.1), new THREE.Vector3(0, 1, 0))} className={getButtonClass('superior')}>Superior</button>
                </div>
            </div>
        </div>
    );
};

export default HologramViewer;


