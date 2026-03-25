import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Image, FlashlightOff, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import ScanModeSelector from '../components/scan/ScanModeSelector';
import ScannerViewfinder from '../components/scan/ScannerViewfinder';
import ShimmerLoader from '../components/ShimmerLoader';

export default function Scan() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('camera');
  const [isScanning, setIsScanning] = useState(false);
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

    // Call OpenAI backend — GPT-4o vision + gpt-4o-search-preview for real prices
    const response = await base44.functions.invoke('scanProduct', {
      image_url: imageUrl || undefined,
      query: query || undefined,
      observed_price: observedPrice ? parseFloat(observedPrice) : undefined,
    });

    const { identified, listings, price_summary: ps, value_assessment: va, search_query_used } = response.data;

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

    setIsProcessing(false);
    navigate(`/scan-result/${item.id}`);
  };

  const handleManualSearch = () => {
    if (!manualQuery.trim()) return;
    processScan({ query: manualQuery.trim() });
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      fileInputRef.current?.click();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-heading text-lg font-bold text-foreground">Scan</h1>
      </div>

      <ScanModeSelector activeMode={mode} onModeChange={setMode} />

      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            className="flex flex-col items-center justify-center px-6 mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full border-2 border-cyan-500/30 flex items-center justify-center mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-14 h-14 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </motion.div>
            <motion.p
              className="text-sm text-foreground font-medium mb-2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Analyzing your scan...
            </motion.p>
            <ShimmerLoader className="w-48 mt-4" />
            <div className="mt-6 space-y-2">
              {['Identifying object...', 'Searching prices online...', 'Checking value potential...'].map((text, i) => (
                <motion.p
                  key={text}
                  className="text-xs text-muted-foreground text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 3 }}
                >
                  {text}
                </motion.p>
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