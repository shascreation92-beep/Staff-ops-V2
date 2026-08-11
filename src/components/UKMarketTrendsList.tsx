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
  Download,
  Clock,
  Building
} from "lucide-react";
import { toast } from "react-hot-toast";
import { downloadCSV } from "@/lib/csv-exporter";
import { playCrystalChime } from "@/components/NotificationBell";
import { sendDesktopNotification } from "@/lib/push-notifications";
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

  // 6 Furniture-Specific API & Sales Assistant States
  const [adScannerText, setAdScannerText] = useState<string>("");
  const [selectedObjectionType, setSelectedObjectionType] = useState<string>("PRICE");
  const [copiedObjection, setCopiedObjection] = useState<boolean>(false);
  const [townSearchInput, setTownSearchInput] = useState<string>("");
  const [townSuggestions, setTownSuggestions] = useState<any[]>([]);

  // Interactive UK Location Map & Granular Neighborhood Extractor State
  const [selectedClusterKey, setSelectedClusterKey] = useState<string>("MANCHESTER");
  const [selectedRadiusMiles, setSelectedRadiusMiles] = useState<number>(15);
  const [fbFormatMode, setFbFormatMode] = useState<"STANDARD_FB" | "HYPER_LOCAL" | "POSTCODE_CITY">("STANDARD_FB");
  const [copiedAllTowns, setCopiedAllTowns] = useState<boolean>(false);
  const [customSearchLocation, setCustomSearchLocation] = useState<string>("");

  const UK_REGIONAL_TOWN_CLUSTERS: { 
    [key: string]: { 
      center: string; 
      postcode: string; 
      lat: number; 
      lng: number; 
      towns: { name: string; city: string; postcode: string; dist: string; density: string }[] 
    } 
  } = {
    "MANCHESTER": {
      center: "Greater Manchester & Cheshire Hub",
      postcode: "M1",
      lat: 53.4808,
      lng: -2.2426,
      towns: [
        { name: "Manchester", city: "Manchester", postcode: "M1", dist: "0.0 miles", density: "🔥 VERY HIGH" },
        { name: "Didsbury", city: "Manchester", postcode: "M20", dist: "4.5 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Chorlton-cum-Hardy", city: "Manchester", postcode: "M21", dist: "3.8 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Ancoats", city: "Manchester", postcode: "M4", dist: "0.8 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Salford Quays & MediaCity", city: "Salford", postcode: "M50", dist: "2.1 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Salford", city: "Salford", postcode: "M3", dist: "1.2 miles", density: "🔥 VERY HIGH" },
        { name: "Stockport", city: "Stockport", postcode: "SK1", dist: "6.2 miles", density: "🔥 VERY HIGH" },
        { name: "Altrincham", city: "Trafford", postcode: "WA14", dist: "8.1 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Wilmslow", city: "Cheshire", postcode: "SK9", dist: "11.2 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Alderley Edge", city: "Cheshire", postcode: "SK9", dist: "13.5 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Hale & Hale Barns", city: "Trafford", postcode: "WA15", dist: "8.9 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Bramhall", city: "Stockport", postcode: "SK7", dist: "9.4 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Cheadle & Cheadle Hulme", city: "Stockport", postcode: "SK8", dist: "7.5 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Sale", city: "Trafford", postcode: "M33", dist: "5.4 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Prestwich", city: "Bury", postcode: "M25", dist: "4.1 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Fallowfield", city: "Manchester", postcode: "M14", dist: "2.9 miles", density: "🔥 VERY HIGH" },
        { name: "Rusholme", city: "Manchester", postcode: "M14", dist: "2.1 miles", density: "HIGH" },
        { name: "Whalley Range", city: "Manchester", postcode: "M16", dist: "2.6 miles", density: "HIGH" },
        { name: "Stretford", city: "Trafford", postcode: "M32", dist: "3.9 miles", density: "HIGH" },
        { name: "Urmston", city: "Trafford", postcode: "M41", dist: "5.8 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Eccles", city: "Salford", postcode: "M30", dist: "4.7 miles", density: "HIGH" },
        { name: "Swinton", city: "Salford", postcode: "M27", dist: "4.9 miles", density: "HIGH" },
        { name: "Bolton", city: "Bolton", postcode: "BL1", dist: "10.4 miles", density: "🔥 VERY HIGH" },
        { name: "Bury", city: "Bury", postcode: "BL9", dist: "8.7 miles", density: "🔥 VERY HIGH" },
        { name: "Oldham", city: "Oldham", postcode: "OL1", dist: "6.9 miles", density: "🔥 HIGH" },
        { name: "Rochdale", city: "Rochdale", postcode: "OL16", dist: "10.8 miles", density: "MEDIUM" },
        { name: "Ashton-under-Lyne", city: "Tameside", postcode: "OL6", dist: "6.5 miles", density: "HIGH" },
        { name: "Hyde", city: "Tameside", postcode: "SK14", dist: "7.2 miles", density: "MEDIUM" },
        { name: "Denton", city: "Tameside", postcode: "M34", dist: "5.8 miles", density: "HIGH" },
        { name: "Middleton", city: "Rochdale", postcode: "M24", dist: "5.3 miles", density: "HIGH" },
        { name: "Wythenshawe", city: "Manchester", postcode: "M22", dist: "7.1 miles", density: "HIGH" },
        { name: "Warrington", city: "Warrington", postcode: "WA1", dist: "16.8 miles", density: "🔥 VERY HIGH" },
        { name: "Wigan", city: "Wigan", postcode: "WN1", dist: "17.4 miles", density: "HIGH" },
        { name: "Leigh", city: "Wigan", postcode: "WN7", dist: "12.1 miles", density: "HIGH" },
        { name: "Knutsford", city: "Cheshire", postcode: "WA16", dist: "14.2 miles", density: "⭐ LUXURY ULTRA" }
      ]
    },
    "LONDON_SOUTH": {
      center: "South London, Surrey & Wandsworth Hub",
      postcode: "SW19",
      lat: 51.4214,
      lng: -0.2067,
      towns: [
        { name: "Wimbledon", city: "London", postcode: "SW19", dist: "0.0 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Putney", city: "London", postcode: "SW15", dist: "2.8 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Chelsea & Fulham", city: "London", postcode: "SW3", dist: "5.1 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Battersea", city: "London", postcode: "SW11", dist: "4.2 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Clapham", city: "London", postcode: "SW4", dist: "4.5 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Wandsworth", city: "London", postcode: "SW18", dist: "2.4 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Balham", city: "London", postcode: "SW12", dist: "3.6 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Tooting", city: "London", postcode: "SW17", dist: "2.1 miles", density: "🔥 VERY HIGH" },
        { name: "Richmond upon Thames", city: "London", postcode: "TW9", dist: "5.6 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Kingston upon Thames", city: "London", postcode: "KT1", dist: "4.1 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Surbiton", city: "Surrey", postcode: "KT6", dist: "5.2 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Teddington & Hampton", city: "Middlesex", postcode: "TW11", dist: "5.8 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Twickenham", city: "London", postcode: "TW1", dist: "6.1 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Raynes Park", city: "London", postcode: "SW20", dist: "1.1 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Morden", city: "Surrey", postcode: "SM4", dist: "2.3 miles", density: "HIGH" },
        { name: "Sutton", city: "Surrey", postcode: "SM1", dist: "4.8 miles", density: "🔥 VERY HIGH" },
        { name: "Croydon", city: "London", postcode: "CR0", dist: "6.4 miles", density: "🔥 VERY HIGH" },
        { name: "Brixton", city: "London", postcode: "SW2", dist: "5.8 miles", density: "🔥 VERY HIGH" },
        { name: "Streatham", city: "London", postcode: "SW16", dist: "4.3 miles", density: "HIGH" },
        { name: "Epsom & Ewell", city: "Surrey", postcode: "KT19", dist: "7.2 miles", density: "⭐ LUXURY ULTRA" }
      ]
    },
    "LONDON_NORTH": {
      center: "North London, Camden & Hertfordshire Hub",
      postcode: "N1",
      lat: 51.5362,
      lng: -0.1030,
      towns: [
        { name: "Islington", city: "London", postcode: "N1", dist: "0.0 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Camden Town & Primrose Hill", city: "London", postcode: "NW1", dist: "1.9 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Hampstead & Belsize Park", city: "London", postcode: "NW3", dist: "3.5 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Highgate", city: "London", postcode: "N6", dist: "4.2 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Muswell Hill", city: "London", postcode: "N10", dist: "5.3 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Finchley", city: "London", postcode: "N3", dist: "6.5 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Barnet", city: "London", postcode: "EN5", dist: "9.8 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Haringey & Crouch End", city: "London", postcode: "N8", dist: "3.8 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Stoke Newington", city: "London", postcode: "N16", dist: "2.1 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Hackney", city: "London", postcode: "E8", dist: "2.4 miles", density: "🔥 VERY HIGH" },
        { name: "Enfield", city: "Middlesex", postcode: "EN1", dist: "9.2 miles", density: "🔥 VERY HIGH" },
        { name: "Edmonton", city: "London", postcode: "N9", dist: "7.1 miles", density: "HIGH" },
        { name: "Tottenham", city: "London", postcode: "N17", dist: "5.4 miles", density: "🔥 VERY HIGH" },
        { name: "Wood Green", city: "London", postcode: "N22", dist: "4.7 miles", density: "HIGH" },
        { name: "St Albans", city: "Hertfordshire", postcode: "AL1", dist: "18.5 miles", density: "⭐ LUXURY ULTRA" }
      ]
    },
    "BIRMINGHAM": {
      center: "West Midlands, Solihull & Sutton Coldfield Hub",
      postcode: "B1",
      lat: 52.4862,
      lng: -1.8904,
      towns: [
        { name: "Birmingham City Centre", city: "Birmingham", postcode: "B1", dist: "0.0 miles", density: "🔥 VERY HIGH" },
        { name: "Solihull", city: "Solihull", postcode: "B91", dist: "7.4 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Edgbaston & Harborne", city: "Birmingham", postcode: "B15", dist: "2.1 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Sutton Coldfield", city: "Birmingham", postcode: "B72", dist: "6.9 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Moseley & Kings Heath", city: "Birmingham", postcode: "B13", dist: "3.2 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Jewellery Quarter", city: "Birmingham", postcode: "B18", dist: "1.1 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Dudley", city: "Dudley", postcode: "DY1", dist: "8.5 miles", density: "🔥 HIGH" },
        { name: "Walsall", city: "Walsall", postcode: "WS1", dist: "8.2 miles", density: "🔥 HIGH" },
        { name: "West Bromwich", city: "Sandwell", postcode: "B70", dist: "5.1 miles", density: "HIGH" },
        { name: "Halesowen", city: "Dudley", postcode: "B63", dist: "7.8 miles", density: "HIGH" },
        { name: "Stourbridge", city: "Dudley", postcode: "DY8", dist: "11.4 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Oldbury & Smethwick", city: "Sandwell", postcode: "B68", dist: "4.2 miles", density: "HIGH" },
        { name: "Tamworth", city: "Staffordshire", postcode: "B79", dist: "13.6 miles", density: "HIGH" },
        { name: "Redditch", city: "Worcestershire", postcode: "B97", dist: "12.8 miles", density: "HIGH" },
        { name: "Royal Leamington Spa", city: "Warwickshire", postcode: "CV32", dist: "21.4 miles", density: "⭐ LUXURY ULTRA" }
      ]
    },
    "LEEDS": {
      center: "West Yorkshire, Bradford & Harrogate Hub",
      postcode: "LS1",
      lat: 53.7997,
      lng: -1.5491,
      towns: [
        { name: "Leeds", city: "Leeds", postcode: "LS1", dist: "0.0 miles", density: "🔥 VERY HIGH" },
        { name: "Headingley & Hyde Park", city: "Leeds", postcode: "LS6", dist: "2.1 miles", density: "🔥 VERY HIGH" },
        { name: "Roundhay & Alwoodley", city: "Leeds", postcode: "LS17", dist: "4.8 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Horsforth", city: "Leeds", postcode: "LS18", dist: "5.2 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Bradford", city: "Bradford", postcode: "BD1", dist: "8.6 miles", density: "🔥 VERY HIGH" },
        { name: "Harrogate", city: "North Yorkshire", postcode: "HG1", dist: "14.5 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Ilkley", city: "Bradford", postcode: "LS29", dist: "15.4 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Wakefield", city: "Wakefield", postcode: "WF1", dist: "9.1 miles", density: "🔥 HIGH" },
        { name: "Huddersfield", city: "Kirklees", postcode: "HD1", dist: "14.2 miles", density: "HIGH" },
        { name: "Halifax", city: "Calderdale", postcode: "HX1", dist: "14.8 miles", density: "HIGH" },
        { name: "Dewsbury & Batley", city: "Kirklees", postcode: "WF13", dist: "7.8 miles", density: "HIGH" },
        { name: "Pudsey & Farsley", city: "Leeds", postcode: "LS28", dist: "4.8 miles", density: "HIGH" },
        { name: "Morley", city: "Leeds", postcode: "LS27", dist: "4.9 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Guiseley & Yeadon", city: "Leeds", postcode: "LS20", dist: "8.7 miles", density: "⭐ PREMIUM HIGH" }
      ]
    },
    "BRISTOL": {
      center: "Bristol, Bath & North Somerset Hub",
      postcode: "BS1",
      lat: 51.4545,
      lng: -2.5879,
      towns: [
        { name: "Bristol City Centre", city: "Bristol", postcode: "BS1", dist: "0.0 miles", density: "🔥 VERY HIGH" },
        { name: "Clifton & Redland", city: "Bristol", postcode: "BS8", dist: "1.8 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Bath", city: "Somerset", postcode: "BA1", dist: "11.5 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Henleaze & Westbury-on-Trym", city: "Bristol", postcode: "BS9", dist: "3.2 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Bedminster & Southville", city: "Bristol", postcode: "BS3", dist: "1.4 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Weston-super-Mare", city: "North Somerset", postcode: "BS23", dist: "18.4 miles", density: "HIGH" },
        { name: "Keynsham", city: "Bath & NE Somerset", postcode: "BS31", dist: "5.2 miles", density: "HIGH" },
        { name: "Yate & Chipping Sodbury", city: "South Gloucestershire", postcode: "BS37", dist: "9.8 miles", density: "HIGH" },
        { name: "Thornbury", city: "South Gloucestershire", postcode: "BS35", dist: "11.1 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Portishead", city: "North Somerset", postcode: "BS20", dist: "8.7 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Clevedon", city: "North Somerset", postcode: "BS21", dist: "12.3 miles", density: "HIGH" },
        { name: "Filton & Bradley Stoke", city: "South Gloucestershire", postcode: "BS34", dist: "5.1 miles", density: "HIGH" }
      ]
    },
    "GLASGOW": {
      center: "Central Scotland, Glasgow & Lanarkshire Hub",
      postcode: "G1",
      lat: 55.8642,
      lng: -4.2518,
      towns: [
        { name: "Glasgow City Centre", city: "Glasgow", postcode: "G1", dist: "0.0 miles", density: "🔥 VERY HIGH" },
        { name: "West End & Hillhead", city: "Glasgow", postcode: "G12", dist: "2.4 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Newton Mearns & Giffnock", city: "East Renfrewshire", postcode: "G77", dist: "7.3 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Bearsden & Milngavie", city: "East Dunbartonshire", postcode: "G61", dist: "6.1 miles", density: "⭐ LUXURY ULTRA" },
        { name: "Merchant City & Shawlands", city: "Glasgow", postcode: "G41", dist: "2.1 miles", density: "⭐ PREMIUM HIGH" },
        { name: "Paisley", city: "Renfrewshire", postcode: "PA1", dist: "7.1 miles", density: "🔥 HIGH" },
        { name: "East Kilbride", city: "South Lanarkshire", postcode: "G74", dist: "8.4 miles", density: "🔥 HIGH" },
        { name: "Hamilton", city: "South Lanarkshire", postcode: "ML3", dist: "10.8 miles", density: "HIGH" },
        { name: "Cumbernauld", city: "North Lanarkshire", postcode: "G67", dist: "12.6 miles", density: "HIGH" },
        { name: "Coatbridge & Airdrie", city: "North Lanarkshire", postcode: "ML5", dist: "9.2 miles", density: "HIGH" },
        { name: "Clydebank", city: "West Dunbartonshire", postcode: "G81", dist: "6.8 miles", density: "HIGH" }
      ]
    }
  };

  const getFormattedFbLocationTag = (town: { name: string; city: string; postcode: string }) => {
    if (fbFormatMode === "HYPER_LOCAL") {
      return `${town.name}, ${town.city}, United Kingdom`;
    }
    if (fbFormatMode === "POSTCODE_CITY") {
      return `${town.postcode} ${town.name}, ${town.city}`;
    }
    // Default STANDARD_FB: "Town, United Kingdom"
    return `${town.name}, United Kingdom`;
  };

  // Item 12: FB High Purchasing Power Zip Code & Location Detector State & Data
  const [radarInput, setRadarInput] = useState<string>("SW19");

  const RICH_UK_LOCATIONS: { [key: string]: { name: string; tier: string; upsell: string; rrp: string } } = {
    "SW19": { name: "Wimbledon, London", tier: "PREMIUM HIGH", upsell: "Plush Velvet Ottoman Storage Bed + Memory Foam Mattress", rrp: "£499 - £899" },
    "W8": { name: "Kensington, London", tier: "LUXURY ULTRA", upsell: "3-Door Mirrored Sliding Wardrobe + King Divan Set", rrp: "£650 - £1,200" },
    "SW3": { name: "Chelsea, London", tier: "LUXURY ULTRA", upsell: "Corner Recliner Sofa in Plush Velvet", rrp: "£799 - £1,499" },
    "B91": { name: "Solihull, West Midlands", tier: "PREMIUM HIGH", upsell: "Gas-Lift Ottoman Bed Frame with LED Headboard", rrp: "£450 - £799" },
    "HG1": { name: "Harrogate, North Yorkshire", tier: "PREMIUM HIGH", upsell: "Chesterfield Plush Velvet Sleigh Bed Set", rrp: "£420 - £750" },
    "WA15": { name: "Hale / Altrincham, Greater Manchester", tier: "PREMIUM HIGH", upsell: "203cm Sliding Wardrobe + Orthopaedic Mattress", rrp: "£550 - £950" },
    "AL1": { name: "St Albans, Hertfordshire", tier: "PREMIUM HIGH", upsell: "Double Divan Bed with 4 Storage Drawers", rrp: "£380 - £680" },
    "TW9": { name: "Richmond, London", tier: "PREMIUM HIGH", upsell: "Corner Velvet Lounge Sofa + Matching Footstool", rrp: "£699 - £1,199" },
    "BA1": { name: "Bath, Somerset", tier: "PREMIUM HIGH", upsell: "Super King Ottoman Bed + Pocket Sprung Mattress", rrp: "£599 - £1,050" }
  };

  const getPurchasingPowerDetails = (query: string) => {
    if (!query.trim()) return null;
    const clean = query.trim().toUpperCase();
    for (const key in RICH_UK_LOCATIONS) {
      if (clean.includes(key)) {
        return RICH_UK_LOCATIONS[key];
      }
    }
    return { name: clean, tier: "STANDARD REGIONAL", upsell: "Standard Divan Bed / 2-Door Wardrobe Package", rrp: "£250 - £450" };
  };

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

  // Banned Keyword Anti-Flagging Scanner Rules
  const BANNED_KEYWORDS = [
    { word: "whatsapp", replacement: "contact us via direct message" },
    { word: "cheap replica", replacement: "high-quality custom model" },
    { word: "cash guaranteed", replacement: "cash on delivery option" },
    { word: "100% free delivery worldwide", replacement: "free local UK delivery" },
    { word: "original brand copy", replacement: "handcrafted bespoke design" },
    { word: "wire transfer only", replacement: "secure payment on delivery" },
    { word: "crypto payment", replacement: "standard cash or card payment" }
  ];

  const getScanResults = (text: string) => {
    if (!text.trim()) return { isSafe: true, riskScore: 0, flagged: [], safeText: "" };
    const lower = text.toLowerCase();
    const flagged: string[] = [];
    let safeText = text;

    BANNED_KEYWORDS.forEach(item => {
      if (lower.includes(item.word)) {
        flagged.push(item.word);
        const regex = new RegExp(item.word, "gi");
        safeText = safeText.replace(regex, item.replacement);
      }
    });

    return {
      isSafe: flagged.length === 0,
      riskScore: Math.min(100, flagged.length * 40),
      flagged,
      safeText
    };
  };

  const HIGH_PURCHASING_POWER_POSTCODES = [
    "SW1A", "SW3", "W8", "W1J", "SW19", "B91", "HG1", "WA15", "AL1", "TW9", "BA1", "M1", "B2"
  ];

  const checkIsHighPurchasingPower = (postcodeOrText?: string | null): boolean => {
    if (!postcodeOrText) return false;
    const t = postcodeOrText.toUpperCase();
    return HIGH_PURCHASING_POWER_POSTCODES.some(p => t.includes(p));
  };

  const getObjectionReplyText = (type: string, trend?: TrendItem | null): string => {
    const kw = trend?.keyword || "furniture item";
    if (type === "PRICE") {
      return `Hi! Our prices for "${kw}" are direct from our UK manufacturing warehouse with zero retail markup, so they are already set at minimum trade cost. However, we can offer free priority delivery if you confirm your order today!`;
    }
    if (type === "DELIVERY") {
      return `Hi! Yes, we have active delivery drivers in your area. If you confirm your order before 2 PM, we can assign a 2-man delivery slot for you as early as tomorrow morning!`;
    }
    if (type === "ASSEMBLY") {
      return `Hi! Our beds and wardrobes come with clear step-by-step assembly guides. We also offer optional 2-man room-of-choice assembly upon delivery for a small service fee. Let us know if you'd like us to include assembly!`;
    }
    if (type === "UPSTAIRS") {
      return `Hi! Yes, our 2-man delivery team can carry your "${kw}" upstairs into your room of choice, as long as hallways and staircases are clear!`;
    }
    if (type === "COD") {
      return `Hi! Yes, we support Cash on Delivery (COD) for local deliveries! You can inspect your item upon arrival and pay cash directly to the driver upon delivery.`;
    }
    return `Hi! Thank you for inquiring about "${kw}". Let us know your delivery postcode and we will send you full details!`;
  };

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

    // Nextdoor Community Pitch Generator (3 Community Tones)
    if (selectedTone === "NEXTDOOR_FRIENDLY") {
      return `Hi neighbors! 🏡 We are downsizing our bedroom setup in ${postcode} and have a brand new, immaculate condition "${kw}" available. Handcrafted UK quality with plush velvet options. Feel free to message me for pictures or to arrange local delivery!`;
    }

    if (selectedTone === "NEXTDOOR_WAREHOUSE") {
      return `Hello community! 🏬 We are a local family-owned furniture supplier serving ${postcode} & surrounding areas. We supply custom-made Divan Beds, Sliding Wardrobes & Sofas direct from our UK manufacturing warehouse with zero retail markups. Message us to check inventory!`;
    }

    if (selectedTone === "NEXTDOOR_SAMEDAY") {
      return `Local Delivery Alert! 🚚 We have priority delivery drivers operating in ${postcode} today. If anyone is looking for a "${kw}", we can deliver directly to your door with Cash on Delivery (COD) options. Send a message to claim today's delivery slot!`;
    }

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
          background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)",
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

      {/* 🛡️ ANTI-FLAGGING BANNED KEYWORD SCANNER (FB MARKETPLACE / EBAY) */}
      <div className="glass-panel" style={{ padding: "0.85rem 1.1rem", borderRadius: "12px", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Sparkles style={{ color: getScanResults(adScannerText).isSafe ? "#10B981" : "#EF4444" }} size={16} />
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)" }}>
              🛡️ ANTI-FLAGGING BANNED KEYWORD SCANNER (FB MARKETPLACE / EBAY)
            </span>
          </div>
          <span className="badge" style={{
            fontSize: "0.68rem",
            fontWeight: 800,
            background: getScanResults(adScannerText).isSafe ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: getScanResults(adScannerText).isSafe ? "#10B981" : "#EF4444",
            padding: "0.15rem 0.5rem"
          }}>
            {getScanResults(adScannerText).isSafe ? "🟢 SAFE TO POST" : `🔴 RISK DETECTED (${getScanResults(adScannerText).flagged.length} WORD FLAGGED)`}
          </span>
        </div>

        <input
          type="text"
          placeholder="Paste furniture ad title or copy here to test for shadow-ban risk words before posting..."
          value={adScannerText}
          onChange={(e) => setAdScannerText(e.target.value)}
          className="input-gold"
          style={{ width: "100%", fontSize: "0.78rem", padding: "0.45rem" }}
        />

        {!getScanResults(adScannerText).isSafe && (
          <div style={{ fontSize: "0.72rem", color: "#EF4444", background: "rgba(239, 68, 68, 0.05)", padding: "0.5rem", borderRadius: "6px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <strong>Flagged Trigger Words:</strong> {getScanResults(adScannerText).flagged.join(", ")}.
            <br />
            <strong>Suggested Safe Replacements:</strong> "{getScanResults(adScannerText).safeText}"
          </div>
        )}
      </div>

      {/* 🇬🇧 INTERACTIVE UK LOCATION MAP & RADIUS EXTRACTOR FOR FB MARKETPLACE */}
      <div className="glass-panel" style={{ padding: "1.1rem", borderRadius: "14px", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin style={{ color: "var(--gold-premium)" }} size={20} />
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                🇬🇧 INTERACTIVE UK LOCATION MAP & RADIUS EXTRACTOR (FOR FB MARKETPLACE)
              </h3>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Select any UK regional hub to extract all surrounding towns & postcodes within radius for 1-click copying to Facebook Marketplace listings.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <select
              value={selectedClusterKey}
              onChange={(e) => setSelectedClusterKey(e.target.value)}
              className="input-gold"
              style={{ fontSize: "0.78rem", padding: "0.45rem", fontWeight: 700 }}
            >
              <option value="MANCHESTER">📍 Greater Manchester & North West (M1)</option>
              <option value="LONDON_SOUTH">📍 South London & Surrey Hub (SW19)</option>
              <option value="LONDON_NORTH">📍 North London & Herts (N1)</option>
              <option value="BIRMINGHAM">📍 West Midlands & Solihull (B1)</option>
              <option value="LEEDS">📍 West Yorkshire & Bradford (LS1)</option>
              <option value="BRISTOL">📍 Bristol & Bath Region (BS1)</option>
              <option value="GLASGOW">📍 Central Scotland (G1)</option>
            </select>

            <select
              value={selectedRadiusMiles}
              onChange={(e) => setSelectedRadiusMiles(Number(e.target.value))}
              className="input-gold"
              style={{ fontSize: "0.78rem", padding: "0.45rem", fontWeight: 700 }}
            >
              <option value={5}>Radius: 5 Miles</option>
              <option value={10}>Radius: 10 Miles</option>
              <option value={15}>Radius: 15 Miles (Recommended)</option>
              <option value={25}>Radius: 25 Miles</option>
              <option value={50}>Radius: 50 Miles</option>
            </select>
          </div>
        </div>

        {/* INTERACTIVE UK VISUAL REGION RADAR MAP PANEL */}
        <div style={{
          position: "relative",
          width: "100%",
          height: "180px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          borderRadius: "10px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(212, 175, 55, 0.3)"
        }}>
          {/* Map Grid Background Graphic */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(212, 175, 55, 0.15) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }} />

          {/* Interactive Region Hotspot Pins */}
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "1rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--gold-primary)", textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(212, 175, 55, 0.12)", padding: "0.2rem 0.6rem", borderRadius: "20px", border: "1px solid rgba(212, 175, 55, 0.3)" }}>
              🎯 ACTIVE REGIONAL HUB: {UK_REGIONAL_TOWN_CLUSTERS[selectedClusterKey]?.center}
            </span>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              {Object.keys(UK_REGIONAL_TOWN_CLUSTERS).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedClusterKey(key)}
                  style={{
                    padding: "0.35rem 0.65rem",
                    fontSize: "0.7rem",
                    fontWeight: selectedClusterKey === key ? 800 : 600,
                    background: selectedClusterKey === key ? "var(--gold-premium)" : "rgba(255, 255, 255, 0.1)",
                    color: selectedClusterKey === key ? "#FFFFFF" : "#CBD5E1",
                    border: selectedClusterKey === key ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  📍 {UK_REGIONAL_TOWN_CLUSTERS[key].postcode} - {key.replace("_", " ")}
                </button>
              ))}
            </div>

            <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
              Extracted <strong>{UK_REGIONAL_TOWN_CLUSTERS[selectedClusterKey]?.towns.length} Surrounding Towns</strong> within {selectedRadiusMiles}-mile delivery radius around {UK_REGIONAL_TOWN_CLUSTERS[selectedClusterKey]?.postcode}.
            </span>
          </div>
        </div>

        {/* EXTRACTED TOWNS TABLE & 1-CLICK COPY ACTIONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Sparkles size={14} style={{ color: "var(--gold-premium)" }} />
                Extracted ({UK_REGIONAL_TOWN_CLUSTERS[selectedClusterKey]?.towns.length} Sub-Districts & Neighborhoods)
              </span>
            </div>

            {/* FB Format Mode Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "#F1F5F9", padding: "0.2rem", borderRadius: "8px" }}>
              <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-muted)", padding: "0 0.4rem" }}>FB Tag Format:</span>
              <button
                onClick={() => setFbFormatMode("STANDARD_FB")}
                style={{
                  fontSize: "0.65rem",
                  fontWeight: fbFormatMode === "STANDARD_FB" ? 800 : 600,
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: fbFormatMode === "STANDARD_FB" ? "var(--gold-premium)" : "transparent",
                  color: fbFormatMode === "STANDARD_FB" ? "#FFFFFF" : "var(--text-secondary)"
                }}
              >
                Town, United Kingdom
              </button>
              <button
                onClick={() => setFbFormatMode("HYPER_LOCAL")}
                style={{
                  fontSize: "0.65rem",
                  fontWeight: fbFormatMode === "HYPER_LOCAL" ? 800 : 600,
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: fbFormatMode === "HYPER_LOCAL" ? "var(--gold-premium)" : "transparent",
                  color: fbFormatMode === "HYPER_LOCAL" ? "#FFFFFF" : "var(--text-secondary)"
                }}
              >
                Neighborhood, City, UK
              </button>
              <button
                onClick={() => setFbFormatMode("POSTCODE_CITY")}
                style={{
                  fontSize: "0.65rem",
                  fontWeight: fbFormatMode === "POSTCODE_CITY" ? 800 : 600,
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: fbFormatMode === "POSTCODE_CITY" ? "var(--gold-premium)" : "transparent",
                  color: fbFormatMode === "POSTCODE_CITY" ? "#FFFFFF" : "var(--text-secondary)"
                }}
              >
                Postcode Area
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                onClick={() => {
                  const formattedList = UK_REGIONAL_TOWN_CLUSTERS[selectedClusterKey].towns.map(t => getFormattedFbLocationTag(t)).join(", ");
                  navigator.clipboard.writeText(formattedList);
                  setCopiedAllTowns(true);
                  toast.success(`Copied ${UK_REGIONAL_TOWN_CLUSTERS[selectedClusterKey].towns.length} FB Marketplace formatted tags!`);
                  setTimeout(() => setCopiedAllTowns(false), 2000);
                }}
                className="btn-gold"
                style={{ fontSize: "0.72rem", padding: "0.35rem 0.75rem", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
              >
                <Copy size={13} />
                <span>{copiedAllTowns ? "✓ Copied All FB Tags!" : "📋 Copy All FB Formatted Tags"}</span>
              </button>
            </div>
          </div>

          <div style={{ maxHeight: "220px", overflowY: "auto", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "8px", background: "rgba(20, 18, 38, 0.75)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#0284C7", color: "#FFFFFF", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  <th style={{ padding: "0.45rem 0.75rem", color: "#FFFFFF" }}>Neighborhood / District</th>
                  <th style={{ padding: "0.45rem 0.75rem", color: "#FFFFFF" }}>Postcode</th>
                  <th style={{ padding: "0.45rem 0.75rem", color: "#FFFFFF" }}>Exact FB Marketplace Tag</th>
                  <th style={{ padding: "0.45rem 0.75rem", color: "#FFFFFF" }}>Buyer Density</th>
                  <th style={{ padding: "0.45rem 0.75rem", textAlign: "right", color: "#FFFFFF" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {UK_REGIONAL_TOWN_CLUSTERS[selectedClusterKey]?.towns.map((town, idx) => {
                  const formattedTag = getFormattedFbLocationTag(town);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", background: idx % 2 === 0 ? "rgba(20, 18, 38, 0.6)" : "rgba(255, 255, 255, 0.02)" }}>
                      <td style={{ padding: "0.45rem 0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        📍 {town.name} ({town.city})
                      </td>
                      <td style={{ padding: "0.45rem 0.75rem", fontWeight: 600, color: "#2563EB" }}>
                        {town.postcode}
                      </td>
                      <td style={{ padding: "0.45rem 0.75rem", fontWeight: 600, color: "var(--gold-premium)" }}>
                        "{formattedTag}"
                      </td>
                      <td style={{ padding: "0.45rem 0.75rem" }}>
                        <span className="badge" style={{
                          fontSize: "0.6rem",
                          fontWeight: 800,
                          background: town.density.includes("LUXURY") ? "rgba(212, 175, 55, 0.15)" : town.density.includes("VERY HIGH") ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
                          color: town.density.includes("LUXURY") ? "var(--gold-primary)" : town.density.includes("VERY HIGH") ? "#EF4444" : "#2563EB"
                        }}>
                          {town.density}
                        </span>
                      </td>
                      <td style={{ padding: "0.45rem 0.75rem", textAlign: "right" }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(formattedTag);
                            toast.success(`Copied "${formattedTag}"!`);
                          }}
                          className="btn-glass"
                          style={{ fontSize: "0.62rem", padding: "0.15rem 0.45rem" }}
                        >
                          Copy FB Tag
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
                  background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)", 
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

                {/* 1-Click Buyer Objection Replier */}
                <div className="glass-panel" style={{ padding: "0.85rem", borderRadius: "10px", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)", border: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", color: "var(--gold-premium)" }}>
                      💰 1-Click Buyer Objection Replier
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getObjectionReplyText(selectedObjectionType, activeDrawerTrend));
                        setCopiedObjection(true);
                        toast.success("Objection response copied!");
                        setTimeout(() => setCopiedObjection(false), 2000);
                      }}
                      className="btn-glass"
                      style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}
                    >
                      {copiedObjection ? "✓ Copied" : "Copy Answer"}
                    </button>
                  </div>

                  <select
                    value={selectedObjectionType}
                    onChange={(e) => setSelectedObjectionType(e.target.value)}
                    className="input-gold"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.35rem" }}
                  >
                    <option value="PRICE">🏷️ "What's your last price / best offer?"</option>
                    <option value="DELIVERY">🚚 "Can you deliver today / Is delivery free?"</option>
                    <option value="ASSEMBLY">🛠️ "Is assembly included?"</option>
                    <option value="UPSTAIRS">🏠 "Can you bring it upstairs into my bedroom?"</option>
                    <option value="COD">💵 "Do you accept Cash on Delivery?"</option>
                  </select>

                  <textarea
                    readOnly
                    value={getObjectionReplyText(selectedObjectionType, activeDrawerTrend)}
                    className="input-gold"
                    style={{ width: "100%", height: "75px", fontSize: "0.72rem", background: "#F8FAFC", padding: "0.5rem", resize: "none" }}
                  />
                </div>

                {/* Hashtag Generator */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
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
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)", padding: "0.15rem 0.4rem", borderRadius: "6px", border: "1px solid var(--border-dim)" }}>
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
                  <div className="glass-panel" style={{ padding: "0.85rem", borderRadius: "10px", background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)", border: "1px solid var(--border-dim)" }}>
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
                      <option value="NEXTDOOR_FRIENDLY">🏡 Nextdoor Friendly Resident</option>
                      <option value="NEXTDOOR_WAREHOUSE">🏬 Nextdoor Direct Warehouse</option>
                      <option value="NEXTDOOR_SAMEDAY">🚚 Nextdoor Same-Day Special</option>
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
                      background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)",
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
                    background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)",
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
            background: "rgba(20, 18, 38, 0.75)", backdropFilter: "blur(16px)",
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
