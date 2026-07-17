"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  TrendingUp, 
  Copy, 
  RotateCw, 
  Check, 
  Search, 
  Sparkles, 
  Filter, 
  ArrowRight,
  ExternalLink,
  MessageSquareCode
} from "lucide-react";
import { toast } from "react-hot-toast";
import { forceSyncTrendsAction, updateTenantTrendsConfigAction } from "@/app/actions/uk-trends";

interface TrendItem {
  id: string;
  keyword: string;
  traffic: string;
  spikePercent: number;
  newsUrl: string;
  newsTitle: string;
  newsSource: string;
  category: string;
  createdAt: Date;
}

interface UKMarketTrendsListProps {
  initialTrends: TrendItem[];
  currentUser: {
    id: string;
    email: string;
    role: string;
    companyId?: string | null;
    name?: string | null;
  };
  companyName: string | null;
  initialConfig: {
    defaultCategory: string;
    notes: string | null;
  } | null;
}

// Fallback high-fidelity mock trends if Google Trends doesn't return matching categories for today
const FALLBACK_TRENDS: Record<string, Omit<TrendItem, "id" | "createdAt">[]> = {
  BEDS: [
    {
      keyword: "Luxury Velvet Bed Frames",
      traffic: "15,000+",
      spikePercent: 480,
      newsTitle: "UK Bed Design Trends: Velvet Frames Experience Exploding Demand",
      newsUrl: "https://www.furnitureuk.co.uk/design-trends",
      newsSource: "Furniture UK",
      category: "BEDS"
    },
    {
      keyword: "Orthopaedic Mattresses Sale",
      traffic: "8,000+",
      spikePercent: 310,
      newsTitle: "UK Sleep Council Reports Rise in Orthopaedic Sleep Solutions",
      newsUrl: "https://www.sleepcouncil.org.uk/news",
      newsSource: "Sleep Council",
      category: "BEDS"
    },
    {
      keyword: "Space-saving Ottoman Beds",
      traffic: "5,000+",
      spikePercent: 220,
      newsTitle: "Small Living Spaces Drive Demand for Ottoman Storage Beds",
      newsUrl: "https://www.interiordesign.co.uk/ottoman-trend",
      newsSource: "Interior Design",
      category: "BEDS"
    }
  ],
  SOFAS: [
    {
      keyword: "Modular Corner Sofas",
      traffic: "22,000+",
      spikePercent: 520,
      newsTitle: "Flexible Living: Why Modular Sofas Are Dominating Living Rooms",
      newsUrl: "https://www.homesandgardens.co.uk/sofa-trends",
      newsSource: "Homes & Gardens",
      category: "SOFAS"
    },
    {
      keyword: "Boucle Fabric Couches",
      traffic: "10,000+",
      spikePercent: 380,
      newsTitle: "Boucle Texture Remains a Design Staple for 2026 Homeowners",
      newsUrl: "https://www.livingetc.com/boucle-couch",
      newsSource: "Livingetc",
      category: "SOFAS"
    },
    {
      keyword: "Ergonomic Recliners",
      traffic: "6,000+",
      spikePercent: 190,
      newsTitle: "Therapeutic Seating Options Experience Rise in Remote Work Era",
      newsUrl: "https://www.ergonomics-today.co.uk/recliners",
      newsSource: "Ergonomics Today",
      category: "SOFAS"
    }
  ],
  WARDROBES: [
    {
      keyword: "Walk-in Wardrobe Systems",
      traffic: "12,000+",
      spikePercent: 410,
      newsTitle: "Home Renovation Audits Show Surge in Closet Wardrobe Systems",
      newsUrl: "https://www.idealhome.co.uk/wardrobe-systems",
      newsSource: "Ideal Home",
      category: "WARDROBES"
    },
    {
      keyword: "Sliding Mirror Wardrobes",
      traffic: "7,000+",
      spikePercent: 280,
      newsTitle: "Mirrored Sliding Wardrobe Sales Spike in UK Urban Apartments",
      newsUrl: "https://www.apartmenttherapy.com/sliding-mirrors",
      newsSource: "Apartment Therapy",
      category: "WARDROBES"
    },
    {
      keyword: "Built-in Cabinet Storage",
      traffic: "4,000+",
      spikePercent: 140,
      newsTitle: "Custom Built-in Wardrobes Become Top Value Adder for UK Sellers",
      newsUrl: "https://www.propertytimes.co.uk/built-in-cabinets",
      newsSource: "Property Times",
      category: "WARDROBES"
    }
  ]
};

export default function UKMarketTrendsList({ 
  initialTrends, 
  currentUser, 
  companyName,
  initialConfig
}: UKMarketTrendsListProps) {
  const [trends, setTrends] = useState<TrendItem[]>(initialTrends);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialConfig?.defaultCategory || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTemplateType, setSelectedTemplateType] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [copiedPitch, setCopiedPitch] = useState<string | null>(null);

  // Auto-sync configuration choice to database
  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    startTransition(async () => {
      try {
        const res = await updateTenantTrendsConfigAction(val);
        if (res.success) {
          toast.success(`Default category updated to ${val.replace("_", " ")}`);
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Sync feed from server scraper
  const handleSyncTrends = () => {
    toast.loading("Syncing UK trends from public Google feeds...", { id: "sync-trends" });
    startTransition(async () => {
      try {
        const res = await forceSyncTrendsAction();
        if (res.success) {
          toast.success(`Successfully loaded ${res.count} fresh UK Trends!`, { id: "sync-trends" });
          window.location.reload();
        } else {
          toast.error(res.error || "Failed to force sync trends.", { id: "sync-trends" });
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred during sync.", { id: "sync-trends" });
      }
    });
  };

  const handleCopyKeyword = (keyword: string) => {
    navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    toast.success(`Copied "${keyword}"`);
    setTimeout(() => setCopiedKeyword(null), 2000);
  };

  const handleCopyPitch = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(id);
    toast.success("Outreach pitch template copied!");
    setTimeout(() => setCopiedPitch(null), 2000);
  };

  // Get filtered trend list
  const getFilteredTrends = (): TrendItem[] => {
    // Start with server cached list
    let list = [...trends];

    // Filter by Category
    if (selectedCategory !== "ALL") {
      list = list.filter(t => t.category === selectedCategory);
      
      // If 0 items match our specific furniture category for today, fall back to high-fidelity mock trends
      if (list.length === 0 && FALLBACK_TRENDS[selectedCategory]) {
        list = FALLBACK_TRENDS[selectedCategory].map((t, idx) => ({
          ...t,
          id: `fallback-${selectedCategory}-${idx}`,
          createdAt: new Date()
        }));
      }
    }

    // Filter by Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.keyword.toLowerCase().includes(q) || 
        t.newsTitle.toLowerCase().includes(q) || 
        t.newsSource.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const filteredTrends = getFilteredTrends();

  // Enforce 50-item pagination ceiling
  const paginatedTrends = filteredTrends.slice(0, 50);
  const totalCount = filteredTrends.length;

  // Single-digit integer normalizer helper (e.g. renders 1 instead of 01)
  const normalizeNumber = (num: number): string => {
    return String(num);
  };

  // AI outreach pitches builder
  const getOutreachPitch = (trend: TrendItem, type: string) => {
    const spikeText = normalizeNumber(trend.spikePercent);
    const firmName = companyName || "our firm";
    const kw = trend.keyword;
    const site = trend.newsSource || "competitor platforms";

    if (trend.category === "BEDS") {
      if (type === "LINKEDIN") {
        return `Hi [Name],\n\nI noticed that "${kw}" has sparked a massive organic surge across the UK today. Are you experiencing a similar demand for bedroom furniture? We have premium handcrafted bed frames and mattresses in stock at ${firmName}. Let me know if you would like to browse our merchant trade sheets.`;
      }
      return `Subject: UK Trend Alert: ${kw} Demand\n\nHi [Name],\n\nI saw that sleep wellness and "${kw}" are highly active in the UK today (growing at +${spikeText}%!). At ${firmName}, we design built-in bedroom storage systems and custom bed frames that address this exact demand. Let's arrange a quick call to share our discount schedules.`;
    }

    if (trend.category === "SOFAS") {
      if (type === "LINKEDIN") {
        return `Hi [Name],\n\nWith modular seating and "${kw}" trending heavily at +${spikeText}% today, retail spaces are shifting fast. At ${firmName}, our new boucle and velvet sofa ranges are ready to dispatch. Let's connect to review catalog pricing.`;
      }
      return `Subject: Sourcing Trends: Custom Lounge Suites\n\nHi [Name],\n\nWith "${kw}" trending in the UK home decor sector today, consumers are actively looking for modular corner sofas. At ${firmName}, we manufacture custom seating and recliners. You can audit current consumer layouts at ${trend.newsSource || "online sources"}. Let's chat about a potential commercial partnership.`;
    }

    if (trend.category === "WARDROBES") {
      if (type === "LINKEDIN") {
        return `Hi [Name],\n\nWe noticed sliding wardrobes and "${kw}" are capturing massive organic traction. We supply built-in wardrobe systems with soft-close mechanisms. Would love to connect and share custom sizing options.`;
      }
      return `Subject: Built-in Wardrobes and "${kw}" Spikes\n\nHi [Name],\n\nOrganized living is on the rise with "${kw}" spiking at +${spikeText}% search volume in the UK. ${firmName} offers premium walk-in wardrobes and sliding mirror cabinet wardrobes. Let's connect to schedule a brief demo.`;
    }

    // GENERAL Category fallback pitches (focused on commercial/home office furniture solutions)
    if (type === "LINKEDIN") {
      return `Hi [Name],\n\nNoticed "${kw}" is driving explosive search interest in the UK today. While auditing traffic patterns on ${site}, let's talk about how ${firmName} can elevate your corporate home office furniture layouts.`;
    }
    return `Subject: UK Search Trend Spike: ${kw}\n\nHi [Name],\n\nKeeping an eye on UK market indicators, we saw "${kw}" has spiked +${spikeText}% today. While your team audits competitor layouts on ${site}, we wanted to reach out regarding our premium office desk and ergonomic chair catalog. Let's connect to see how we can assist your teams.`;
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "BEDS": return "Furniture / Beds";
      case "SOFAS": return "Furniture / Sofas";
      case "WARDROBES": return "Furniture / Wardrobes";
      default: return "General";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%", width: "100%", overflowY: "auto", paddingBottom: "1.5rem" }}>
      
      {/* 1. Glassmorphic Page Header */}
      <div className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border-dim)" }}>
        <div>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp style={{ color: "var(--gold-premium)" }} size={26} />
            UK Market Trends Tracker
          </h1>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            100% Free Open Source OSINT Google search metrics for client outreach aids.
          </p>
        </div>

        {/* Sync Trigger for Owner / Super Admin */}
        {(currentUser.role === "COMPANY_OWNER" || currentUser.role === "SUPER_ADMIN") && (
          <button
            onClick={handleSyncTrends}
            disabled={isPending}
            className="btn-glass"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.8rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}
            title="CEO Manual Sync Force Refresh"
          >
            <RotateCw size={14} className={isPending ? "animate-spin" : ""} />
            Sync Trends Now
          </button>
        )}
      </div>

      {/* 2. Search & Industry Filter Area */}
      <div className="glass-panel" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", padding: "1rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.3)", border: "1px solid var(--border-dim)" }}>
        
        {/* Search */}
        <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
          <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords or articles..."
            className="input-gold"
            style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.2rem", fontSize: "0.82rem" }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Filter size={15} style={{ color: "var(--text-muted)" }} />
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="input-gold"
            style={{ fontSize: "0.82rem", padding: "0.55rem 1.8rem 0.55rem 0.75rem" }}
          >
            <option value="ALL">All Categories</option>
            <option value="BEDS">Furniture / Beds</option>
            <option value="SOFAS">Furniture / Sofas</option>
            <option value="WARDROBES">Furniture / Wardrobes</option>
            <option value="GENERAL">General Trends</option>
          </select>
        </div>

        {/* System Sync Note */}
        <div style={{ display: "flex", alignItems: "center", fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: "auto", background: "rgba(15, 23, 42, 0.03)", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
          Refresh: Every Day
        </div>
      </div>

      {/* Fallback Notice */}
      {selectedCategory !== "ALL" && trends.filter(t => t.category === selectedCategory).length === 0 && (
        <div className="glass-panel" style={{ background: "rgba(230, 242, 255, 0.4)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "0.75rem 1rem", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={16} style={{ color: "rgb(59, 130, 246)" }} />
          <span style={{ fontSize: "0.75rem", color: "rgb(30, 64, 175)", fontWeight: 500 }}>
            No live UK searches matching <strong>{getCategoryLabel(selectedCategory)}</strong> were found on Google today. Displaying premium fallback design prompts below.
          </span>
        </div>
      )}

      {/* 3. Trends List Ledger */}
      {paginatedTrends.length === 0 ? (
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", textAlign: "center", gap: "0.5rem" }}>
          <TrendingUp size={36} style={{ color: "var(--text-muted)" }} />
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>No trends match your query</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Try altering your search or selecting a different vertical filter.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
          {paginatedTrends.map((trend) => {
            const tempType = selectedTemplateType[trend.id] || "EMAIL";
            const pitchText = getOutreachPitch(trend, tempType);

            return (
              <div 
                key={trend.id} 
                className="glass-panel hover-card" 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "0.85rem", 
                  padding: "1.25rem", 
                  borderRadius: "12px", 
                  background: "#FFFFFF", 
                  border: "1px solid var(--border-dim)",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
              >
                {/* Header info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ 
                      fontSize: "0.62rem", 
                      fontWeight: 800, 
                      textTransform: "uppercase", 
                      color: trend.category === "GENERAL" ? "var(--text-muted)" : "var(--gold-premium)",
                      letterSpacing: "0.03em"
                    }}>
                      {getCategoryLabel(trend.category)}
                    </span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                      {trend.keyword}
                    </h3>
                  </div>

                  {/* Growth indicators */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ 
                      fontSize: "0.72rem", 
                      fontWeight: 800, 
                      color: trend.spikePercent >= 450 ? "rgb(239, 68, 68)" : (trend.spikePercent >= 250 ? "rgb(245, 158, 11)" : "rgb(34, 197, 94)"),
                      background: trend.spikePercent >= 450 ? "rgba(254, 226, 226, 0.6)" : (trend.spikePercent >= 250 ? "rgba(254, 243, 199, 0.6)" : "rgba(220, 252, 231, 0.6)"),
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem"
                    }}>
                      <span className="animate-pulse">▲</span>
                      +{normalizeNumber(trend.spikePercent)}% Spike Today
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", background: "rgba(15, 23, 42, 0.03)", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
                      Traffic: {trend.traffic}
                    </span>
                  </div>
                </div>

                {/* News details */}
                {trend.newsTitle && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.75rem", borderRadius: "8px", background: "rgba(15, 23, 42, 0.02)", borderLeft: "3px solid var(--gold-premium)" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                      Top Gaining Website Audit
                    </span>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 500, lineHeight: "1.3" }}>
                        {trend.newsTitle}
                      </p>
                      {trend.newsUrl && (
                        <a 
                          href={trend.newsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.68rem", color: "var(--gold-premium)", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          {trend.newsSource || "Audit Link"}
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Outreach Template / Copier Area */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", background: "rgba(15, 23, 42, 0.015)", border: "1px dashed var(--border-dim)", padding: "0.75rem", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <MessageSquareCode size={14} style={{ color: "var(--gold-premium)" }} />
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-secondary)" }}>Outreach Assistant</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {/* Outreach Pitch selector */}
                      <select
                        value={tempType}
                        onChange={(e) => setSelectedTemplateType(prev => ({ ...prev, [trend.id]: e.target.value }))}
                        className="input-gold"
                        style={{ fontSize: "0.68rem", padding: "0.2rem 1.4rem 0.2rem 0.4rem", borderRadius: "4px" }}
                      >
                        <option value="EMAIL">Cold Email Script</option>
                        <option value="LINKEDIN">LinkedIn DM Opener</option>
                      </select>
                      
                      {/* Copy pitch */}
                      <button
                        onClick={() => handleCopyPitch(trend.id, pitchText)}
                        className="btn-glass"
                        style={{ fontSize: "0.65rem", padding: "0.2rem 0.45rem", borderRadius: "4px" }}
                        title="Copy entire Pitch"
                      >
                        {copiedPitch === trend.id ? <Check size={12} style={{ color: "green" }} /> : "Copy Pitch"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={pitchText}
                    readOnly
                    className="input-gold"
                    style={{ 
                      width: "100%", 
                      height: "70px", 
                      fontSize: "0.72rem", 
                      fontFamily: "monospace", 
                      lineHeight: "1.4", 
                      background: "rgba(255, 255, 255, 0.7)", 
                      resize: "none",
                      padding: "0.4rem"
                    }}
                  />

                  {/* Copy keyword & site audit quick options */}
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      onClick={() => handleCopyKeyword(trend.keyword)}
                      className="btn-glass"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", fontSize: "0.68rem", padding: "0.35rem" }}
                    >
                      {copiedKeyword === trend.keyword ? (
                        <>
                          <Check size={12} style={{ color: "green" }} />
                          Keyword Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          Copy Keyword
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 4. Global 50-Entry Pagination Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0.5rem", borderTop: "1px solid var(--border-dim)", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "auto" }}>
        <span>
          Showing 1-50 of {normalizeNumber(totalCount)} entries
        </span>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button disabled className="btn-glass" style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.68rem" }}>Prev</button>
          <button disabled className="btn-glass" style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.68rem" }}>Next</button>
        </div>
      </div>

    </div>
  );
}
