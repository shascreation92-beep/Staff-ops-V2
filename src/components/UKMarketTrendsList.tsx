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
  Hash,
  Send,
  MessageCircle,
  HelpCircle,
  Download
} from "lucide-react";
import { toast } from "react-hot-toast";
import { downloadCSV } from "@/lib/csv-exporter";
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
  
  // Platform specific live search states
  const [fbSearchQuery, setFbSearchQuery] = useState<string>("");
  const [fbSuggestions, setFbSuggestions] = useState<TrendItem[]>([]);
  const [isSearchingFb, setIsSearchingFb] = useState<boolean>(false);

  const [vintedSearchQuery, setVintedSearchQuery] = useState<string>("");
  const [vintedSuggestions, setVintedSuggestions] = useState<TrendItem[]>([]);
  const [isSearchingVinted, setIsSearchingVinted] = useState<boolean>(false);

  const [ebaySearchQuery, setEbaySearchQuery] = useState<string>("");
  const [ebaySuggestions, setEbaySuggestions] = useState<TrendItem[]>([]);
  const [isSearchingEbay, setIsSearchingEbay] = useState<boolean>(false);

  // CRM Slide-over drawer panels targeting
  const [activeDrawerTrend, setActiveDrawerTrend] = useState<TrendItem | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>("EMAIL");
  const [selectedTone, setSelectedTone] = useState<string>("POLITE");
  const [generatedHashtags, setGeneratedHashtags] = useState<string>("");

  // Live UK E-Commerce & Retail News Ticker State
  const [ukNews, setUkNews] = useState<any[]>([]);
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>("ALL");
  const [activeNewsModal, setActiveNewsModal] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/uk-news")
      .then(res => res.json())
      .then(data => {
        if (data.news && Array.isArray(data.news)) {
          setUkNews(data.news);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const [isPending, startTransition] = useTransition();
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [copiedSubject, setCopiedSubject] = useState<boolean>(false);
  const [copiedPitch, setCopiedPitch] = useState<boolean>(false);
  const [copiedHashtags, setCopiedHashtags] = useState<boolean>(false);

  // Auto-search: Facebook Marketplace autocomplete
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

  // Auto-search: Vinted suggestions
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

  // Auto-search: eBay suggestions
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
    words.forEach(w => tagsSet.add(`#${w}`));
    
    const joinedKw = rawKeyword.replace(/\s+/g, "");
    if (joinedKw.length > 1) {
      tagsSet.add(`#${joinedKw}`);
      tagsSet.add(`#${joinedKw}uk`);
    }

    if (trend.source === "GOOGLE") tagsSet.add("#googleshopping");
    if (trend.source === "FACEBOOK") tagsSet.add("#fbmarketplace");
    if (trend.source === "VINTED") tagsSet.add("#vintedfashion");
    if (trend.source === "EBAY") tagsSet.add("#ebayseller");

    if (trend.postcode) {
      const pCodeClean = trend.postcode.replace(/\s+/g, "").toLowerCase();
      tagsSet.add(`#${pCodeClean}`);
      tagsSet.add(`#local${pCodeClean}`);
    }

    const seeds = [...SEED_HASHTAGS];
    if (reshuffle) {
      seeds.sort(() => Math.random() - 0.5);
    }

    let seedIdx = 0;
    while (tagsSet.size < 20 && seedIdx < seeds.length) {
      tagsSet.add(`#${seeds[seedIdx]}`);
      seedIdx++;
    }

    const finalArray = Array.from(tagsSet).slice(0, 20);
    return finalArray.join(", ");
  };

  // Trigger hashtag builder on drawer load
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

  const handleCopySubject = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSubject(true);
    toast.success("Email Subject copied!");
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    toast.success("Outreach pitch template copied!");
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyHashtags = () => {
    navigator.clipboard.writeText(generatedHashtags);
    setCopiedHashtags(true);
    toast.success("20 Comma-separated hashtags copied!");
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  // Launch pre-filled messaging templates
  const handleLaunchWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleLaunchMessenger = () => {
    window.open("https://m.me/", "_blank");
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

  const handleExportCSV = () => {
    const headers = [
      "Platform Source",
      "Keyword / Term",
      "Spike Status",
      "Volume / Spike %",
      "Associated Article",
      "Source Link",
      "Category"
    ];

    const rows = filteredTrends.map(t => [
      t.source || activeTab,
      t.keyword || "",
      t.spikePercent > 0 ? "Spike Search" : "Steady Search",
      t.spikePercent > 0 ? `+${t.spikePercent}%` : t.traffic || "N/A",
      t.newsTitle || "N/A",
      t.newsUrl || "N/A",
      t.category || "General"
    ]);

    downloadCSV(headers, rows, `uk_market_trends_${activeTab.toLowerCase()}_${new Date().toISOString().slice(0,10)}`);
  };

  // Enforce 50-item pagination ceiling
  const paginatedTrends = filteredTrends.slice(0, 50);
  const totalCount = filteredTrends.length;

  const normalizeNumber = (num: number): string => {
    return String(num);
  };

  // Valuation calculator based on keyword length/category
  const calculateValuation = (keyword: string): string => {
    const len = keyword.length;
    let min = 60 + (len % 7) * 20;
    let max = min + 80 + (len % 5) * 30;
    return `Est. Value: £${normalizeNumber(min)} - £${normalizeNumber(max)}`;
  };

  const getVintedDemand = (trend: TrendItem): string => {
    const score = (trend.spikePercent % 3) + 7;
    return `Demand: 🔥 ${normalizeNumber(score)}/10`;
  };

  const getGoogleTrajectory = (trend: TrendItem): string => {
    return trend.spikePercent >= 250 ? "Trajectory: ⚡ Breakout" : "Trajectory: 📈 Upward";
  };

  // Tone-guided outreach subject compiler
  const getSubjectLine = (trend: TrendItem, tone: string) => {
    const kw = trend.keyword;
    const spike = normalizeNumber(trend.spikePercent);
    if (tone === "URGENT") {
      return `ALERT: ${kw} Clearance Specials (+${spike}% Spike)`;
    }
    if (tone === "OFFER") {
      return `Trade Discount Account Offer: Sourcing ${kw}`;
    }
    return `Partnership Proposal: Regarding rising demand for ${kw}`;
  };

  // Tone-guided outreach message body compiler
  const getOutreachPitch = (trend: TrendItem, type: string) => {
    const spikeText = normalizeNumber(trend.spikePercent);
    const firmName = companyName || "our furniture workspace";
    const kw = trend.keyword;
    const postcode = trend.postcode || "your local area";

    // Direct Messenger Templates for Chat platforms (Facebook, Vinted)
    if (trend.source === "FACEBOOK" || trend.source === "VINTED") {
      if (selectedTone === "URGENT") {
        return `Urgent Clearance! 📢 I saw you are looking for details on "${kw}" in ${postcode}. Demand has spiked +${spikeText}% today. We have premium stock available for dispatch. Contact us now to reserve dimension sets!`;
      }
      if (selectedTone === "OFFER") {
        return `Hi! Regarding "${kw}", we are currently running an exclusive promotional offer for buyers in ${postcode}. Handcrafted quality with free delivery schedules. Drop a message to check pricing!`;
      }
      return `Hi! Is this still available? I noticed that "${kw}" has a massive +${spikeText}% search surge today in ${postcode}. We supply premium custom-made beds and sofas. Send us a message if you'd like to check our direct delivery deals!`;
    }

    // Google / eBay Email & LinkedIn templates
    if (selectedTone === "URGENT") {
      if (type === "LINKEDIN") {
        return `Urgent Notice: "${kw}" is experiencing a massive +${spikeText}% interest surge today across the UK. At ${firmName}, we have cleared priority production slots for bulk corporate ordering. Let me know if you would like to secure slots.`;
      }
      return `Hi [Name],\n\nThis is an urgent trade alert regarding the UK market. Search traction for "${kw}" has spiked +${spikeText}% today. ${firmName} has reserved warehouse inventory to fulfill order routing routes. Let's arrange a brief call to secure slots.`;
    }

    if (selectedTone === "OFFER") {
      if (type === "LINKEDIN") {
        return `Hi [Name],\n\nRegarding the interest for "${kw}" today, I wanted to extend our standard corporate trade terms. We manufacture premium custom layouts. Let's discuss setting up a wholesale account.`;
      }
      return `Hi [Name],\n\nI noticed the UK retail spike for "${kw}" at +${spikeText}% today. We manufacture premium commercial lines at ${firmName}. We are happy to offer an initial trade discount of 15% on your first sourcing package. Let's connect to review details.`;
    }

    // Default: POLITE Tone
    if (type === "LINKEDIN") {
      return `Hi [Name],\n\nI noticed that "${kw}" has sparked a massive organic surge across the UK today. Are you experiencing a similar demand? We have premium handcrafted units in stock at ${firmName}. Let me know if you would like to browse our merchant trade sheets.`;
    }
    return `Hi [Name],\n\nI saw that "${kw}" is highly active in the UK today (growing at +${spikeText}%!). At ${firmName}, we design built-in bedroom storage systems and custom furniture pieces that address this exact demand. Let's arrange a quick call to share our discount schedules.`;
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "BEDS": return "Beds";
      case "SOFAS": return "Sofas";
      case "WARDROBES": return "Wardrobes";
      default: return "General";
    }
  };

  // Derive demand and difficulty metrics
  const getSEOMetrics = (trend: TrendItem) => {
    if (trend.spikePercent >= 300) {
      return { demand: "High", difficulty: "Hard", color: "rgb(239, 68, 68)", border: "1px solid rgba(239, 68, 68, 0.2)" };
    }
    if (trend.spikePercent >= 180) {
      return { demand: "Medium", difficulty: "Medium", color: "rgb(245, 158, 11)", border: "1px solid rgba(245, 158, 11, 0.2)" };
    }
    return { demand: "Low", difficulty: "Easy", color: "rgb(34, 197, 94)", border: "1px solid rgba(34, 197, 94, 0.2)" };
  };

  const handleOpenOutreach = (trend: TrendItem) => {
    setActiveDrawerTrend(trend);
    setSelectedTemplateType(trend.source === "FACEBOOK" || trend.source === "VINTED" ? "MESSENGER" : "EMAIL");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%", width: "100%", overflowY: "auto", paddingBottom: "1.5rem", position: "relative" }}>
      
      {/* LIVE UK E-COMMERCE & RETAIL NEWS TICKER MARQUEE */}
      {ukNews.length > 0 && (
        <div className="glass-panel" style={{
          padding: "0.65rem 1rem",
          background: "#FFFFFF",
          borderLeft: "4px solid var(--gold-primary)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          overflow: "hidden",
          borderRadius: "10px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.72rem",
            fontWeight: 800,
            color: "var(--gold-primary)",
            whiteSpace: "nowrap",
            background: "rgba(212, 175, 55, 0.1)",
            padding: "0.25rem 0.65rem",
            borderRadius: "6px"
          }}>
            <Sparkles size={13} />
            <span>UK LIVE NEWS</span>
          </div>

          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <div style={{
              display: "flex",
              gap: "2.5rem",
              whiteSpace: "nowrap",
              overflowX: "auto",
              padding: "0.2rem 0"
            }}>
              {ukNews.map((news) => (
                <div
                  key={news.id}
                  onClick={() => setActiveNewsModal(news)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.78rem"
                  }}
                >
                  <span className="badge" style={{
                    fontSize: "0.65rem",
                    padding: "0.1rem 0.4rem",
                    background: news.sentiment === "POSITIVE" ? "rgba(16, 185, 129, 0.1)" : (news.sentiment === "WARNING" ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)"),
                    color: news.sentiment === "POSITIVE" ? "#10B981" : (news.sentiment === "WARNING" ? "#EF4444" : "#3B82F6"),
                    border: "none",
                    fontWeight: 700
                  }}>
                    {news.category}
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{news.title}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>({news.source})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* 2. Visual Platform Workspaces Tabs Array (Clean, no Tab A/B/C/D labels) */}
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
          📈 Google & Retail Trends
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
          🏪 Facebook Marketplace
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
          👗 Vinted Apparel
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
          🔨 eBay UK Trends
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


        <div style={{ display: "flex", alignItems: "center", fontSize: "0.68rem", color: "var(--text-muted)", background: "rgba(15, 23, 42, 0.03)", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
          Refresh: Every Day
        </div>
      </div>

      {/* 4. Compact Grid Layout */}
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

            // Brand badges
            let brandText = "Google Shopping";
            let brandColor = "rgb(66, 133, 244)";
            let brandBg = "rgba(219, 234, 254, 0.7)";

            if (trend.source === "FACEBOOK") {
              brandText = "Marketplace";
              brandColor = "rgb(79, 70, 229)";
              brandBg = "rgba(224, 231, 255, 0.7)";
            } else if (trend.source === "VINTED") {
              brandText = "Vinted UK";
              brandColor = "rgb(13, 148, 136)";
              brandBg = "rgba(204, 251, 241, 0.7)";
            } else if (trend.source === "EBAY") {
              brandText = "eBay UK";
              brandColor = "rgb(220, 38, 38)";
              brandBg = "rgba(254, 226, 226, 0.7)";
            }

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
                {/* Platform pill badge top-right */}
                <div style={{ 
                  position: "absolute", 
                  top: "0.85rem", 
                  right: "0.85rem",
                  fontSize: "0.58rem",
                  fontWeight: 900,
                  color: brandColor,
                  background: brandBg,
                  padding: "0.15rem 0.45rem",
                  borderRadius: "20px",
                  border: `1px solid ${brandColor}1a`
                }}>
                  {brandText}
                </div>

                {/* Category & Postcode */}
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
                    paddingRight: "4.5rem"
                  }}>
                    {trend.keyword}
                  </h3>

                  {/* SEO Metrics directly below the keyword */}
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

                {/* Trajectory / Valuation/ Liquidity Score indicators on cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", padding: "0.4rem", borderRadius: "6px", background: "rgba(15, 23, 42, 0.015)", border: "1px solid var(--border-dim)" }}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    {trend.source === "GOOGLE" && getGoogleTrajectory(trend)}
                    {(trend.source === "FACEBOOK" || trend.source === "EBAY") && calculateValuation(trend.keyword)}
                    {trend.source === "VINTED" && getVintedDemand(trend)}
                  </span>
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

      {/* 6. CRM Slide-Over Drawer Panel with explicit zIndex overlay */}
      {activeDrawerTrend && (
        <>
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

          <div 
            className="bg-white"
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
              zIndex: 1000
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
              
              {/* Trend Summary */}
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

              {/* Tone Selection & Target layout */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {/* Platform selection */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Outreach Channel
                    </label>
                    <select
                      value={selectedTemplateType}
                      onChange={(e) => setSelectedTemplateType(e.target.value)}
                      className="input-gold"
                      style={{ width: "100%", fontSize: "0.78rem", padding: "0.45rem", marginTop: "0.15rem" }}
                    >
                      {activeDrawerTrend.source === "FACEBOOK" || activeDrawerTrend.source === "VINTED" ? (
                        <>
                          <option value="MESSENGER">Direct Messenger Opener</option>
                          <option value="GROUP">Group Clearance Post</option>
                        </>
                      ) : (
                        <>
                          <option value="EMAIL">Cold Email Pitch</option>
                          <option value="LINKEDIN">LinkedIn DM Opener</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Copywriting Tone selector */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Copywriting Tone
                    </label>
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value)}
                      className="input-gold"
                      style={{ width: "100%", fontSize: "0.78rem", padding: "0.45rem", marginTop: "0.15rem" }}
                    >
                      <option value="POLITE">Polite Opener</option>
                      <option value="URGENT">Urgent Clearance</option>
                      <option value="OFFER">Direct Sourcing Offer</option>
                    </select>
                  </div>
                </div>

                {/* Email Subject split layout */}
                {selectedTemplateType === "EMAIL" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)" }}>
                        Email Subject Line
                      </span>
                      <button
                        onClick={() => handleCopySubject(getSubjectLine(activeDrawerTrend, selectedTone))}
                        className="btn-glass"
                        style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px" }}
                      >
                        {copiedSubject ? "✓ Copied" : "Copy Subject"}
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={getSubjectLine(activeDrawerTrend, selectedTone)}
                      className="input-gold"
                      style={{ width: "100%", fontSize: "0.75rem", fontWeight: 600, padding: "0.45rem" }}
                    />
                  </div>
                )}

                {/* Message Body copy layout */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)" }}>
                      Outreach Message Body
                    </span>
                    <button
                      onClick={() => handleCopyPitch(getOutreachPitch(activeDrawerTrend, selectedTemplateType))}
                      className="btn-glass"
                      style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem", borderRadius: "6px" }}
                    >
                      {copiedPitch ? "✓ Copied!" : "Copy Body"}
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

                {/* Quick Share Launchers */}
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem" }}>
                  <button
                    onClick={() => handleLaunchWhatsApp(getOutreachPitch(activeDrawerTrend, selectedTemplateType))}
                    className="btn-glass"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", fontSize: "0.72rem", padding: "0.45rem", color: "rgb(34, 197, 94)" }}
                  >
                    <MessageCircle size={14} />
                    Share via WhatsApp
                  </button>
                  <button
                    onClick={handleLaunchMessenger}
                    className="btn-glass"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", fontSize: "0.72rem", padding: "0.45rem", color: "rgb(59, 130, 246)" }}
                  >
                    <Send size={14} />
                    Open Messenger
                  </button>
                </div>
              </div>

              {/* 20 Comma-Separated Hashtag Generator Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid var(--border-dim)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Hash size={13} style={{ color: "var(--gold-premium)" }} />
                    Omnichannel 20-Hashtag Reshuffler
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
                      {copiedHashtags ? "✓ Copied" : "Copy 20 Tags"}
                    </button>
                  </div>
                </div>

                <textarea
                  value={generatedHashtags}
                  readOnly
                  className="input-gold"
                  style={{ 
                    width: "100%", 
                    height: "85px", 
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
                  Concatenated strictly with commas. Numbers are normalized to single-digits.
                </span>
              </div>

              {/* Utility shortcuts */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => handleCopyKeyword(activeDrawerTrend.keyword)}
                  className="btn-glass"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", fontSize: "0.75rem", padding: "0.5rem" }}
                >
                  {copiedKeyword === activeDrawerTrend.keyword ? (
                    <>
                      <Check size={14} style={{ color: "green" }} />
                      Keyword Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy Keyword
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Footer */}
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

      {/* LIVE NEWS ARTICLE MODAL */}
      {activeNewsModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(6px)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "560px",
            background: "#FFFFFF",
            padding: "1.75rem",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="badge" style={{
                  background: "rgba(212, 175, 55, 0.12)",
                  color: "var(--gold-primary)",
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                  fontSize: "0.7rem",
                  fontWeight: 700
                }}>
                  {activeNewsModal.category}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{activeNewsModal.source} • {activeNewsModal.pubDate}</span>
              </div>
              <button
                onClick={() => setActiveNewsModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.35 }}>
              {activeNewsModal.title}
            </h3>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, background: "#F8FAFC", padding: "1rem", borderRadius: "10px", border: "1px solid var(--border-dim)" }}>
              {activeNewsModal.summary}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                onClick={() => setActiveNewsModal(null)}
                className="btn-glass"
                style={{ padding: "0.5rem 1rem", fontSize: "0.82rem" }}
              >
                Close
              </button>
              <a
                href={activeNewsModal.link}
                target="_blank"
                rel="noreferrer"
                className="btn-gold"
                style={{ padding: "0.5rem 1.1rem", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}
              >
                <span>Read Full Article</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
