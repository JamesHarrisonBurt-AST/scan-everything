import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function VaultExportButton({ vaultItems }) {
  const [exporting, setExporting] = useState(false);

  const exportCSV = async () => {
    setExporting(true);
    try {
      // Fetch summaries for profit data
      const summaries = await base44.entities.PriceSummary.list('-updated_date', 200);
      const sumMap = {};
      summaries.forEach(s => { sumMap[s.identified_item_id] = s; });

      const headers = ['Title', 'Category', 'Status', 'Best Price Found', 'Market Low', 'Market Avg', 'Market High', 'Deal Score', 'Profit Potential', 'Folder', 'Tags', 'Favorited', 'Date Scanned'];
      const rows = vaultItems.map(v => {
        const s = sumMap[v.identified_item_id];
        const low = s?.lowest_price ?? v.best_price_found ?? '';
        const high = s?.high_price ?? '';
        const avg = s?.average_price ?? '';
        const deal = s?.deal_score ?? '';
        const profit = (high && low) ? (high - low).toFixed(2) : (avg && low) ? (avg - low).toFixed(2) : '';
        const tags = v.tags_json ? JSON.parse(v.tags_json).join('; ') : '';
        return [
          `"${(v.item_title || '').replace(/"/g, '""')}"`,
          `"${(v.category || '').replace(/"/g, '""')}"`,
          v.status || '',
          v.best_price_found ?? '',
          low, avg, high, deal, profit,
          `"${(v.folder || '').replace(/"/g, '""')}"`,
          `"${tags}"`,
          v.favorited ? 'Yes' : 'No',
          v.created_date ? new Date(v.created_date).toISOString() : '',
        ].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Vault exported to CSV');
    } catch {
      toast.error('Export failed');
    }
    setExporting(false);
  };

  return (
    <motion.button
      onClick={exportCSV}
      disabled={exporting || vaultItems.length === 0}
      className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold"
      style={{
        background: 'hsl(160 84% 39% / 0.1)',
        border: '1px solid hsl(160 84% 39% / 0.25)',
        color: '#34d399',
      }}
      whileTap={{ scale: 0.95 }}>
      {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
      <FileSpreadsheet className="w-3 h-3" /> Export
    </motion.button>
  );
}