import { motion } from 'framer-motion';
import { Heart, Eye, Bookmark, Share2, Box } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ResultActions({ item, priceSummary }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [watching, setWatching] = useState(false);

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
              <span className={`text-[10px] ${act.active ? 'text-cyan-400 font-medium' : 'text-muted-foreground'}`}>
                {act.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}