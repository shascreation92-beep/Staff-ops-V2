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
  MessageSquareCode,
  MapPin
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  forceSyncTrendsAction, 
  updateTenantTrendsConfigAction,
  getFacebookSuggestionsAction
} from "@/app/actions/uk-trends";

interface TrendItem {
  id: string;
  keyword: string;
  traffic: string;
  spikePercent: number;
  newsUrl: string;
  newsTitle: string;
  newsSource: string;
  category: string;
  source: string; // "GOOGLE" or "FACEBOOK"
  postcode?: string | null;
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

const FALLBACK_TRENDS: Record<string, Omit<TrendItem, "id" | "createdAt">[]> = {
  BEDS: [
    {
      keyword: "Luxury Velvet Bed Frames",
      traffic: "15,000+",
      spikePercent: 480,
      newsTitle: "UK Bed Design Trends: Velvet Frames Experience Exploding Demand",
      newsUrl: "https://www.furnitureuk.co.uk/design-trends",
      newsSource: "Furniture UK",
      category: "BEDS",
      source: "GOOGLE"
    },
    {
      keyword: "Orthopaedic Mattresses Sale",
      traffic: "8,000+",
      spikePercent: 310,
      newsTitle: "UK Sleep Council Reports Rise in Orthopaedic Sleep Solutions",
      newsUrl: "https://www.sleepcouncil.org.uk/news",
      newsSource: "Sleep Council",
      category: "BEDS",
      source: "GOOGLE"
    },
    {
      keyword: "Space-saving Ottoman Beds",
      traffic: "5,000+",
      spikePercent: 220,
      newsTitle: "Small Living Spaces Drive Demand for Ottoman Storage Beds",
      newsUrl: "https://www.interiordesign.co.uk/ottoman-trend",
      newsSource: "Interior Design",
      category: "BEDS",
      source: "GOOGLE"
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
      category: "SOFAS",
      source: "GOOGLE"
    },
    {
      keyword: "Boucle Fabric Couches",
      traffic: "10,000+",
      spikePercent: 380,
      newsTitle: "Boucle Texture Remains a Design Staple for 2026 Homeowners",
      newsUrl: "https://www.livingetc.com/boucle-couch",
      newsSource: "Livingetc",
      category: "SOFAS",
      source: "GOOGLE"
    },
    {
      keyword: "Ergonomic Recliners",
      traffic: "6,000+",
      spikePercent: 190,
      newsTitle: "Therapeutic Seating Options Experience Rise in Remote Work Era",
      newsUrl: "https://www.ergonomics-today.co.uk/recliners",
      newsSource: "Ergonomics Today",
      category: "SOFAS",
      source: "GOOGLE"
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
      category: "WARDROBES",
      source: "GOOGLE"
    },
    {
      keyword: "Sliding Mirror Wardrobes",
      traffic: "7,000+",
      spikePercent: 280,
      newsTitle: "Mirrored Sliding Wardrobe Sales Spike in UK Urban Apartments",
      newsUrl: "https://www.apartmenttherapy.com/sliding-mirrors",
      newsSource: "Apartment Therapy",
      category: "WARDROBES",
      source: "GOOGLE"
    },
    {
      keyword: "Built-in Cabinet Storage",
      traffic: "4,000+",
      spikePercent: 140,
      newsTitle: "Custom Built-in Wardrobes Become Top Value Adder for UK Sellers",
      newsUrl: "https://www.propertytimes.co.uk/built-in-cabinets",
      newsSource: "Property Times",
      category: "WARDROBES",
      source: "GOOGLE"
    }
  ]
};

export default function UKMarketTrendsList({ 
  initialTrends, 
  currentUser, 
  companyName,
  initialConfig
}: UKMarketTrendsListProps) {
  const [activeTab, setActiveTab] = useState<"GOOGLE" | "FACEBOOK">("GOOGLE");
  const [trends, setTrends] = useState<TrendItem[]>(initialTrends);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialConfig?.defaultCategory || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Facebook Live search suggestions
  const [fbSearchQuery, setFbSearchQuery] = useState<string>("");
  const [fbSuggestions, setFbSuggestions] = useState<TrendItem[]>([]);
  const [isSearchingFb, setIsSearchingFb] = useState<boolean>(false);

  const [selectedTemplateType, setSelectedTemplateType] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [copiedPitch, setCopiedPitch] = useState<string | null>(null);

  // Search autocomplete dynamically for Facebook tab
  useEffect(() => {
    if (activeTab !== "FACEBOOK") return;
    if (fbSearchQuery.trim().length === 0) {
      setFbSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingFb(true);
      try {
        const res = await getFacebookSuggestionsAction(fbSearchQuery);
        if (res.success && res.suggestions) {
          setFbSuggestions(res.suggestions as any);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingFb(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [fbSearchQuery, activeTab]);

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

  const handleSyncTrends = () => {
    toast.loading("Refreshing Google & Facebook UK OSINT feeds...", { id: "sync-trends" });
    startTransition(async () => {
      try {
        const res = await forceSyncTrendsAction();
        if (res.success) {
          toast.success(`Successfully cached dual-platform trends!`, { id: "sync-trends" });
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

  // Get active list depending on source tab
  const getFilteredTrends = (): TrendItem[] => {
    if (activeTab === "FACEBOOK") {
      // If user typed in live lookup box, prioritize live results
      if (fbSearchQuery.trim() !== "") {
        return fbSuggestions;
      }
      // Otherwise, show cached Facebook items
      return trends.filter(t => t.source === "FACEBOOK");
    }

    // Tab A: Google & Retail
    let list = trends.filter(t => t.source === "GOOGLE");

    // Filter by Category
    if (selectedCategory !== "ALL") {
      list = list.filter(t => t.category === selectedCategory);
      
      // Fallback to high-fidelity mock trends if 0 matching items exist today
      if (list.length === 0 && FALLBACK_TRENDS[selectedCategory]) {
        list = FALLBACK_TRENDS[selectedCategory].map((t, idx) => ({
          ...t,
          id: `fallback-${selectedCategory}-${idx}`,
          createdAt: new Date()
        }));
      }
    }

    // Filter by search query
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
    const firmName = companyName || "our furniture workshop";
    const kw = trend.keyword;
    const site = trend.newsSource || "competitor platforms";
    const postcode = trend.postcode || "your local area";

    // Direct Messenger Templates for Facebook Marketplace
    if (trend.source === "FACEBOOK") {
      if (type === "LINKEDIN" || type === "GROUP") {
        return `Attention ${postcode} buyers! 📣 With "${kw}" trending up +${spikeText}% today on Marketplace, we are running an exclusive localized layout clearance. We have ready-to-dispatch mattresses and corner sofas at ${firmName}. DM us immediately for direct sizes and free delivery options!`;
      }
      return `Hi! Is this still available? I noticed that "${kw}" has a massive +${spikeText}% search surge today in ${postcode}. We supply premium custom-made beds and sofas. Send us a message if you'd like to check our direct delivery deals!`;
    }

    // Google Trends Email & LinkedIn opener
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

    // GENERAL Category fallback pitches
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
      
      {/* 1. Page Header Block */}
      <div className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border-dim)" }}>
        <div>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp style={{ color: "var(--gold-premium)" }} size={26} />
            UK Market & Marketplace Trends
          </h1>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Real-time UK search completions and buyer auto-suggestions for direct client outreach.
          </p>
        </div>

        {/* Sync Trigger for Owner / Super Admin */}
        {(currentUser.role === "COMPANY_OWNER" || currentUser.role === "SUPER_ADMIN") && (
          <button
            onClick={handleSyncTrends}
            disabled={isPending}
            className="btn-glass"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.8rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}
            title="Force Live Update Scraper"
          >
            <RotateCw size={14} className={isPending ? "animate-spin" : ""} />
            Sync Trends Now
          </button>
        )}
      </div>

      {/* 2. Visual Platform Tabs Selection */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => { setActiveTab("GOOGLE"); setSelectedCategory("ALL"); setSearchQuery(""); }}
          className={`btn-glass ${activeTab === "GOOGLE" ? "active" : ""}`}
          style={{ 
            padding: "0.55rem 1rem", 
            borderRadius: "8px", 
            fontSize: "0.82rem", 
            fontWeight: 800,
            background: activeTab === "GOOGLE" ? "var(--gold-premium)" : "rgba(255,255,255,0.45)",
            color: activeTab === "GOOGLE" ? "#FFFFFF" : "var(--text-primary)",
            border: "1px solid var(--border-dim)"
          }}
        >
          📈 Tab A: Google & Retail Trends
        </button>
        <button
          onClick={() => { setActiveTab("FACEBOOK"); setSelectedCategory("ALL"); setFbSearchQuery(""); }}
          className={`btn-glass ${activeTab === "FACEBOOK" ? "active" : ""}`}
          style={{ 
            padding: "0.55rem 1rem", 
            borderRadius: "8px", 
            fontSize: "0.82rem", 
            fontWeight: 800,
            background: activeTab === "FACEBOOK" ? "var(--gold-premium)" : "rgba(255,255,255,0.45)",
            color: activeTab === "FACEBOOK" ? "#FFFFFF" : "var(--text-primary)",
            border: "1px solid var(--border-dim)"
          }}
        >
          🏪 Tab B: Facebook Marketplace UK
        </button>
      </div>

      {/* 3. Filter Controls Block */}
      <div className="glass-panel" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", padding: "1rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.3)", border: "1px solid var(--border-dim)" }}>
        
        {activeTab === "GOOGLE" ? (
          <>
            {/* Google Search */}
            <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
              <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google keywords or articles..."
                className="input-gold"
                style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.2rem", fontSize: "0.82rem" }}
              />
            </div>

            {/* Category Dropdown */}
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
          </>
        ) : (
          <>
            {/* Live Marketplace Autocomplete lookup input */}
            <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
              <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
              <input
                type="text"
                value={fbSearchQuery}
                onChange={(e) => setFbSearchQuery(e.target.value)}
                placeholder="Type furniture prefix (e.g. 'double bed', 'corner sofa') for live suggestions..."
                className="input-gold"
                style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.2rem", fontSize: "0.82rem" }}
              />
            </div>
            {isSearchingFb && (
              <div style={{ display: "flex", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                <RotateCw size={12} className="animate-spin mr-1" /> Searching auto-suggestions...
              </div>
            )}
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: "auto", background: "rgba(15, 23, 42, 0.03)", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
          Refresh: Every Day
        </div>
      </div>

      {/* Fallback Notice for Empty Categorization in Tab A */}
      {activeTab === "GOOGLE" && selectedCategory !== "ALL" && trends.filter(t => t.source === "GOOGLE" && t.category === selectedCategory).length === 0 && (
        <div className="glass-panel" style={{ background: "rgba(230, 242, 255, 0.4)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "0.75rem 1rem", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={16} style={{ color: "rgb(59, 130, 246)" }} />
          <span style={{ fontSize: "0.75rem", color: "rgb(30, 64, 175)", fontWeight: 500 }}>
            No live Google queries matching <strong>{getCategoryLabel(selectedCategory)}</strong> were found. Displaying fallback design templates.
          </span>
        </div>
      )}

      {/* 4. Results Trends ledger list */}
      {paginatedTrends.length === 0 ? (
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3.5rem 1rem", textAlign: "center", gap: "0.5rem" }}>
          <TrendingUp size={36} style={{ color: "var(--text-muted)" }} />
          {activeTab === "FACEBOOK" && fbSearchQuery.trim() === "" ? (
            <>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>Facebook Marketplace Search suggestions</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Type a prefix in the lookup box above to query live UK buyer recommendations.</p>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>No suggestions matched</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Modify your filter inputs or look up other furniture keywords.</p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
          {paginatedTrends.map((trend) => {
            const tempType = selectedTemplateType[trend.id] || (trend.source === "FACEBOOK" ? "MESSENGER" : "EMAIL");
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
                  border: "1px solid var(--border-dim)"
                }}
              >
                {/* Header block */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ 
                        fontSize: "0.62rem", 
                        fontWeight: 800, 
                        textTransform: "uppercase", 
                        color: trend.category === "GENERAL" ? "var(--text-muted)" : "var(--gold-premium)",
                        letterSpacing: "0.03em"
                      }}>
                        {getCategoryLabel(trend.category)}
                      </span>
                      {trend.postcode && (
                        <span style={{ 
                          fontSize: "0.62rem", 
                          fontWeight: 700, 
                          color: "rgb(59, 130, 246)",
                          background: "rgba(219, 234, 254, 0.5)",
                          padding: "0.05rem 0.35rem",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.1rem"
                        }}>
                          <MapPin size={10} />
                          {trend.postcode}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                      {trend.keyword}
                    </h3>
                  </div>

                  {/* Growth stats */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ 
                      fontSize: "0.72rem", 
                      fontWeight: 800, 
                      color: trend.spikePercent >= 300 ? "rgb(239, 68, 68)" : (trend.spikePercent >= 180 ? "rgb(245, 158, 11)" : "rgb(34, 197, 94)"),
                      background: trend.spikePercent >= 300 ? "rgba(254, 226, 226, 0.6)" : (trend.spikePercent >= 180 ? "rgba(254, 243, 199, 0.6)" : "rgba(220, 252, 231, 0.6)"),
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem"
                    }}>
                      <span>▲</span>
                      +{normalizeNumber(trend.spikePercent)}% Spike Today
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", background: "rgba(15, 23, 42, 0.03)", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
                      {trend.source === "FACEBOOK" ? "Suggestions" : `Traffic: ${trend.traffic}`}
                    </span>
                  </div>
                </div>

                {/* News URL Competitor Audit block */}
                {trend.newsTitle && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.75rem", borderRadius: "8px", background: "rgba(15, 23, 42, 0.02)", borderLeft: "3px solid var(--gold-premium)" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                      {trend.source === "FACEBOOK" ? "Listing Category Audit" : "Top Gaining Website Audit"}
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
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-secondary)" }}>Outreach Script Generator</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {/* Outreach Pitch selector */}
                      <select
                        value={tempType}
                        onChange={(e) => setSelectedTemplateType(prev => ({ ...prev, [trend.id]: e.target.value }))}
                        className="input-gold"
                        style={{ fontSize: "0.68rem", padding: "0.2rem 1.4rem 0.2rem 0.4rem", borderRadius: "4px" }}
                      >
                        {trend.source === "FACEBOOK" ? (
                          <>
                            <option value="MESSENGER">Direct Messenger Opener</option>
                            <option value="GROUP">Group Poster Script</option>
                          </>
                        ) : (
                          <>
                            <option value="EMAIL">Cold Email Script</option>
                            <option value="LINKEDIN">LinkedIn DM Opener</option>
                          </>
                        )}
                      </select>
                      
                      {/* Copy pitch */}
                      <button
                        onClick={() => handleCopyPitch(trend.id, pitchText)}
                        className="btn-glass"
                        style={{ fontSize: "0.65rem", padding: "0.2rem 0.45rem", borderRadius: "4px" }}
                        title="Copy Pitch Template"
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
                      height: "75px", 
                      fontSize: "0.72rem", 
                      fontFamily: "monospace", 
                      lineHeight: "1.4", 
                      background: "rgba(255, 255, 255, 0.7)", 
                      resize: "none",
                      padding: "0.4rem"
                    }}
                  />

                  {/* Copy keyword button */}
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

      {/* 5. Global 50-Entry Pagination Footer */}
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
