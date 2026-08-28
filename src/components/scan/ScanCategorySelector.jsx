import { motion } from 'framer-motion';
import { Package, Car, Leaf, Smartphone, Shirt, Gem, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SCAN_CATEGORIES = [
  { id: 'product', label: 'Product', icon: Package, color: '#00d4ff', hint: 'Any retail product' },
  { id: 'vehicle', label: 'Vehicle', icon: Car, color: '#3b82f6', hint: 'Cars & motorcycles' },
  { id: 'plant', label: 'Plant', icon: Leaf, color: '#10b981', hint: 'Houseplants & wild plants' },
  { id: 'electronics', label: 'Electronics', icon: Smartphone, color: '#8b5cf6', hint: 'Phones, laptops, gadgets' },
  { id: 'clothing', label: 'Clothing', icon: Shirt, color: '#ec4899', hint: 'Apparel & accessories' },
  { id: 'collectible', label: 'Collectible', icon: Gem, color: '#f59e0b', hint: 'Toys, cards, antiques' },
  { id: 'document', label: 'Document', icon: FileText, color: '#64748b', hint: 'Labels, receipts, docs' },
];

export function getCategoryPromptInstruction(category) {
  const instructions = {
    product: 'Identify the product and search the web for current real market prices across major retailers and marketplaces (eBay, Amazon, StockX, Mercari, etc.).',
    vehicle: 'Identify the vehicle (car, truck, motorcycle, etc.). Extract: make, model, year (if visible), body type, color, and any visible VIN characters. Estimate market value range. Note common issues for this model. Store vehicle details (make, model, year, body_type, fuel_type, estimated_mpg, common_issues) in attributes_json.',
    plant: 'Identify the plant species. Provide: common name, scientific name, care instructions (light requirements, watering frequency, soil type, temperature range), toxicity warnings (pets/humans), indoor/outdoor suitability. Store plant details (species, scientific_name, light, water, soil, temperature, toxicity, indoor_outdoor) in attributes_json.',
    electronics: 'Identify the electronic device. Extract: brand, exact model number (if visible), key specs (storage, RAM, screen size, etc.), release year. Note any known issues or recalls. Store electronics details (model_number, specs, release_year, battery_life, known_issues) in attributes_json.',
    clothing: 'Identify the clothing item. Extract: brand, size (if visible on tag), material composition, style/category. Note authenticity indicators (logos, stitching, tags). Look up retail price and resale value. Store clothing details (brand, size, material, style, care_instructions, authenticity_tips) in attributes_json.',
    collectible: 'Identify the collectible (trading cards, toys, coins, antiques, etc.). Extract: what it is, era/age, edition/rarity, manufacturer/brand, condition factors. Look up recent auction/sale prices. Note authentication tips. Store collectible details (era, edition, rarity, manufacturer, condition_factors, authentication_tips) in attributes_json.',
    document: 'Analyze the document, label, or receipt. Extract all visible text using OCR. Identify: document type, key dates, important fields (prices, product names, addresses), and provide a summary. If it is a product label, identify the product and look up pricing. Store extracted text and document details (document_type, key_dates, important_fields, summary) in attributes_json.',
  };
  return instructions[category] || instructions.product;
}

export function getSuggestedQuestions(category) {
  const questions = {
    vehicle: ['What is this vehicle worth?', 'What are common problems with this model?', 'Is this a good deal?', 'What should I check before buying?'],
    plant: ['How do I care for this plant?', 'Is this plant toxic to pets?', 'How often should I water it?', 'Can this grow indoors?'],
    electronics: ['What is this device worth used?', 'Are there any known issues?', 'When was this released?', 'Is this model still supported?'],
    clothing: ['Is this item authentic?', 'What is the resale value?', 'How do I verify the size?', 'What material is this made of?'],
    collectible: ['How rare is this item?', 'What is it worth?', 'How can I tell if it is authentic?', 'Is this a good investment?'],
    document: ['What does this document say?', 'What are the key dates?', 'Is there any action required?', 'Can you summarize this?'],
    product: ['What is this worth?', 'Where can I buy it cheapest?', 'Is this a good deal?', 'What is the resale value?'],
  };
  return questions[category] || questions.product;
}

export default function ScanCategorySelector({ activeCategory, onCategoryChange }) {
  return (
    <div className="px-4 mt-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Scan Type</p>
      <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {SCAN_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 w-16 py-2.5 rounded-xl transition-all flex-shrink-0',
                  isActive ? 'border' : 'border border-transparent'
                )}
                style={{
                  background: isActive ? `${cat.color}15` : 'hsl(240 12% 10%)',
                  borderColor: isActive ? `${cat.color}40` : 'transparent',
                }}
                whileTap={{ scale: 0.94 }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: isActive ? `${cat.color}20` : 'hsl(240 12% 14%)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: isActive ? cat.color : 'hsl(220 10% 55%)' }} />
                </div>
                <span
                  className="text-[11px] font-medium whitespace-nowrap"
                  style={{ color: isActive ? cat.color : 'hsl(220 10% 55%)' }}
                >
                  {cat.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}