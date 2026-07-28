"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Power, 
  Coffee, 
  UserX, 
  Clock, 
  Search, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { toggleShiftDutyAction, getUserCurrentDutyAction, getCompanyDutyAttendanceAction } from "@/app/actions/shift";
import { toast } from "react-hot-toast";

interface AttendanceDashboardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    companyId?: string | null;
  };
}

export default function AttendanceDashboard({ user }: AttendanceDashboardProps) {
  // Duty Shift States
  const [dutyStatus, setDutyStatus] = useState<string>("OFF_DUTY");
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [shiftNotesInput, setShiftNotesInput] = useState("");

  // Attendance Telemetry States
  const [attendanceTab, setAttendanceTab] = useState<"NOT_SIGNED_IN" | "ON_DUTY" | "ON_BREAK">("NOT_SIGNED_IN");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{
    totalCount: number;
    onDutyCount: number;
    onBreakCount: number;
    notSignedInCount: number;
    onDutyMembers: any[];
    onBreakMembers: any[];
    notSignedInMembers: any[];
  }>({
    totalCount: 0,
    onDutyCount: 0,
    onBreakCount: 0,
    notSignedInCount: 0,
    onDutyMembers: [],
    onBreakMembers: [],
    notSignedInMembers: []
  });

  // Fetch Current Duty & Company Attendance Telemetry
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const dutyRes = await getUserCurrentDutyAction();
      if (dutyRes.success) {
        setDutyStatus(dutyRes.dutyStatus || "OFF_DUTY");
        setClockInTime(dutyRes.clockInTime || null);
      }

      if (["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"].includes(user.role)) {
        const attRes = await getCompanyDutyAttendanceAction();
        if (attRes.success && attRes.totalCount !== undefined) {
          setAttendanceData(attRes as any);
        }
      }
    } catch (err: any) {
      console.error("Failed to load attendance data", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, [user.role]);

  const handleToggleDuty = async (newStatus: "ON_DUTY" | "ON_BREAK" | "OFF_DUTY", notes?: string) => {
    setIsTogglingDuty(true);
    try {
      const res = await toggleShiftDutyAction(newStatus, notes);
      if (res.success) {
        setDutyStatus(res.dutyStatus || "OFF_DUTY");
        toast.success(`Shift status set to ${newStatus.replace("_", " ")}`);
        setShowClockOutModal(false);
        setShiftNotesInput("");
        loadData();
      } else {
        toast.error(res.error || "Failed to update shift status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update shift status.");
    } finally {
      setIsTogglingDuty(false);
    }
  };

  const handleSendReminder = (memberName: string, memberEmail: string) => {
    toast.success(`Sign-In Clock-In reminder notification sent to ${memberName} (${memberEmail})!`);
  };

  // Filter members by search query
  const filterMembers = (members: any[]) => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(m => 
      m.name?.toLowerCase().includes(q) || 
      m.email?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q)
    );
  };

  const filteredNotSignedIn = filterMembers(attendanceData.notSignedInMembers);
  const filteredOnDuty = filterMembers(attendanceData.onDutyMembers);
  const filteredOnBreak = filterMembers(attendanceData.onBreakMembers);

  return (
    <div style={{ padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "1400px", margin: 0 }}>
      {/* Top Header Card */}
      <div className="glass-panel" style={{
        padding: "1.75rem 2rem",
        background: "linear-gradient(135deg, rgba(3, 4, 94, 0.04) 0%, rgba(0, 119, 182, 0.08) 100%)",
        border: "1px solid var(--border-dim)",
        borderRadius: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Clock size={24} style={{ color: "#0077B6" }} />
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Shift Attendance & Live Telemetry
            </h1>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.35rem 0 0 0" }}>
            Manage your daily shift duty, track team presence, and monitor missing staff in real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isRefreshing}
          className="btn-glass"
          style={{ padding: "0.6rem 1.2rem", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Sparkles size={15} className={isRefreshing ? "animate-spin" : ""} />
          <span>{isRefreshing ? "Syncing..." : "Refresh Status"}</span>
        </button>
      </div>

      {/* Main Grid: Left Personal Duty Control | Right Company Telemetry */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        
        {/* Left Column: Personal Shift Controller Card */}
        <div className="glass-panel" style={{
          padding: "1.75rem",
          background: "#FFFFFF",
          border: "1px solid var(--border-dim)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          height: "fit-content"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Power size={18} style={{ color: "#0077B6" }} />
              <span>Your Duty Status</span>
            </h3>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              padding: "0.25rem 0.75rem",
              borderRadius: "20px",
              color: dutyStatus === "ON_DUTY" ? "#10B981" : dutyStatus === "ON_BREAK" ? "#F59E0B" : "#EF4444",
              background: dutyStatus === "ON_DUTY" ? "rgba(16, 185, 129, 0.12)" : dutyStatus === "ON_BREAK" ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${dutyStatus === "ON_DUTY" ? "rgba(16, 185, 129, 0.3)" : dutyStatus === "ON_BREAK" ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.25)"}`
            }}>
              ● {dutyStatus === "ON_DUTY" ? "ON DUTY" : dutyStatus === "ON_BREAK" ? "ON BREAK" : "OFF DUTY"}
            </span>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            Clock in to start your shift telemetry. Break times and total active hours are logged into the company operational audit trail.
          </p>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
            <button
              type="button"
              onClick={() => handleToggleDuty("ON_DUTY")}
              disabled={isTogglingDuty || dutyStatus === "ON_DUTY"}
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "10px",
                border: dutyStatus === "ON_DUTY" ? "2px solid #10B981" : "1px solid var(--border-dim)",
                background: dutyStatus === "ON_DUTY" ? "linear-gradient(135deg, #10B981, #059669)" : "#F9FAFB",
                color: dutyStatus === "ON_DUTY" ? "#FFFFFF" : "var(--text-primary)",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: dutyStatus === "ON_DUTY" ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: dutyStatus === "ON_DUTY" ? "0 4px 14px rgba(16, 185, 129, 0.3)" : "none"
              }}
            >
              <Power size={18} />
              <span>{dutyStatus === "ON_DUTY" ? "Currently On Duty" : "Clock In (Sign In)"}</span>
            </button>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => handleToggleDuty("ON_BREAK")}
                disabled={isTogglingDuty || dutyStatus === "OFF_DUTY" || dutyStatus === "ON_BREAK"}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: dutyStatus === "ON_BREAK" ? "2px solid #F59E0B" : "1px solid var(--border-dim)",
                  background: dutyStatus === "ON_BREAK" ? "#F59E0B" : "#FFFFFF",
                  color: dutyStatus === "ON_BREAK" ? "#FFFFFF" : "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: dutyStatus === "OFF_DUTY" || dutyStatus === "ON_BREAK" ? "not-allowed" : "pointer",
                  opacity: dutyStatus === "OFF_DUTY" ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem"
                }}
              >
                <Coffee size={16} />
                <span>{dutyStatus === "ON_BREAK" ? "On Break" : "Take Break"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClockOutModal(true)}
                disabled={isTogglingDuty || dutyStatus === "OFF_DUTY"}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  background: dutyStatus === "OFF_DUTY" ? "#F3F4F6" : "rgba(239, 68, 68, 0.05)",
                  color: "#EF4444",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: dutyStatus === "OFF_DUTY" ? "not-allowed" : "pointer",
                  opacity: dutyStatus === "OFF_DUTY" ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem"
                }}
              >
                <UserX size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Company & Team Live Telemetry Shard (Owners & TLs) */}
        {["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"].includes(user.role) && (
          <div className="glass-panel" style={{
            padding: "1.75rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            gridColumn: "span 2"
          }}>
            {/* Telemetry Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={22} style={{ color: "#0077B6" }} />
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    Team Shift Telemetry & Not Signed In Tracker
                  </h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Total Registered Team Members: {attendanceData.totalCount}
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ position: "relative", width: "240px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.75rem 0.45rem 2rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-dim)",
                    fontSize: "0.8rem",
                    outline: "none",
                    background: "#F9FAFB"
                  }}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "0.75rem", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setAttendanceTab("NOT_SIGNED_IN")}
                style={{
                  padding: "0.55rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  borderRadius: "10px",
                  border: "none",
                  background: attendanceTab === "NOT_SIGNED_IN" ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 0, 0, 0.03)",
                  color: attendanceTab === "NOT_SIGNED_IN" ? "#EF4444" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span>🔴 NOT SIGNED IN TODAY</span>
                <span style={{ background: "#EF4444", color: "#FFF", borderRadius: "12px", padding: "0.1rem 0.5rem", fontSize: "0.7rem", fontWeight: 800 }}>
                  {attendanceData.notSignedInCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceTab("ON_DUTY")}
                style={{
                  padding: "0.55rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  borderRadius: "10px",
                  border: "none",
                  background: attendanceTab === "ON_DUTY" ? "rgba(16, 185, 129, 0.15)" : "rgba(0, 0, 0, 0.03)",
                  color: attendanceTab === "ON_DUTY" ? "#10B981" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span>🟢 ON DUTY</span>
                <span style={{ background: "#10B981", color: "#FFF", borderRadius: "12px", padding: "0.1rem 0.5rem", fontSize: "0.7rem", fontWeight: 800 }}>
                  {attendanceData.onDutyCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceTab("ON_BREAK")}
                style={{
                  padding: "0.55rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  borderRadius: "10px",
                  border: "none",
                  background: attendanceTab === "ON_BREAK" ? "rgba(245, 158, 11, 0.15)" : "rgba(0, 0, 0, 0.03)",
                  color: attendanceTab === "ON_BREAK" ? "#F59E0B" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span>🟡 ON BREAK</span>
                <span style={{ background: "#F59E0B", color: "#FFF", borderRadius: "12px", padding: "0.1rem 0.5rem", fontSize: "0.7rem", fontWeight: 800 }}>
                  {attendanceData.onBreakCount}
                </span>
              </button>
            </div>

            {/* List Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              
              {/* Tab 1: NOT SIGNED IN TODAY */}
              {attendanceTab === "NOT_SIGNED_IN" && (
                filteredNotSignedIn.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "#10B981", fontWeight: 800, fontSize: "1rem" }}>
                    🎉 Outstanding! All team members have signed in today!
                  </div>
                ) : (
                  filteredNotSignedIn.map((m: any) => (
                    <div key={m.id} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      padding: "1rem 1.25rem",
                      background: "rgba(239, 68, 68, 0.04)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "14px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.75rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                          <div style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #EF4444, #B91C1C)",
                            color: "#FFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            boxShadow: "0 4px 10px rgba(239, 68, 68, 0.25)"
                          }}>
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                              {m.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {m.email} • <span style={{ fontWeight: 700, color: "var(--gold-premium)" }}>{m.role.replace("_", " ")}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            color: "#EF4444",
                            background: "rgba(239, 68, 68, 0.12)",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "20px",
                            border: "1px solid rgba(239, 68, 68, 0.2)"
                          }}>
                            🔴 NOT SIGNED IN TODAY
                          </span>

                          <button
                            type="button"
                            onClick={() => handleSendReminder(m.name, m.email)}
                            style={{
                              padding: "0.45rem 0.85rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#FFFFFF",
                              background: "#0077B6",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              boxShadow: "0 2px 8px rgba(0, 119, 182, 0.2)"
                            }}
                          >
                            <Bell size={13} />
                            <span>Send Reminder</span>
                          </button>
                        </div>
                      </div>

                      {/* Work Telemetry Stats Row */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                        padding: "0.6rem 0.85rem",
                        background: "#FFFFFF",
                        borderRadius: "10px",
                        border: "1px solid rgba(239, 68, 68, 0.15)",
                        fontSize: "0.78rem",
                        color: "var(--text-secondary)",
                        flexWrap: "wrap"
                      }}>
                        <div>
                          <strong>Sign In Time:</strong> <span style={{ color: "#EF4444", fontWeight: 700 }}>Not Signed In</span>
                        </div>
                        <div>
                          <strong>Sign Out Time:</strong> <span style={{ color: "var(--text-muted)" }}>--</span>
                        </div>
                        <div>
                          <strong>Total Work Today:</strong> <span style={{ color: "#EF4444", fontWeight: 700 }}>0 mins</span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* Tab 2: ON DUTY */}
              {attendanceTab === "ON_DUTY" && (
                filteredOnDuty.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    No team members currently on duty.
                  </div>
                ) : (
                  filteredOnDuty.map((m: any) => (
                    <div key={m.id} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      padding: "1rem 1.25rem",
                      background: "rgba(16, 185, 129, 0.04)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "14px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.75rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                          <div style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #10B981, #047857)",
                            color: "#FFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.95rem"
                          }}>
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                              {m.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {m.email} • <span style={{ fontWeight: 700, color: "var(--gold-premium)" }}>{m.role.replace("_", " ")}</span>
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          color: "#10B981",
                          background: "rgba(16, 185, 129, 0.12)",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "20px",
                          border: "1px solid rgba(16, 185, 129, 0.2)"
                        }}>
                          🟢 ON DUTY NOW
                        </span>
                      </div>

                      {/* Work Telemetry Stats Row */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                        padding: "0.6rem 0.85rem",
                        background: "#FFFFFF",
                        borderRadius: "10px",
                        border: "1px solid rgba(16, 185, 129, 0.15)",
                        fontSize: "0.78rem",
                        color: "var(--text-secondary)",
                        flexWrap: "wrap"
                      }}>
                        <div>
                          <strong>Sign In Time:</strong> <span style={{ color: "#10B981", fontWeight: 700 }}>{m.clockInTime ? new Date(m.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--"}</span>
                        </div>
                        <div>
                          <strong>Sign Out Time:</strong> <span style={{ color: "#10B981", fontWeight: 700 }}>Active Shift (Working)</span>
                        </div>
                        <div>
                          <strong>Total Work Today:</strong> <span style={{ color: "#10B981", fontWeight: 800 }}>{Math.floor((m.totalMinutes || 0) / 60)}h {(m.totalMinutes || 0) % 60}m</span>
                        </div>
                      </div>

                      {m.notes && (
                        <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-secondary)", background: "#F9FAFB", padding: "0.4rem 0.75rem", borderRadius: "6px", borderLeft: "3px solid #10B981" }}>
                          &quot;{m.notes}&quot;
                        </div>
                      )}
                    </div>
                  ))
                )
              )}

              {/* Tab 3: ON BREAK */}
              {attendanceTab === "ON_BREAK" && (
                filteredOnBreak.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    No team members currently on break.
                  </div>
                ) : (
                  filteredOnBreak.map((m: any) => (
                    <div key={m.id} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      padding: "1rem 1.25rem",
                      background: "rgba(245, 158, 11, 0.04)",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      borderRadius: "14px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.75rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                          <div style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #F59E0B, #B45309)",
                            color: "#FFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.95rem"
                          }}>
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                              {m.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {m.email} • <span style={{ fontWeight: 700, color: "var(--gold-premium)" }}>{m.role.replace("_", " ")}</span>
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          color: "#F59E0B",
                          background: "rgba(245, 158, 11, 0.12)",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "20px",
                          border: "1px solid rgba(245, 158, 11, 0.2)"
                        }}>
                          🟡 ON BREAK NOW
                        </span>
                      </div>

                      {/* Work Telemetry Stats Row */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                        padding: "0.6rem 0.85rem",
                        background: "#FFFFFF",
                        borderRadius: "10px",
                        border: "1px solid rgba(245, 158, 11, 0.15)",
                        fontSize: "0.78rem",
                        color: "var(--text-secondary)",
                        flexWrap: "wrap"
                      }}>
                        <div>
                          <strong>Sign In Time:</strong> <span style={{ color: "#F59E0B", fontWeight: 700 }}>{m.clockInTime ? new Date(m.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--"}</span>
                        </div>
                        <div>
                          <strong>Break Started:</strong> <span style={{ color: "#F59E0B", fontWeight: 700 }}>{m.breakStartTime ? new Date(m.breakStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "On Break"}</span>
                        </div>
                        <div>
                          <strong>Total Work Today:</strong> <span style={{ color: "#F59E0B", fontWeight: 800 }}>{Math.floor((m.totalMinutes || 0) / 60)}h {(m.totalMinutes || 0) % 60}m</span>
                        </div>
                      </div>

                      {m.notes && (
                        <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-secondary)", background: "#F9FAFB", padding: "0.4rem 0.75rem", borderRadius: "6px", borderLeft: "3px solid #F59E0B" }}>
                          &quot;{m.notes}&quot;
                        </div>
                      )}
                    </div>
                  ))
                )
              )}

            </div>
          </div>
        )}

      </div>

      {/* Clock Out Work Summary Modal */}
      {showClockOutModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3, 4, 94, 0.45)",
          backdropFilter: "blur(8px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            maxWidth: "460px",
            width: "100%",
            padding: "1.75rem",
            background: "#FFFFFF",
            border: "1px solid var(--border-dim)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            boxShadow: "0 20px 40px rgba(0, 119, 182, 0.15)",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <UserX size={20} style={{ color: "#EF4444" }} />
                <span>Sign Out of Shift</span>
              </h3>
              <button 
                onClick={() => setShowClockOutModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              You are about to sign out of your active shift. Optionally enter a brief daily work summary note for your Team Lead or Company Owner.
            </p>

            <textarea
              rows={3}
              value={shiftNotesInput}
              onChange={(e) => setShiftNotesInput(e.target.value)}
              placeholder="e.g. Completed 14 account verifications, 5 ads published..."
              style={{
                width: "100%",
                padding: "0.7rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--border-dim)",
                fontSize: "0.85rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
                background: "#F9FAFB",
                boxSizing: "border-box"
              }}
            />

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-glass"
                onClick={() => setShowClockOutModal(false)}
                style={{ padding: "0.55rem 1.1rem", fontSize: "0.82rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleDuty("OFF_DUTY", shiftNotesInput)}
                disabled={isTogglingDuty}
                style={{
                  padding: "0.55rem 1.35rem",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  background: "#EF4444",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)"
                }}
              >
                {isTogglingDuty ? "Signing Out..." : "Confirm Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
