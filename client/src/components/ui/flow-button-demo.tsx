'use client';

import { FlowButton } from "@/components/ui/flow-button";

export function FlowButtonDemo() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-8">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Hesaby ERP Flow Button Variants</h2>
        <p className="text-slate-400 text-sm">Interactive magnetic hover circle expansion effect</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Hesaby Orange Brand Variant */}
        <FlowButton text="ابدأ التجربة المجانية" variant="hesaby" />
        
        {/* Clean White Light Variant for Dark Canvas/Backgrounds */}
        <FlowButton text="استكشف الميزات" variant="light" />

        {/* Default 21st.dev Dark Variant */}
        <div className="bg-white p-4 rounded-2xl">
          <FlowButton text="Flow Button (Default)" variant="dark" />
        </div>
      </div>
    </div>
  );
}

export default FlowButtonDemo;
