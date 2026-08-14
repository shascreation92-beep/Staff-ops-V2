export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_OWNER" | "TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT";
  dutyStatus: "ON_DUTY" | "ON_BREAK" | "OFF_DUTY";
  clockInTime?: string;
  totalMinutes?: number;
  avatarBg: string;
  assignedAccountsCount: number;
  verifiedAccountsCount: number;
}

export interface MockAccount {
  id: string;
  seriesNumber: string;
  platform: "Vinted UK" | "Facebook Marketplace" | "eBay UK";
  accountHolder: string;
  status: "VERIFIED" | "UNDER_REVIEW" | "SORTED" | "ACTIVE";
  verificationStatus: "Yes" | "No";
  issueType?: string;
  assignedTo: string;
  earnings: number;
  createdAt: string;
}

export interface MockChatMessage {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  time: string;
  isSelf: boolean;
}

export interface MockNote {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  updatedAt: string;
}

export const INITIAL_DEMO_USERS: MockUser[] = [
  {
    id: "user-1",
    name: "Faizan Cheena (Demo Admin)",
    email: "admin@worknodesaas.com",
    role: "SUPER_ADMIN",
    dutyStatus: "ON_DUTY",
    clockInTime: "08:30 AM",
    totalMinutes: 245,
    avatarBg: "from-blue-600 to-indigo-700",
    assignedAccountsCount: 24,
    verifiedAccountsCount: 22
  },
  {
    id: "user-2",
    name: "Sarah Jenkins",
    email: "sarah.j@acmeops.co.uk",
    role: "TEAM_LEAD",
    dutyStatus: "ON_DUTY",
    clockInTime: "09:00 AM",
    totalMinutes: 215,
    avatarBg: "from-sky-500 to-blue-600",
    assignedAccountsCount: 18,
    verifiedAccountsCount: 16
  },
  {
    id: "user-3",
    name: "Alex Thorne",
    email: "alex.t@acmeops.co.uk",
    role: "SALES_ASSOCIATE",
    dutyStatus: "ON_DUTY",
    clockInTime: "09:15 AM",
    totalMinutes: 200,
    avatarBg: "from-emerald-500 to-teal-600",
    assignedAccountsCount: 12,
    verifiedAccountsCount: 10
  },
  {
    id: "user-4",
    name: "Marcus Vance",
    email: "marcus.v@acmeops.co.uk",
    role: "SALES_ASSOCIATE",
    dutyStatus: "ON_BREAK",
    clockInTime: "09:30 AM",
    totalMinutes: 185,
    avatarBg: "from-amber-500 to-orange-600",
    assignedAccountsCount: 9,
    verifiedAccountsCount: 8
  },
  {
    id: "user-5",
    name: "Liam O'Connor",
    email: "liam.it@acmeops.co.uk",
    role: "IT_DEPARTMENT",
    dutyStatus: "ON_DUTY",
    clockInTime: "08:45 AM",
    totalMinutes: 230,
    avatarBg: "from-purple-500 to-pink-600",
    assignedAccountsCount: 0,
    verifiedAccountsCount: 0
  }
];

export const INITIAL_DEMO_ACCOUNTS: MockAccount[] = [
  {
    id: "acc-101",
    seriesNumber: "VT-UK-8841",
    platform: "Vinted UK",
    accountHolder: "Oliver Wright",
    status: "VERIFIED",
    verificationStatus: "Yes",
    assignedTo: "Alex Thorne",
    earnings: 300,
    createdAt: "2026-08-14 10:15"
  },
  {
    id: "acc-102",
    seriesNumber: "FB-LDN-9921",
    platform: "Facebook Marketplace",
    accountHolder: "Emma Davis",
    status: "VERIFIED",
    verificationStatus: "Yes",
    assignedTo: "Marcus Vance",
    earnings: 300,
    createdAt: "2026-08-14 11:30"
  },
  {
    id: "acc-103",
    seriesNumber: "EB-MCR-4412",
    platform: "eBay UK",
    accountHolder: "Harry Walker",
    status: "UNDER_REVIEW",
    verificationStatus: "No",
    issueType: "Identity Issue",
    assignedTo: "Alex Thorne",
    earnings: 0,
    createdAt: "2026-08-14 12:45"
  },
  {
    id: "acc-104",
    seriesNumber: "VT-UK-7729",
    platform: "Vinted UK",
    accountHolder: "Charlotte Evans",
    status: "VERIFIED",
    verificationStatus: "Yes",
    assignedTo: "Alex Thorne",
    earnings: 300,
    createdAt: "2026-08-14 13:10"
  },
  {
    id: "acc-105",
    seriesNumber: "FB-BIR-3310",
    platform: "Facebook Marketplace",
    accountHolder: "James Taylor",
    status: "SORTED",
    verificationStatus: "Yes",
    assignedTo: "Marcus Vance",
    earnings: 300,
    createdAt: "2026-08-14 14:00"
  }
];

export const INITIAL_DEMO_CHATS: MockChatMessage[] = [
  {
    id: "chat-1",
    senderName: "Sarah Jenkins (Team Lead)",
    senderRole: "TEAM_LEAD",
    message: "Good morning team! We have a daily goal of 25 account verifications today. Let's make sure all Vinted numbers are updated.",
    time: "09:05 AM",
    isSelf: false
  },
  {
    id: "chat-2",
    senderName: "Alex Thorne",
    senderRole: "SALES_ASSOCIATE",
    message: "Just completed VT-UK-8841 verification and uploaded payout credentials. Starting on batch 2 now.",
    time: "09:42 AM",
    isSelf: false
  },
  {
    id: "chat-3",
    senderName: "Liam O'Connor (IT)",
    senderRole: "IT_DEPARTMENT",
    message: "Surfshark London server node 4 updated. All active desktop agents are on healthy low latency.",
    time: "10:15 AM",
    isSelf: false
  }
];

export const INITIAL_DEMO_NOTES: MockNote[] = [
  {
    id: "note-1",
    title: "Vinted UK Verification Checklist",
    content: "1. Match UK residential proxy IP with account postcode.\n2. Confirm phone SMS OTP before creating listings.\n3. Add 3 clear product photos with neutral background.",
    category: "Operations",
    isPinned: true,
    updatedAt: "Today, 10:20 AM"
  },
  {
    id: "note-2",
    title: "Daily Sales Target Rules",
    content: "Minimum 40 active verified accounts per team to maintain target tier bonuses. Review payout thresholds daily.",
    category: "Targets",
    isPinned: false,
    updatedAt: "Yesterday, 04:15 PM"
  }
];
