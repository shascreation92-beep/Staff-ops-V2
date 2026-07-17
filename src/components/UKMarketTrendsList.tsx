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
  MapPin,
  X,
  Tags,
  Hash
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  forceSyncTrendsAction, 
  updateTenantTrendsConfigAction,
  getFacebookSuggestionsAction,
  getVintedSuggestionsAction,
  getEbaySuggestionsAction
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
  source: string; // "GOOGLE", "FACEBOOK", "VINTED", "EBAY"
  postcode?: string | null;
  apparelSize?: string | null;
  apparelCondition?: string | null;
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

const SEED_HASHTAGS = [
  "furniture", "ukdecor", "homeinspo", "ukshopping", "interior", "decor",
  "vintage", "luxuryliving", "bedesign", "sofalove", "wardrobedesign",
  "styling", "aesthetic", "comfort", "woodwork", "classic", "modern",
  "artisan", "homestyle", "bargain", "fashion", "streetwear", "retro",
  "apparels", "designer", "thrift", "casual", "chic", "sustainable"
];

const FALLBACK_TRENDS: Record<string, Omit<TrendItem, "id" | "createdAt">>[] = []; // not needed directly as we seed

export default function UKMarketTrendsList({ 
  initialTrends, 
  currentUser, 
  companyName,
  initialConfig
}: UKMarketTrendsListProps) {
  const [activeTab, setActiveTab] = useState<"GOOGLE" | "FACEBOOK" | "VINTED" | "EBAY">("GOOGLE");
  const [trends, setTrends] = useState<TrendItem[]>(initialTrends);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialConfig?.defaultCategory || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Platform specific live search inputs
  const [fbSearchQuery, setFbSearchQuery] = useState<string>("");
  const [fbSuggestions, setFbSuggestions] = useState<TrendItem[]>([]);
  const [isSearchingFb, setIsSearchingFb] = useState<boolean>(false);

  const [vintedSearchQuery, setVintedSearchQuery] = useState<string>("");
  const [vintedSuggestions, setVintedSuggestions] = useState<TrendItem[]>([]);
  const [isSearchingVinted, setIsSearchingVinted] = useState<boolean>(false);

  const [ebaySearchQuery, setEbaySearchQuery] = useState<string>("");
  const [ebaySuggestions, setEbaySuggestions] = useState<TrendItem[]>([]);
  const [isSearchingEbay, setIsSearchingEbay] = useState<boolean>(false);

  // CRM Slide-over overlays targeting
  const [activeDrawerTrend, setActiveDrawerTrend] = useState<TrendItem | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>("EMAIL");
  const [generatedHashtags, setGeneratedHashtags] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [copiedPitch, setCopiedPitch] = useState<string | null>(null);
  const [copiedHashtags, setCopiedHashtags] = useState<boolean>(false);

  // Live lookup: Facebook Marketplace
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
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [fbSearchQuery, activeTab]);

  // Live lookup: Vinted UK
  useEffect(() => {
    if (activeTab !== "VINTED") return;
    if (vintedSearchQuery.trim().length === 0) {
      setVintedSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingVinted(true);
      try {
        const res = await getVintedSuggestionsAction(vintedSearchQuery);
        if (res.success && res.suggestions) {
          setVintedSuggestions(res.suggestions as any);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingVinted(false);
      }
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [vintedSearchQuery, activeTab]);

  // Live lookup: eBay UK
  useEffect(() => {
    if (activeTab !== "EBAY") return;
    if (ebaySearchQuery.trim().length === 0) {
      setEbaySuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingEbay(true);
      try {
        const res = await getEbaySuggestionsAction(ebaySearchQuery);
        if (res.success && res.suggestions) {
          setEbaySuggestions(res.suggestions as any);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingEbay(false);
      }
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [ebaySearchQuery, activeTab]);

  // Compile exactly 20 distinct relevant hashtags derived from context
  const buildHashtagsList = (trend: TrendItem, reshuffle = false): string => {
    const rawKeyword = trend.keyword.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const words = rawKeyword.split(/\s+/).filter(w => w.length > 2);
    
    const tagsSet = new Set<string>();
    
    // Add primary keyword words
    words.forEach(w => tagsSet.add(`#${w}`));
    
    // Add joined primary keyword
    const joinedKw = rawKeyword.replace(/\s+/g, "");
    if (joinedKw.length > 1) {
      tagsSet.add(`#${joinedKw}`);
      tagsSet.add(`#${joinedKw}uk`);
    }

    // Add source-based tags
    if (trend.source === "GOOGLE") tagsSet.add("#googlemarket");
    if (trend.source === "FACEBOOK") tagsSet.add("#fbmarketplace");
    if (trend.source === "VINTED") tagsSet.add("#vintedfashion");
    if (trend.source === "EBAY") tagsSet.add("#ebayseller");

    if (trend.postcode) {
      const pCodeClean = trend.postcode.replace(/\s+/g, "").toLowerCase();
      tagsSet.add(`#${pCodeClean}`);
      tagsSet.add(`#local${pCodeClean}`);
    }

    // Shuffle seed hashtags to generate variety
    const seeds = [...SEED_HASHTAGS];
    if (reshuffle) {
      seeds.sort(() => Math.random() - 0.5);
    }

    // Fill up to exactly 20 hashtags
    let seedIdx = 0;
    while (tagsSet.size < 20 && seedIdx < seeds.length) {
      tagsSet.add(`#${seeds[seedIdx]}`);
      seedIdx++;
    }

    // Enforce exactly 20 limit
    const finalArray = Array.from(tagsSet).slice(0, 20);
    return finalArray.join(", ");
  };

  // Trigger hashtag initial builder when drawer opens
  useEffect(() => {
    if (activeDrawerTrend) {
      setGeneratedHashtags(buildHashtagsList(activeDrawerTrend));
    }
  }, [activeDrawerTrend]);

  const handleReshuffleHashtags = () => {
    if (!activeDrawerTrend) return;
    setGeneratedHashtags(buildHashtagsList(activeDrawerTrend, true));
    toast.success("Hashtags reshuffled!");
  };

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
    toast.loading("Refreshing Google, Facebook, Vinted & eBay UK OSINT feeds...", { id: "sync-trends" });
    startTransition(async () => {
      try {
        const res = await forceSyncTrendsAction();
        if (res.success) {
          toast.success(`Successfully cached 4-tab omnichannel trends!`, { id: "sync-trends" });
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

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch("active");
    toast.success("Outreach pitch template copied!");
    setTimeout(() => setCopiedPitch(null), 2000);
  };

  const handleCopyHashtags = () => {
    navigator.clipboard.writeText(generatedHashtags);
    setCopiedHashtags(true);
    toast.success("20 Comma-separated hashtags copied!");
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  // Get active list depending on source tab
  const getFilteredTrends = (): TrendItem[] => {
    if (activeTab === "FACEBOOK") {
      return fbSearchQuery.trim() !== "" ? fbSuggestions : trends.filter(t => t.source === "FACEBOOK");
    }
    if (activeTab === "VINTED") {
      return vintedSearchQuery.trim() !== "" ? vintedSuggestions : trends.filter(t => t.source === "VINTED");
    }
    if (activeTab === "EBAY") {
      return ebaySearchQuery.trim() !== "" ? ebaySuggestions : trends.filter(t => t.source === "EBAY");
    }

    // Google Shopping Tab
    let list = trends.filter(t => t.source === "GOOGLE");
    if (selectedCategory !== "ALL") {
      list = list.filter(t => t.category === selectedCategory);
    }
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

  // Single-digit counting standards (e.g. 1 instead of 01)
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

    if (trend.source === "FACEBOOK" || trend.source === "VINTED") {
      if (type === "LINKEDIN" || type === "GROUP") {
        return `Attention ${postcode} buyers! 📣 With "${kw}" trending up +${spikeText}% today on Marketplace/Vinted, we are running an exclusive clearance. We have ready-to-dispatch mattresses and corner sofas at ${firmName}. DM us immediately for direct sizes and free delivery options!`;
      }
      return `Hi! Is this still available? I noticed that "${kw}" has a massive +${spikeText}% search surge today in ${postcode}. We supply premium custom-made beds and sofas. Send us a message if you'd like to check our direct delivery deals!`;
    }

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

    if (type === "LINKEDIN") {
      return `Hi [Name],\n\nNoticed "${kw}" is driving explosive search interest in the UK today. While auditing traffic patterns on ${site}, let's talk about how ${firmName} can elevate your corporate home office furniture layouts.`;
    }
    return `Subject: UK Search Trend Spike: ${kw}\n\nHi [Name],\n\nKeeping an eye on UK market indicators, we saw "${kw}" has spiked +${spikeText}% today. While your team audits competitor layouts on ${site}, we wanted to reach out regarding our premium office desk and ergonomic chair catalog. Let's connect to see how we can assist your teams.`;
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "BEDS": return "Beds";
      case "SOFAS": return "Sofas";
      case "WARDROBES": return "Wardrobes";
      default: return "General";
    }
  };

  const handleOpenOutreach = (trend: TrendItem) => {
    setActiveDrawerTrend(trend);
    setSelectedTemplateType(trend.source === "FACEBOOK" || trend.source === "VINTED" ? "MESSENGER" : "EMAIL");
  };

  // Derive demand and difficulty metrics from trend statistics
  const getSEOMetrics = (trend: TrendItem) => {
    if (trend.spikePercent >= 300) {
      return { demand: "High", difficulty: "Hard", color: "rgb(239, 68, 68)", border: "1px solid rgba(239, 68, 68, 0.2)" };
    }
    if (trend.spikePercent >= 180) {
      return { demand: "Medium", difficulty: "Medium", color: "rgb(245, 158, 11)", border: "1px solid rgba(245, 158, 11, 0.2)" };
    }
    return { demand: "Low", difficulty: "Easy", color: "rgb(34, 197, 94)", border: "1px solid rgba(34, 197, 94, 0.2)" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%", width: "100%", overflowY: "auto", paddingBottom: "1.5rem", position: "relative" }}>
      
      {/* 1. Page Header Block */}
      <div className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border-dim)" }}>
        <div>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp style={{ color: "var(--gold-premium)" }} size={26} />
            UK Commerce Intelligence Hub
          </h1>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Multichannel search analysis across Google Shopping, Facebook Marketplace, Vinted UK & eBay.
          </p>
        </div>

        {currentUser.role === "COMPANY_OWNER" || currentUser.role === "SUPER_ADMIN" ? (
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
        ) : null}
      </div>

      {/* 2. Visual Platform Workspaces Tabs Array (4 Tabs) */}
      <div style={{ display: "flex", gap: "0.4rem", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => { setActiveTab("GOOGLE"); setSelectedCategory("ALL"); setSearchQuery(""); }}
          className={`btn-glass ${activeTab === "GOOGLE" ? "active" : ""}`}
          style={{ 
            padding: "0.55rem 0.85rem", 
            borderRadius: "8px", 
            fontSize: "0.8rem", 
            fontWeight: 800,
            background: activeTab === "GOOGLE" ? "var(--gold-premium)" : "rgba(255,255,255,0.45)",
            color: activeTab === "GOOGLE" ? "#FFFFFF" : "var(--text-primary)",
            border: "1px solid var(--border-dim)"
          }}
        >
          📈 Tab A: Google & Retail
        </button>
        <button
          onClick={() => { setActiveTab("FACEBOOK"); setSelectedCategory("ALL"); setFbSearchQuery(""); }}
          className={`btn-glass ${activeTab === "FACEBOOK" ? "active" : ""}`}
          style={{ 
            padding: "0.55rem 0.85rem", 
            borderRadius: "8px", 
            fontSize: "0.8rem", 
            fontWeight: 800,
            background: activeTab === "FACEBOOK" ? "var(--gold-premium)" : "rgba(255,255,255,0.45)",
            color: activeTab === "FACEBOOK" ? "#FFFFFF" : "var(--text-primary)",
            border: "1px solid var(--border-dim)"
          }}
        >
          🏪 Tab B: FB Marketplace
        </button>
        <button
          onClick={() => { setActiveTab("VINTED"); setSelectedCategory("ALL"); setVintedSearchQuery(""); }}
          className={`btn-glass ${activeTab === "VINTED" ? "active" : ""}`}
          style={{ 
            padding: "0.55rem 0.85rem", 
            borderRadius: "8px", 
            fontSize: "0.8rem", 
            fontWeight: 800,
            background: activeTab === "VINTED" ? "var(--gold-premium)" : "rgba(255,255,255,0.45)",
            color: activeTab === "VINTED" ? "#FFFFFF" : "var(--text-primary)",
            border: "1px solid var(--border-dim)"
          }}
        >
          👗 Tab C: Vinted UK Apparel
        </button>
        <button
          onClick={() => { setActiveTab("EBAY"); setSelectedCategory("ALL"); setEbaySearchQuery(""); }}
          className={`btn-glass ${activeTab === "EBAY" ? "active" : ""}`}
          style={{ 
            padding: "0.55rem 0.85rem", 
            borderRadius: "8px", 
            fontSize: "0.8rem", 
            fontWeight: 800,
            background: activeTab === "EBAY" ? "var(--gold-premium)" : "rgba(255,255,255,0.45)",
            color: activeTab === "EBAY" ? "#FFFFFF" : "var(--text-primary)",
            border: "1px solid var(--border-dim)"
          }}
        >
          🔨 Tab D: eBay UK Trends
        </button>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="glass-panel" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", padding: "1rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.3)", border: "1px solid var(--border-dim)" }}>
        
        {activeTab === "GOOGLE" && (
          <>
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
        )}

        {activeTab === "FACEBOOK" && (
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
        )}

        {activeTab === "VINTED" && (
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
            <input
              type="text"
              value={vintedSearchQuery}
              onChange={(e) => setVintedSearchQuery(e.target.value)}
              placeholder="Type apparel prefix (e.g. 'jacket', 'wool coat') for live suggestions..."
              className="input-gold"
              style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.2rem", fontSize: "0.82rem" }}
            />
          </div>
        )}

        {activeTab === "EBAY" && (
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
            <input
              type="text"
              value={ebaySearchQuery}
              onChange={(e) => setEbaySearchQuery(e.target.value)}
              placeholder="Type product prefix (e.g. 'mirror', 'armchair') for live suggestions..."
              className="input-gold"
              style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.2rem", fontSize: "0.82rem" }}
            />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: "auto", background: "rgba(15, 23, 42, 0.03)", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
          Refresh: Every Day
        </div>
      </div>

      {/* 4. Compact 3-Column Cards Grid */}
      {paginatedTrends.length === 0 ? (
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 1rem", textAlign: "center", gap: "0.5rem" }}>
          <TrendingUp size={36} style={{ color: "var(--text-muted)" }} />
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>Autocomplete suggestions list</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Type a prefix in the lookup box above to query live UK buyer recommendations.</p>
        </div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", 
          gap: "1.25rem",
          padding: "0.25rem"
        }}>
          {paginatedTrends.map((trend) => {
            const spikeColor = trend.spikePercent >= 300 ? "rgb(239, 68, 68)" : (trend.spikePercent >= 180 ? "rgb(245, 158, 11)" : "rgb(34, 197, 94)");
            const spikeBg = trend.spikePercent >= 300 ? "rgba(254, 226, 226, 0.65)" : (trend.spikePercent >= 180 ? "rgba(254, 243, 199, 0.65)" : "rgba(220, 252, 231, 0.65)");
            const seo = getSEOMetrics(trend);

            // Get source character logo
            let sourceChar = "G";
            let sourceBg = "rgb(66, 133, 244)";
            if (trend.source === "FACEBOOK") { sourceChar = "F"; sourceBg = "rgb(24, 119, 242)"; }
            if (trend.source === "VINTED") { sourceChar = "V"; sourceBg = "rgb(0, 119, 135)"; }
            if (trend.source === "EBAY") { sourceChar = "E"; sourceBg = "rgb(229, 32, 48)"; }

            return (
              <div 
                key={trend.id} 
                className="glass-panel hover-card" 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  justifyContent: "space-between",
                  gap: "0.75rem", 
                  padding: "1.1rem", 
                  borderRadius: "16px", 
                  background: "#FFFFFF", 
                  border: "1px solid var(--border-dim)",
                  transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease-in-out",
                  position: "relative",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)"
                }}
              >
                {/* Platform circular icon */}
                <div style={{ 
                  position: "absolute", 
                  top: "0.85rem", 
                  right: "0.85rem",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: 900,
                  color: "#FFFFFF",
                  background: sourceBg,
                  boxShadow: "0 2px 4px rgba(15,23,42,0.1)"
                }}
                title={`${trend.source} suggestion`}
                >
                  {sourceChar}
                </div>

                {/* Category & Tags header */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                    <span style={{ 
                      fontSize: "0.6rem", 
                      fontWeight: 800, 
                      textTransform: "uppercase", 
                      color: trend.category === "GENERAL" ? "var(--text-muted)" : "var(--gold-premium)",
                      letterSpacing: "0.04em"
                    }}>
                      {getCategoryLabel(trend.category)}
                    </span>
                    {trend.postcode && (
                      <span style={{ 
                        fontSize: "0.6rem", 
                        fontWeight: 700, 
                        color: "rgb(59, 130, 246)",
                        background: "rgba(219, 234, 254, 0.65)",
                        padding: "0.05rem 0.35rem",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.05rem"
                      }}>
                        <MapPin size={9} />
                        {trend.postcode}
                      </span>
                    )}

                    {/* Vinted apparel size and condition indicators */}
                    {trend.source === "VINTED" && (
                      <>
                        {trend.apparelSize && (
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgb(15, 118, 110)", background: "rgba(204, 251, 241, 0.7)", padding: "0.05rem 0.35rem", borderRadius: "4px" }}>
                            Size: {trend.apparelSize}
                          </span>
                        )}
                        {trend.apparelCondition && (
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgb(79, 70, 229)", background: "rgba(224, 231, 255, 0.7)", padding: "0.05rem 0.35rem", borderRadius: "4px" }}>
                            {trend.apparelCondition}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Keyword */}
                  <h3 style={{ 
                    fontSize: "1.05rem", 
                    fontWeight: 900, 
                    color: "var(--text-primary)", 
                    letterSpacing: "-0.015em",
                    lineHeight: "1.25",
                    marginTop: "0.15rem",
                    paddingRight: "1.5rem"
                  }}>
                    {trend.keyword}
                  </h3>

                  {/* 2. Inline SEO Metrics Bar */}
                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.35rem", alignItems: "center" }}>
                    <span style={{ 
                      fontSize: "0.58rem", 
                      fontWeight: 700, 
                      color: "var(--text-secondary)", 
                      background: "rgba(15, 23, 42, 0.04)", 
                      padding: "0.1rem 0.3rem", 
                      borderRadius: "4px" 
                    }}>
                      Demand: {seo.demand}
                    </span>
                    <span style={{ 
                      fontSize: "0.58rem", 
                      fontWeight: 700, 
                      color: seo.color, 
                      background: "rgba(15, 23, 42, 0.02)", 
                      border: seo.border, 
                      padding: "0.1rem 0.3rem", 
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.15rem"
                    }}>
                      <Tags size={8} />
                      Diff: {seo.difficulty}
                    </span>
                  </div>
                </div>

                {/* Statistics line */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ 
                    width: "7px", 
                    height: "7px", 
                    borderRadius: "50%", 
                    background: spikeColor,
                    display: "inline-block"
                  }}
                  className="animate-pulse"
                  />
                  <span style={{ 
                    fontSize: "0.68rem", 
                    fontWeight: 800, 
                    color: spikeColor,
                    background: spikeBg,
                    padding: "0.15rem 0.4rem",
                    borderRadius: "6px"
                  }}>
                    +{normalizeNumber(trend.spikePercent)}% Spike
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {trend.traffic}
                  </span>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border-dim)", margin: "0.2rem 0" }} />

                {/* Audit & Outreach actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {trend.newsUrl && (
                    <a 
                      href={trend.newsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-glass"
                      style={{ 
                        fontSize: "0.68rem", 
                        padding: "0.45rem", 
                        borderRadius: "8px",
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.2rem",
                        textDecoration: "none",
                        color: "var(--text-secondary)"
                      }}
                      title={`Audit ${trend.newsSource || "Competitor Site"}`}
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}

                  <button
                    onClick={() => handleOpenOutreach(trend)}
                    className="btn-gold"
                    style={{ 
                      flex: 1, 
                      fontSize: "0.72rem", 
                      fontWeight: 800, 
                      padding: "0.45rem 0.75rem", 
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem"
                    }}
                  >
                    Outreach Assistant
                    <ArrowRight size={12} />
                  </button>
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

      {/* 6. CRM Slide-Over Drawer Panel (Option A with z-50 overlay) */}
      {activeDrawerTrend && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setActiveDrawerTrend(null)}
            style={{ 
              position: "fixed", 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: "rgba(15, 23, 42, 0.25)", 
              backdropFilter: "blur(4px)",
              zIndex: 999 
            }}
          />

          {/* Drawer Panel Container */}
          <div 
            className="bg-white z-50"
            style={{ 
              position: "fixed", 
              top: 0, 
              right: 0, 
              width: "100%", 
              maxWidth: "460px", 
              height: "100%", 
              boxShadow: "-10px 0 30px rgba(15, 23, 42, 0.08)",
              borderLeft: "1px solid var(--border-dim)",
              display: "flex",
              flexDirection: "column",
              animation: "slideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>

            {/* Header */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "1.25rem", 
              borderBottom: "1px solid var(--border-dim)",
              background: "rgba(255, 255, 255, 0.95)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <MessageSquareCode size={20} style={{ color: "var(--gold-premium)" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
                  CRM Outreach Assistant
                </h3>
              </div>
              <button 
                onClick={() => setActiveDrawerTrend(null)}
                className="btn-glass"
                style={{ padding: "0.35rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {/* Trend Details */}
              <div className="glass-panel" style={{ padding: "1rem", borderRadius: "12px", background: "rgba(15, 23, 42, 0.02)", border: "1px solid var(--border-dim)" }}>
                <span style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", color: "var(--gold-premium)", letterSpacing: "0.04em" }}>
                  {getCategoryLabel(activeDrawerTrend.category)} Indicator ({activeDrawerTrend.source})
                </span>
                <h4 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text-primary)", margin: "0.2rem 0" }}>
                  {activeDrawerTrend.keyword}
                </h4>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "rgb(239, 68, 68)", background: "rgba(254, 226, 226, 0.7)", padding: "0.15rem 0.4rem", borderRadius: "6px" }}>
                    +{normalizeNumber(activeDrawerTrend.spikePercent)}% Spike Today
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", background: "#FFFFFF", padding: "0.15rem 0.4rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
                    {activeDrawerTrend.traffic}
                  </span>
                  {activeDrawerTrend.postcode && (
                    <span style={{ fontSize: "0.68rem", color: "rgb(59, 130, 246)", background: "rgba(219, 234, 254, 0.8)", padding: "0.15rem 0.4rem", borderRadius: "6px" }}>
                      📍 {activeDrawerTrend.postcode}
                    </span>
                  )}
                </div>
              </div>

              {/* Competitor Audit */}
              {activeDrawerTrend.newsTitle && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Competitor Audit Target
                  </label>
                  <div className="glass-panel" style={{ padding: "0.85rem", borderRadius: "10px", background: "#FFFFFF", border: "1px solid var(--border-dim)" }}>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 500, lineHeight: "1.4" }}>
                      {activeDrawerTrend.newsTitle}
                    </p>
                    {activeDrawerTrend.newsUrl && (
                      <a 
                        href={activeDrawerTrend.newsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: "0.2rem", 
                          fontSize: "0.72rem", 
                          color: "var(--gold-premium)", 
                          fontWeight: 700, 
                          textDecoration: "none",
                          marginTop: "0.6rem" 
                        }}
                      >
                        Audit source: {activeDrawerTrend.newsSource}
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Outreach generator */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Outreach Script Copy
                </label>
                
                <select
                  value={selectedTemplateType}
                  onChange={(e) => setSelectedTemplateType(e.target.value)}
                  className="input-gold"
                  style={{ width: "100%", fontSize: "0.82rem", padding: "0.55rem" }}
                >
                  {activeDrawerTrend.source === "FACEBOOK" || activeDrawerTrend.source === "VINTED" ? (
                    <>
                      <option value="MESSENGER">Direct Messenger Opener (Standard Chat)</option>
                      <option value="GROUP">Group Poster Script (Local Clearance)</option>
                    </>
                  ) : (
                    <>
                      <option value="EMAIL">Cold Email Script</option>
                      <option value="LINKEDIN">LinkedIn DM Opener</option>
                    </>
                  )}
                </select>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)" }}>
                      Generated Text
                    </span>
                    <button
                      onClick={() => handleCopyPitch(getOutreachPitch(activeDrawerTrend, selectedTemplateType))}
                      className="btn-glass"
                      style={{ fontSize: "0.68rem", padding: "0.25rem 0.5rem", borderRadius: "6px" }}
                    >
                      {copiedPitch ? "Copied!" : "Copy Pitch"}
                    </button>
                  </div>
                  <textarea
                    value={getOutreachPitch(activeDrawerTrend, selectedTemplateType)}
                    readOnly
                    className="input-gold"
                    style={{ 
                      width: "100%", 
                      height: "140px", 
                      fontSize: "0.75rem", 
                      fontFamily: "monospace", 
                      lineHeight: "1.45", 
                      background: "#FFFFFF",
                      padding: "0.6rem",
                      borderRadius: "8px",
                      resize: "none"
                    }}
                  />
                </div>
              </div>

              {/* 3. 20 Comma-Separated Hashtag Reshuffler Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid var(--border-dim)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Hash size={13} style={{ color: "var(--gold-premium)" }} />
                    Omnichannel 20-Hashtag Generator
                  </label>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      onClick={handleReshuffleHashtags}
                      className="btn-glass"
                      style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem", borderRadius: "4px", display: "flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      <RotateCw size={11} />
                      Reshuffle
                    </button>
                    <button
                      onClick={handleCopyHashtags}
                      className="btn-glass"
                      style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem", borderRadius: "4px" }}
                    >
                      {copiedHashtags ? "Copied!" : "Copy 20 Tags"}
                    </button>
                  </div>
                </div>

                <textarea
                  value={generatedHashtags}
                  readOnly
                  className="input-gold"
                  style={{ 
                    width: "100%", 
                    height: "90px", 
                    fontSize: "0.75rem", 
                    fontFamily: "monospace", 
                    lineHeight: "1.4", 
                    background: "#FFFFFF",
                    padding: "0.5rem",
                    borderRadius: "8px",
                    resize: "none"
                  }}
                />
                <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                  Concatenated strictly with commas. Single integers are normalized to single-digits (e.g. 0, 1).
                </span>
              </div>

            </div>

            {/* Drawer Footer */}
            <div style={{ 
              padding: "1rem 1.25rem", 
              borderTop: "1px solid var(--border-dim)", 
              background: "rgba(255, 255, 255, 0.95)",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button 
                onClick={() => setActiveDrawerTrend(null)}
                className="btn-glass"
                style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", borderRadius: "8px" }}
              >
                Close Assistant
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
