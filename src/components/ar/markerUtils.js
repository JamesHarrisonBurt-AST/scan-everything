import * as THREE from 'three';

export const STORAGE_KEY = 'curio_ar_markers';
export const PLACE_DISTANCE = 3;

export const RARITY_COLORS = {
  common: 0x999999,
  interesting: 0x2dd4bf,
  unusual: 0xc084fc,
  exceptional: 0xfbbf24,
};

export function loadSavedMarkers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function saveMarkersToStorage(markers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  } catch { /* ignore */ }
}

export function createMarkerMesh(marker, discovery) {
  const color = RARITY_COLORS[discovery.rarity] || RARITY_COLORS.common;
  const group = new THREE.Group();
  group.userData.markerId = marker.id;
  group.userData.discoveryId = marker.discoveryId;
  group.position.set(marker.position.x, marker.position.y, marker.position.z);
  group.userData.baseY = marker.position.y;

  // Gem (octahedron)
  const gemGeo = new THREE.OctahedronGeometry(0.12, 0);
  const gemMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.5,
    metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.92,
  });
  group.add(new THREE.Mesh(gemGeo, gemMat));

  // Inner glow sphere
  const glowGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  // Ring/halo
  const ringGeo = new THREE.TorusGeometry(0.2, 0.01, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  group.userData.ring = ring;

  // Pin stem
  const pinGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.15, 8);
  const pinMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.y = -0.15;
  group.add(pin);

  return group;
}

export function disposeMarkerMesh(group) {
  group.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
}