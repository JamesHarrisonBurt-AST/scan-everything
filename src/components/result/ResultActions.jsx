import { motion } from 'framer-motion';
import { Heart, Eye, Bookmark, Share2, Box, Link2, ImageDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ShareCardModal from './ShareCard';

export default function ResultActions({ item, priceSummary }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [watching, setWatching] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSaveToVault = async () => {
    await base44.entities.VaultItem.create({
      identified_item_id: item.id,
      status: 'scanned',
      favorited: false,
      item_title: item.title,
      item_image_url: item.image_primary_url,
      best_price_found: priceSummary?.lowest_price,
      value_label: '',
      category: item.category,
    });
    setSaved(true);
    toast.success('Saved to Vault');
  };

  const handleAddToWatchlist = async () => {
    await base44.entities.WatchlistItem.create({
      identified_item_id: item.id,
      active: true,
      item_title: item.title,
      item_image_url: item.image_primary_url,
      current_best_price: priceSummary?.lowest_price,
      category: item.category,
    });
    setWatching(true);
    toast.success('Added to Watchlist');
  };

  const handleShare = async () => {
    const text = `Check out ${item.title}${priceSummary?.lowest_price ? ` - Best price: $${priceSummary.lowest_price}` : ''} — Found with Scan Everything`;
    if (navigator.share) {
      await navigator.share({ title: item.title, text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/scan-result/${item.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Direct link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleARView = () => {
    if (!item.image_primary_url) { toast.error('No image available for AR preview'); return; }
    navigate(`/ar-view?image=${encodeURIComponent(item.image_primary_url)}&title=${encodeURIComponent(item.title || 'Item')}`);
  };

  const actions = [
    { icon: Bookmark, label: saved ? 'Saved' : 'Save', action: handleSaveToVault, active: saved },
    { icon: Eye, label: watching ? 'Watching' : 'Watch', action: handleAddToWatchlist, active: watching },
    { icon: Box, label: 'View in AR', action: handleARView, active: false },
    { icon: Share2, label: 'Share', action: handleShare, active: false },
  ];

  return (
    <div className="px-4 mt-4">
      <div className="flex gap-2">
        {actions.map((act, i) => {
          const Icon = act.icon;
          return (
            <motion.button
              key={act.label}
              onClick={act.action}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                act.active
                  ? 'bg-cyan-500/15 border border-cyan-500/30'
                  : 'glass-card'
              }`}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Icon className={`w-5 h-5 ${act.active ? 'text-cyan-400' : 'text-muted-foreground'}`} />
              <span className={`text-[11px] ${act.active ? 'text-cyan-400 font-medium' : 'text-muted-foreground'}`}>
                {act.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Share row */}
      <div className="flex gap-2 mt-2">
        <motion.button
          onClick={handleCopyLink}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl glass-card"
          whileTap={{ scale: 0.97 }}
        >
          <Link2 className={`w-4 h-4 ${copied ? 'text-emerald-400' : 'text-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground">{copied ? 'Link Copied!' : 'Copy Direct Link'}</span>
        </motion.button>
        <motion.button
          onClick={() => setShowShareCard(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, hsl(263 70% 58% / 0.15), hsl(190 100% 50% / 0.08))', border: '1px solid hsl(263 70% 58% / 0.25)' }}
          whileTap={{ scale: 0.97 }}
        >
          <ImageDown className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-violet-400 font-medium">Share Image Card</span>
        </motion.button>
      </div>

      {showShareCard && (
        <ShareCardModal item={item} priceSummary={priceSummary} onClose={() => setShowShareCard(false)} />
      )}
    </div>
  );
}