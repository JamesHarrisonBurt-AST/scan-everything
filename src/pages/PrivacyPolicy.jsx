import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 pt-safe-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(190 100% 50% / 0.1)', border: '1px solid hsl(190 100% 50% / 0.25)' }}>
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground">Last updated: August 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">1. Overview</h2>
            <p>Scan Everything is a free tool for identifying real-world objects, estimating their value, and finding the best deals online. We are committed to protecting your privacy and being transparent about how your data is used.</p>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-foreground font-medium">Account info:</span> Your email address and display name when you create an account.</li>
              <li><span className="text-foreground font-medium">Scan data:</span> Photos you upload or capture, identified item details, and price results you choose to save to your vault.</li>
              <li><span className="text-foreground font-medium">Community content:</span> Deals you post, including titles, prices, and images you share publicly.</li>
              <li><span className="text-foreground font-medium">Usage data:</span> Anonymous analytics about feature usage to improve the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To identify items in your scans and retrieve market pricing.</li>
              <li>To save your vault, watchlist, and sell listings.</li>
              <li>To display community deals you choose to share.</li>
              <li>To send optional price drop notifications you enable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">4. Camera & Photos</h2>
            <p>The app requests camera and photo library access only when you initiate a scan or AR preview. Images are processed to identify items and are stored only if you save the result to your vault.</p>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">5. Data Storage & Security</h2>
            <p>Your data is stored securely on our platform infrastructure. We do not sell your personal data to third parties. Community deal posts are visible to other users as intended.</p>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">6. Your Rights</h2>
            <p>You can delete your vault items, watchlist, sell listings, and community posts at any time within the app. You may request account deletion by contacting support.</p>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">7. Children's Privacy</h2>
            <p>The app is not directed to children under 13 and we do not knowingly collect data from them.</p>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">8. No Fees or Subscriptions</h2>
            <p>Scan Everything is completely free. There are no in-app purchases, subscriptions, or hidden fees. All features are available to all users at no cost.</p>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">9. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Continued use of the app constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-base font-heading font-bold text-foreground mb-2">10. Contact</h2>
            <p>For privacy questions, please contact Base44 support.</p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-border/40">
          <Link to="/profile" className="text-cyan-400 text-sm">← Back to Profile</Link>
        </div>
      </div>
    </div>
  );
}