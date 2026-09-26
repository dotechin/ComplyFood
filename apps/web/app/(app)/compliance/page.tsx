import { ComplianceSection } from './compliance-section';

export default function CompliancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">European law compliance</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Official EU food hygiene documentation, public downloads, and national guidance for your selected language.
        </p>
      </div>
      <ComplianceSection />
    </div>
  );
}
