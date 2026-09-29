"use client";

import { FloatingOverlapCard } from "@/components/interactive/FloatingOverlapCard";
import { CashFlowChips } from "@/components/interactive/CashFlowChips";
import { SankeyDiagram } from "@/components/interactive/SankeyDiagram";
import { GoalsCards } from "@/components/interactive/GoalsCards";
import { InteractiveLineChart } from "@/components/interactive/InteractiveLineChart";
import { DeviceMockupSection } from "@/components/interactive/DeviceMockupSection";
import { InteractiveBentoGrid } from "@/components/interactive/InteractiveBentoGrid";

export default function InteractiveShowcasePage() {
  return (
    <div className="min-h-screen bg-background text-ink p-4 sm:p-8 md:p-12 flex flex-col gap-20 max-w-[1240px] mx-auto">
      {/* Title */}
      <div className="border-b border-black/[0.08] pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-ember">
          Phase 2 Complete Suite Evaluation
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1">
          Tactile Interactive UI Components Showcase
        </h1>
        <p className="text-sm text-graphite mt-1 max-w-2xl">
          Visual test harness and live interaction suite for all 7 tactile components inspired by Copilot Money, Monarch Money, and YNAB. Responsive across 1440px (desktop), 768px (tablet), and 360px (mobile).
        </p>
      </div>

      {/* Component 1: Floating Overlap Card */}
      <section id="component-1" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-black/[0.05] pb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            1
          </span>
          <h2 className="text-lg font-semibold text-ink">
            Component 1: Floating Overlap Notification & Subscriptions Card
          </h2>
          <span className="text-xs text-graphite">(Refs: 075432 & 075404)</span>
        </div>
        <FloatingOverlapCard />
      </section>

      {/* Component 2: Cash-Flow Floating Chips */}
      <section id="component-2" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-black/[0.05] pb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            2
          </span>
          <h2 className="text-lg font-semibold text-ink">
            Component 2: Cash-Flow Floating Chips with Magnetic & Drag Physics
          </h2>
          <span className="text-xs text-graphite">(Ref: 075230)</span>
        </div>
        <CashFlowChips />
      </section>

      {/* Component 3: Sankey Cash-Flow Diagram */}
      <section id="component-3" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-black/[0.05] pb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            3
          </span>
          <h2 className="text-lg font-semibold text-ink">
            Component 3: Interactive Sankey Cash-Flow Ribbon Diagram
          </h2>
          <span className="text-xs text-graphite">(Refs: 075539 & 075603)</span>
        </div>
        <SankeyDiagram />
      </section>

      {/* Component 4: Goals Cards with Milestone Ticks */}
      <section id="component-4" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-black/[0.05] pb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            4
          </span>
          <h2 className="text-lg font-semibold text-ink">
            Component 4: Interactive Goal Cards with Target Sliders & Milestone Ticks
          </h2>
          <span className="text-xs text-graphite">(Ref: 075552)</span>
        </div>
        <GoalsCards />
      </section>

      {/* Component 5: Interactive Line Chart */}
      <section id="component-5" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-black/[0.05] pb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            5
          </span>
          <h2 className="text-lg font-semibold text-ink">
            Component 5: Interactive Line Chart with Scrubbing Cursor & Budget Delta
          </h2>
          <span className="text-xs text-graphite">(Ref: 075230)</span>
        </div>
        <InteractiveLineChart />
      </section>

      {/* Component 6: Device Mockup Section */}
      <section id="component-6" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-black/[0.05] pb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            6
          </span>
          <h2 className="text-lg font-semibold text-ink">
            Component 6: Dual Device Frame Mockups (Desktop Laptop & Mobile Phone)
          </h2>
          <span className="text-xs text-graphite">(Refs: 075539 & 075603)</span>
        </div>
        <DeviceMockupSection />
      </section>

      {/* Component 7: Interactive Bento Grid */}
      <section id="component-7" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-black/[0.05] pb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            7
          </span>
          <h2 className="text-lg font-semibold text-ink">
            Component 7: Tactile Bento Grid with Cursor Spotlight & Autopilot Toggles
          </h2>
          <span className="text-xs text-graphite">(Full System Integration)</span>
        </div>
        <InteractiveBentoGrid />
      </section>
    </div>
  );
}
