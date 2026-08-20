import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Image, FlashlightOff, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import ScanModeSelector from '../components/scan/ScanModeSelector';
import ScannerViewfinder from '../components/scan/ScannerViewfinder';
import CameraCapture from '../components/scan/CameraCapture';

export default function Scan() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [observedPrice, setObservedPrice] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processScan({ file });
  };

  const processScan = async ({ file, query }) => {
    setIsProcessing(true);

    let imageUrl = '';
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      imageUrl = file_url;
    }

    // Create scan session
    const session = await base44.entities.ScanSession.create({
      scan_mode: file ? 'gallery_upload' : 'manual_search',
      input_source_type: file ? 'photo_library' : 'typed_query',
      image_url: imageUrl,
      raw_user_query: query || '',
      current_observed_price: observedPrice ? parseFloat(observedPrice) : undefined,
      status: 'identifying',
    });

    // Call AI directly — vision + web search for real prices
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert product identification and pricing AI.
${file ? 'Analyze the attached photo of a product.' : `Analyze this product description/query: "${query}"`}
${observedPrice ? `The user saw this item priced at $${observedPrice}.` : ''}

Identify the specific product, then search the web for its current real market prices across major retailers and marketplaces (eBay, Amazon, StockX, Mercari, etc.).

Return a JSON object with:
- identified: { title, brand, model, category, subcategory, description, confidence_score (0-100), condition_guess, attributes_json (JSON string) }
- search_query_used: string (the optimized search query you used)
- listings: array of up to 8 objects, each { source_name, source_type ("online_retailer"|"marketplace"|"auction"|"resale"|"local"), listing_title, price_amount, condition_label, product_url, availability_label, notes }
- price_summary: { lowest_price, median_price, high_price, average_price, deal_score (0-100), recommendation_label, difference_from_observed }
- value_assessment: { value_verdict, resale_potential_score (0-100), collectible_potential_score (0-100), rarity_signal_score (0-100), research_recommended (boolean), reasoning (array of strings), cautionary_notes }`,
      file_urls: file ? [imageUrl] : undefined,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          identified: {
            type: 'object',
            properties: {
              title: { type: 'string' }, brand: { type: 'string' }, model: { type: 'string' },
              category: { type: 'string' }, subcategory: { type: 'string' }, description: { type: 'string' },
              confidence_score: { type: 'number' }, condition_guess: { type: 'string' }, attributes_json: { type: 'string' },
            },
          },
          search_query_used: { type: 'string' },
          listings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source_name: { type: 'string' }, source_type: { type: 'string' }, listing_title: { type: 'string' },
                price_amount: { type: 'number' }, condition_label: { type: 'string' }, product_url: { type: 'string' },
                availability_label: { type: 'string' }, notes: { type: 'string' },
              },
            },
          },
          price_summary: {
            type: 'object',
            properties: {
              lowest_price: { type: 'number' }, median_price: { type: 'number' }, high_price: { type: 'number' },
              average_price: { type: 'number' }, deal_score: { type: 'number' }, recommendation_label: { type: 'string' },
              difference_from_observed: { type: 'number' },
            },
          },
          value_assessment: {
            type: 'object',
            properties: {
              value_verdict: { type: 'string' }, resale_potential_score: { type: 'number' },
              collectible_potential_score: { type: 'number' }, rarity_signal_score: { type: 'number' },
              research_recommended: { type: 'boolean' }, reasoning: { type: 'array', items: { type: 'string' } },
              cautionary_notes: { type: 'string' },
            },
          },
        },
      },
    });

    const { identified, listings, price_summary: ps, value_assessment: va, search_query_used } = result;

    // Save identified item
    const item = await base44.entities.IdentifiedItem.create({
      scan_session_id: session.id,
      title: identified.title || 'Unknown Item',
      brand: identified.brand || '',
      model: identified.model || '',
      category: identified.category || '',
      subcategory: identified.subcategory || '',
      description: identified.description || '',
      confidence_score: identified.confidence_score || 50,
      condition_guess: identified.condition_guess || '',
      attributes_json: identified.attributes_json || '{}',
      image_primary_url: imageUrl,
      normalized_search_query: search_query_used || identified.title,
    });

    // Save price results
    for (const listing of (listings || []).slice(0, 10)) {
      await base44.entities.PriceResult.create({
        identified_item_id: item.id,
        source_name: listing.source_name || 'Unknown',
        source_type: listing.source_type || 'online_retailer',
        listing_title: listing.listing_title || '',
        price_amount: listing.price_amount || 0,
        currency: 'USD',
        condition_label: listing.condition_label || '',
        product_url: listing.product_url || '',
        availability_label: listing.availability_label || '',
        confidence_score: 85,
        notes: listing.notes || '',
      });
    }

    const obs = observedPrice ? parseFloat(observedPrice) : null;
    await base44.entities.PriceSummary.create({
      identified_item_id: item.id,
      lowest_price: ps.lowest_price || 0,
      median_price: ps.median_price || 0,
      high_price: ps.high_price || 0,
      average_price: ps.average_price || 0,
      observed_price: obs || undefined,
      difference_from_observed: ps.difference_from_observed || (obs && ps.lowest_price ? obs - ps.lowest_price : undefined),
      deal_score: ps.deal_score || 50,
      recommendation_label: ps.recommendation_label || 'Fair Price',
    });

    await base44.entities.ValueAssessment.create({
      identified_item_id: item.id,
      value_verdict: va.value_verdict || 'Common',
      resale_potential_score: va.resale_potential_score || 0,
      collectible_potential_score: va.collectible_potential_score || 0,
      rarity_signal_score: va.rarity_signal_score || 0,
      research_recommended: va.research_recommended || false,
      reasoning_json: JSON.stringify(va.reasoning || []),
      cautionary_notes: va.cautionary_notes || '',
    });

    await base44.entities.ScanSession.update(session.id, { status: 'complete' });

    // Save to Vault automatically
    await base44.entities.VaultItem.create({
      identified_item_id: item.id,
      status: 'scanned',
      item_title: item.title,
      item_image_url: imageUrl || '',
      best_price_found: ps.lowest_price || undefined,
      value_label: ps.recommendation_label || '',
      category: identified.category || '',
      favorited: false,
    });

    setIsProcessing(false);
    navigate(`/scan-result/${item.id}`);
  };

  const handleManualSearch = () => {
    if (!manualQuery.trim()) return;
    processScan({ query: manualQuery.trim() });
  };

  const handleSimulateScan = () => {
    setCameraOpen(true);
  };

  const handleCameraCapture = async (file) => {
    setCameraOpen(false);
    await processScan({ file });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pb-4 pt-safe-12">
        <h1 className="font-heading text-lg font-bold text-foreground">Scan</h1>
      </div>

      {cameraOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}

      <ScanModeSelector activeMode={mode} onModeChange={setMode} />

      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            className="flex flex-col items-center justify-center px-6 mt-20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            {/* Pulsing rings + central glow */}
            <div className="relative w-32 h-32 flex items-center justify-center mb-8">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '1px solid hsl(190 100% 50% / 0.3)' }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{ border: '1px solid hsl(263 70% 58% / 0.3)' }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
              />
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle, hsl(190 100% 50% / 0.15) 0%, hsl(263 70% 58% / 0.08) 100%)',
                  border: '1px solid hsl(190 100% 50% / 0.25)',
                  boxShadow: '0 0 40px hsl(190 100% 50% / 0.15), inset 0 0 20px hsl(190 100% 50% / 0.05)',
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  className="w-12 h-12 rounded-full border-2 border-cyan-400/40 border-t-cyan-400"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>

            <motion.p
              className="text-sm font-heading font-semibold text-foreground mb-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Analyzing your scan
            </motion.p>
            <motion.p
              className="text-xs text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              AI vision + live web search
            </motion.p>

            {/* Staggered step cards */}
            <div className="space-y-2.5 w-full max-w-xs">
              {['Identifying object', 'Searching prices online', 'Checking value potential'].map((label, i) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(240 10% 16%)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'hsl(190 100% 50% / 0.1)', border: '1px solid hsl(190 100% 50% / 0.2)' }}
                    animate={{ background: ['hsl(190 100% 50% / 0.1)', 'hsl(190 100% 50% / 0.25)', 'hsl(190 100% 50% / 0.1)'] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full bg-cyan-400"
                      animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                    />
                  </motion.div>
                  <span className="text-xs text-muted-foreground">{label}...</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mt-8"
          >
            {(mode === 'camera' || mode === 'barcode') && (
              <div className="flex flex-col items-center px-4">
                <ScannerViewfinder
                  isScanning={isScanning}
                  hint={isScanning ? 'Scanning...' : mode === 'barcode' ? 'Point at a barcode' : 'Point at any product'}
                />

                <div className="mt-14 flex flex-col items-center gap-4 w-full max-w-xs">
                  <Button
                    onClick={handleSimulateScan}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-heading font-semibold"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    {mode === 'barcode' ? 'Scan Barcode' : 'Take Photo'}
                  </Button>

                  <div className="flex items-center gap-2 w-full">
                    <Input
                      placeholder="Current shelf price (optional)"
                      value={observedPrice}
                      onChange={(e) => setObservedPrice(e.target.value)}
                      type="number"
                      className="bg-muted border-border/50 text-foreground"
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Take a photo or upload an image to identify and price any product
                  </p>
                </div>
              </div>
            )}

            {mode === 'upload' && (
              <div className="flex flex-col items-center px-4">
                <motion.div
                  className="w-full max-w-xs aspect-square rounded-2xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/30 transition-colors"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Tap to upload image</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">JPG, PNG supported</p>
                </motion.div>

                <Input
                  placeholder="Current shelf price (optional)"
                  value={observedPrice}
                  onChange={(e) => setObservedPrice(e.target.value)}
                  type="number"
                  className="bg-muted border-border/50 text-foreground mt-4 max-w-xs"
                />
              </div>
            )}

            {mode === 'text' && (
              <div className="px-4 max-w-md mx-auto">
                <div className="space-y-3">
                  <Input
                    placeholder="Describe the item or enter model number..."
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    className="bg-muted border-border/50 text-foreground h-12"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  />
                  <Input
                    placeholder="Current shelf price (optional)"
                    value={observedPrice}
                    onChange={(e) => setObservedPrice(e.target.value)}
                    type="number"
                    className="bg-muted border-border/50 text-foreground"
                  />
                  <Button
                    onClick={handleManualSearch}
                    disabled={!manualQuery.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-heading font-semibold"
                  >
                    <Zap className="w-5 h-5 mr-2" /> Search & Analyze
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}