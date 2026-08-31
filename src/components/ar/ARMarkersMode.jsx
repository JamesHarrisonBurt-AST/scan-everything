import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Camera, MapPin, Boxes, Compass } from 'lucide-react';
import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import MarkerTray from './MarkerTray';
import MarkerInfoPanel from './MarkerInfoPanel';
import { loadSavedMarkers, saveMarkersToStorage, createMarkerMesh, disposeMarkerMesh, PLACE_DISTANCE } from './markerUtils';

export default function ARMarkersMode({ onSwitchMode, onClose }) {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const camera3DRef = useRef(null);
  const rendererRef = useRef(null);
  const markersGroupRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const animFrameRef = useRef(null);
  const orientationActiveRef = useRef(false);
  const pointerRef = useRef({ down: false, x: 0, y: 0, moved: false });
  const dragRotRef = useRef({ x: 0, y: 0 });

  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscoveryId, setSelectedDiscoveryId] = useState(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [placedMarkers, setPlacedMarkers] = useState([]);
  const [motionEnabled, setMotionEnabled] = useState(false);

  // Load discoveries
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Discovery.list('-created_date', 50);
        setDiscoveries(list);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  // Three.js scene setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, w / h, 0.1, 100);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(1, 2, 3);
    scene.add(dirLight);

    const markersGroup = new THREE.Group();
    scene.add(markersGroup);

    camera3DRef.current = camera;
    rendererRef.current = renderer;
    markersGroupRef.current = markersGroup;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      markersGroup.children.forEach((g, i) => {
        if (g.userData.baseY !== undefined) {
          g.position.y = g.userData.baseY + Math.sin(t * 1.5 + i) * 0.08;
        }
        g.rotation.y = t * 0.4;
        if (g.userData.ring) {
          g.userData.ring.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.15);
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const nw = canvas.clientWidth || window.innerWidth;
      const nh = canvas.clientHeight || window.innerHeight;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      markersGroup.children.forEach(g => disposeMarkerMesh(g));
      renderer.dispose();
    };
  }, []);

  // Load saved markers after discoveries load
  useEffect(() => {
    if (loading || !discoveries.length) return;
    const saved = loadSavedMarkers();
    const valid = saved.filter(m => discoveries.find(d => d.id === m.discoveryId));
    setPlacedMarkers(valid);
    if (valid.length !== saved.length) saveMarkersToStorage(valid);
  }, [loading, discoveries]);

  // Sync three.js meshes with placedMarkers state
  useEffect(() => {
    const group = markersGroupRef.current;
    if (!group) return;

    const toRemove = group.children.filter(g => !placedMarkers.find(m => m.id === g.userData.markerId));
    toRemove.forEach(g => { group.remove(g); disposeMarkerMesh(g); });

    const existing = new Set(group.children.map(g => g.userData.markerId));
    placedMarkers.forEach(m => {
      if (!existing.has(m.id)) {
        const d = discoveries.find(d => d.id === m.discoveryId);
        if (d) group.add(createMarkerMesh(m, d));
      }
    });
  }, [placedMarkers, discoveries]);

  // Device orientation
  useEffect(() => {
    const handleOrientation = (e) => {
      if (!camera3DRef.current || !orientationActiveRef.current) return;
      const beta = e.beta || 0;
      const gamma = e.gamma || 0;
      const rotX = -(beta - 90) * Math.PI / 180;
      camera3DRef.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      camera3DRef.current.rotation.y = -gamma * Math.PI / 180;
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const enableMotion = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') { orientationActiveRef.current = true; setMotionEnabled(true); }
      } catch { /* ignore */ }
    } else if ('DeviceOrientationEvent' in window) {
      orientationActiveRef.current = true;
      setMotionEnabled(true);
    }
  };

  const toggleMotion = () => {
    if (motionEnabled) { orientationActiveRef.current = false; setMotionEnabled(false); }
    else enableMotion();
  };

  const placeMarker = (discoveryId, position) => {
    const newMarker = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      discoveryId,
      position: { x: position.x, y: position.y, z: position.z },
    };
    setPlacedMarkers(prev => {
      const next = [...prev, newMarker];
      saveMarkersToStorage(next);
      return next;
    });
    setSelectedDiscoveryId(null);
  };

  const removeMarker = (markerId) => {
    setPlacedMarkers(prev => {
      const next = prev.filter(m => m.id !== markerId);
      saveMarkersToStorage(next);
      return next;
    });
    setSelectedMarkerId(null);
  };

  const handlePointerDown = (e) => {
    pointerRef.current = { down: true, x: e.clientX, y: e.clientY, moved: false };
  };

  const handlePointerMove = (e) => {
    if (!pointerRef.current.down) return;
    const dx = e.clientX - pointerRef.current.x;
    const dy = e.clientY - pointerRef.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) pointerRef.current.moved = true;
    if (!motionEnabled && camera3DRef.current) {
      dragRotRef.current.y -= dx * 0.005;
      dragRotRef.current.x -= dy * 0.005;
      dragRotRef.current.x = Math.max(-1, Math.min(1, dragRotRef.current.x));
      camera3DRef.current.rotation.x = dragRotRef.current.x;
      camera3DRef.current.rotation.y = dragRotRef.current.y;
    }
    pointerRef.current.x = e.clientX;
    pointerRef.current.y = e.clientY;
  };

  const handlePointerUp = (e) => {
    if (!pointerRef.current.down) return;
    const moved = pointerRef.current.moved;
    pointerRef.current.down = false;
    if (moved) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera3DRef.current);

    // Check existing markers
    const meshes = [];
    markersGroupRef.current.children.forEach(g => g.children.forEach(c => meshes.push(c)));
    const intersects = raycasterRef.current.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData.markerId) obj = obj.parent;
      if (obj.userData.markerId) { setSelectedMarkerId(obj.userData.markerId); return; }
    }

    // Place new marker
    if (selectedDiscoveryId) {
      const dir = raycasterRef.current.ray.direction.clone().normalize();
      const pos = raycasterRef.current.ray.origin.clone().add(dir.multiplyScalar(PLACE_DISTANCE));
      placeMarker(selectedDiscoveryId, pos);
    } else {
      setSelectedMarkerId(null);
    }
  };

  const selectedDiscovery = discoveries.find(d => d.id === selectedDiscoveryId);
  const selectedMarker = placedMarkers.find(m => m.id === selectedMarkerId);
  const selectedMarkerData = selectedMarker ? discoveries.find(d => d.id === selectedMarker.discoveryId) : null;

  return (
    <div className="absolute inset-0 z-30">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerRef.current.down = false; }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 pt-safe px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="w-10 h-10 rounded-full ar-glass flex items-center justify-center touch-target">
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="px-4 py-1.5 rounded-full ar-glass flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-xs font-semibold text-white">AR MARKERS</span>
          {placedMarkers.length > 0 && <span className="text-xs text-white/50">· {placedMarkers.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleMotion} className="w-10 h-10 rounded-full flex items-center justify-center touch-target"
            style={motionEnabled
              ? { background: 'hsl(175 65% 42% / 0.2)', border: '1px solid hsl(175 65% 42% / 0.5)' }
              : { background: 'hsl(220 14% 8% / 0.72)', border: '1px solid hsl(220 12% 18% / 0.5)' }}>
            <Compass className={`w-5 h-5 ${motionEnabled ? 'text-teal-400' : 'text-white/60'}`} />
          </button>
          <button onClick={onSwitchMode} className="w-10 h-10 rounded-full ar-glass flex items-center justify-center touch-target">
            <Camera className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Hint text */}
      <div className="absolute left-0 right-0 text-center pointer-events-none" style={{ top: '28%' }}>
        {selectedDiscovery ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-teal-400 font-semibold">
            Tap to place "{selectedDiscovery.title}"
          </motion.p>
        ) : placedMarkers.length > 0 ? (
          <p className="text-xs text-white/40">Tap a marker to view · Drag to look around</p>
        ) : !loading && discoveries.length > 0 ? (
          <p className="text-xs text-white/40">Select a discovery below to pin it in your room</p>
        ) : null}
      </div>

      {/* Empty state */}
      {!loading && discoveries.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: '120px' }}>
          <Boxes className="w-10 h-10 text-white/20 mb-3" />
          <p className="text-sm font-heading font-semibold text-white/60 mb-1">No Discoveries Yet</p>
          <p className="text-xs text-white/40 max-w-[240px] text-center">Scan objects with the camera to start placing them in your room</p>
        </div>
      )}

      {/* Info panel */}
      <AnimatePresence>
        {selectedMarkerData && (
          <MarkerInfoPanel
            discovery={selectedMarkerData}
            onView={() => navigate(`/discovery/${selectedMarkerData.id}`)}
            onRemove={() => removeMarker(selectedMarkerId)}
            onClose={() => setSelectedMarkerId(null)}
          />
        )}
      </AnimatePresence>

      {/* Bottom tray */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe">
        <div className="rounded-t-3xl px-3 pt-3 pb-3" style={{ background: 'hsl(220 14% 8% / 0.88)', backdropFilter: 'blur(20px)', borderTop: '1px solid hsl(220 12% 18% / 0.5)' }}>
          <MarkerTray
            discoveries={discoveries}
            selectedId={selectedDiscoveryId}
            onSelect={setSelectedDiscoveryId}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}