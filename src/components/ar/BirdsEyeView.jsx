import { motion } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { getZoneLabel } from './markerUtils';

const CLUSTER_COLORS = [
  { bg: 'rgba(245, 158, 11, 0.14)', stroke: '#f59e0b', dot: '#fbbf24' },
  { bg: 'rgba(45, 212, 191, 0.14)', stroke: '#2dd4bf', dot: '#2dd4bf' },
  { bg: 'rgba(192, 132, 252, 0.14)', stroke: '#c084fc', dot: '#c084fc' },
  { bg: 'rgba(52, 211, 153, 0.14)', stroke: '#34d399', dot: '#34d399' },
  { bg: 'rgba(244, 63, 94, 0.14)', stroke: '#f43f5e', dot: '#fb7185' },
  { bg: 'rgba(96, 165, 250, 0.14)', stroke: '#60a5fa', dot: '#60a5fa' },
];

export default function BirdsEyeView({ markers, discoveries, clusters, onClose }) {
  if (markers.length === 0) return null;

  const padding = 1.5;
  const allX = [0, ...markers.map(m => m.position.x)];
  const allZ = [0, ...markers.map(m => m.position.z)];
  const minX = Math.min(...allX) - padding;
  const maxX = Math.max(...allX) + padding;
  const minZ = Math.min(...allZ) - padding;
  const maxZ = Math.max(...allZ) + padding;
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxZ - minZ, 1);
  const span = Math.max(width, height);

  const toSvgX = (x) => ((x - minX) / span) * 100;
  const toSvgY = (z) => ((z - minZ) / span) * 100;

  const clusterData = clusters.map((cluster, i) => {
    const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
    const cx = cluster.reduce((s, m) => s + m.position.x, 0) / cluster.length;
    const cz = cluster.reduce((s, m) => s + m.position.z, 0) / cluster.length;
    const maxDist = Math.max(...cluster.map(m => Math.sqrt((m.position.x - cx) ** 2 + (m.position.z - cz) ** 2)));
    return {
      color,
      centroid: { x: cx, z: cz },
      radius: Math.max((Math.max(maxDist + 0.5, 1)) / span) * 100,
      label: getZoneLabel({ x: cx, z: cz }),
      markers: cluster,
    };
  });

  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'hsl(220 18% 5% / 0.96)', backdropFilter: 'blur(16px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pt-safe px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-foreground text-lg">Bird's-Eye View</h2>
          <p className="text-xs text-muted-foreground">{markers.length} markers · {clusters.length} zone{clusters.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full glass-card flex items-center justify-center touch-target">
          <X className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <svg viewBox="0 0 100 100" className="w-full max-w-[300px] aspect-square" style={{ background: 'hsl(220 14% 8%)', borderRadius: '1rem', border: '1px solid hsl(220 12% 18%)' }}>
          {[20, 40, 60, 80].map(v => (
            <g key={`grid-${v}`}>
              <line x1={v} y1={0} x2={v} y2={100} stroke="hsl(220 12% 14%)" strokeWidth={0.3} />
              <line x1={0} y1={v} x2={100} y2={v} stroke="hsl(220 12% 14%)" strokeWidth={0.3} />
            </g>
          ))}

          {clusterData.map((cd, i) => (
            <g key={`cluster-${i}`}>
              <circle cx={toSvgX(cd.centroid.x)} cy={toSvgY(cd.centroid.z)} r={Math.max(cd.radius, 5)} fill={cd.color.bg} stroke={cd.color.stroke} strokeWidth={0.4} strokeDasharray="1.5,1" />
              <text x={toSvgX(cd.centroid.x)} y={toSvgY(cd.centroid.z) - Math.max(cd.radius, 5) - 1.5} textAnchor="middle" fill={cd.color.stroke} fontSize={2.5} fontWeight="bold">
                {cd.label}
              </text>
            </g>
          ))}

          {markers.map((m) => {
            const clusterIdx = clusters.findIndex(c => c.some(cm => cm.id === m.id));
            const color = clusterIdx >= 0 ? CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length] : CLUSTER_COLORS[0];
            const discovery = discoveries.find(d => d.id === m.discoveryId);
            return (
              <g key={m.id}>
                <circle cx={toSvgX(m.position.x)} cy={toSvgY(m.position.z)} r={2.5} fill={color.dot} stroke="white" strokeWidth={0.5} />
                {discovery && (
                  <text x={toSvgX(m.position.x)} y={toSvgY(m.position.z) + 5} textAnchor="middle" fill="white" fontSize={1.8} opacity={0.7}>
                    {discovery.title.length > 10 ? discovery.title.slice(0, 9) + '…' : discovery.title}
                  </text>
                )}
              </g>
            );
          })}

          <g>
            <circle cx={toSvgX(0)} cy={toSvgY(0)} r={3.5} fill="rgba(255,255,255,0.08)" stroke="white" strokeWidth={0.5} />
            <circle cx={toSvgX(0)} cy={toSvgY(0)} r={1.5} fill="white" />
            <text x={toSvgX(0)} y={toSvgY(0) - 5} textAnchor="middle" fill="white" fontSize={2} opacity={0.5}>You</text>
          </g>
        </svg>
      </div>

      <div className="pb-safe px-4 pb-4 max-h-[220px] overflow-y-auto">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Auto-Grouped Zones</p>
        <div className="space-y-2">
          {clusterData.map((cd, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'hsl(220 14% 8%)', border: `1px solid ${cd.color.stroke}40` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cd.color.bg }}>
                <MapPin className="w-4 h-4" style={{ color: cd.color.stroke }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{cd.label}</p>
                <p className="text-[11px] text-muted-foreground">{cd.markers.length} marker{cd.markers.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex -space-x-1.5 flex-shrink-0">
                {cd.markers.slice(0, 3).map((m) => {
                  const d = discoveries.find(d => d.id === m.discoveryId);
                  return d?.image_url ? (
                    <img key={m.id} src={d.image_url} alt="" className="w-7 h-7 rounded-lg object-cover" style={{ border: '2px solid hsl(220 14% 9%)' }} />
                  ) : (
                    <div key={m.id} className="w-7 h-7 rounded-lg" style={{ background: cd.color.bg, border: '2px solid hsl(220 14% 9%)' }} />
                  );
                })}
                {cd.markers.length > 3 && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground" style={{ background: 'hsl(220 12% 12%)', border: '2px solid hsl(220 14% 9%)' }}>
                    +{cd.markers.length - 3}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}