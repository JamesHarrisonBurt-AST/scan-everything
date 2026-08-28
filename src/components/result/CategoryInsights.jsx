import { motion } from 'framer-motion';
import { Car, Leaf, Smartphone, Shirt, Gem, FileText, Package } from 'lucide-react';
import DepthReveal from './DepthReveal';

const CATEGORY_CONFIG = {
  vehicle: { icon: Car, color: '#3b82f6', label: 'Vehicle Details' },
  plant: { icon: Leaf, color: '#10b981', label: 'Plant Care Guide' },
  electronics: { icon: Smartphone, color: '#8b5cf6', label: 'Device Specs' },
  clothing: { icon: Shirt, color: '#ec4899', label: 'Item Details' },
  collectible: { icon: Gem, color: '#f59e0b', label: 'Collectible Info' },
  document: { icon: FileText, color: '#64748b', label: 'Document Analysis' },
  product: { icon: Package, color: '#00d4ff', label: 'Product Details' },
};

const FIELD_LABELS = {
  make: 'Make', model: 'Model', year: 'Year', body_type: 'Body Type', fuel_type: 'Fuel Type',
  estimated_mpg: 'Est. MPG', common_issues: 'Common Issues', vin: 'VIN',
  species: 'Species', scientific_name: 'Scientific Name', light: 'Light Needs',
  water: 'Watering', soil: 'Soil Type', temperature: 'Temperature', toxicity: 'Toxicity',
  indoor_outdoor: 'Indoor/Outdoor',
  model_number: 'Model Number', specs: 'Specifications', release_year: 'Release Year',
  battery_life: 'Battery Life', known_issues: 'Known Issues',
  brand: 'Brand', size: 'Size', material: 'Material', style: 'Style',
  care_instructions: 'Care Instructions', authenticity_tips: 'Authenticity Tips',
  era: 'Era', edition: 'Edition', rarity: 'Rarity', manufacturer: 'Manufacturer',
  condition_factors: 'Condition Factors', authentication_tips: 'Authentication Tips',
  document_type: 'Document Type', key_dates: 'Key Dates', important_fields: 'Important Fields',
  summary: 'Summary', extracted_text: 'Extracted Text',
};

function parseAttributes(item) {
  if (!item.attributes_json) return {};
  try {
    return typeof item.attributes_json === 'string'
      ? JSON.parse(item.attributes_json)
      : item.attributes_json;
  } catch {
    return {};
  }
}

export default function CategoryInsights({ item }) {
  const attrs = parseAttributes(item);
  const category = (item.category || 'product').toLowerCase();
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.product;
  const Icon = config.icon;

  // Get category-specific fields (exclude generic ones handled elsewhere)
  const entries = Object.entries(attrs).filter(([key]) => {
    const lower = key.toLowerCase();
    return !['title', 'description', 'confidence_score', 'condition_guess'].includes(lower);
  });

  if (entries.length === 0) return null;

  return (
    <DepthReveal delay={0.35}>
      <div className="px-4 mt-4">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${config.color}15` }}>
              <Icon className="w-4 h-4" style={{ color: config.color }} />
            </div>
            <h3 className="text-sm font-heading font-semibold text-foreground">{config.label}</h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {entries.map(([key, value], i) => {
              const label = FIELD_LABELS[key?.toLowerCase()] || key?.replace(/_/g, ' ') || key;
              const isLongText = typeof value === 'string' && value.length > 60;
              const isBool = typeof value === 'boolean';

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl p-2.5 ${isLongText ? 'col-span-2' : ''}`}
                  style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 16%)' }}
                >
                  <p className="text-[11px] text-muted-foreground mb-0.5 capitalize">{label}</p>
                  {isBool ? (
                    <p className="text-xs font-medium" style={{ color: value ? '#10b981' : 'hsl(220 10% 55%)' }}>
                      {value ? 'Yes' : 'No'}
                    </p>
                  ) : Array.isArray(value) ? (
                    <p className="text-xs text-foreground">{value.join(', ')}</p>
                  ) : (
                    <p className="text-xs text-foreground leading-relaxed">{String(value)}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </DepthReveal>
  );
}