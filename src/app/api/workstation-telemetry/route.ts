import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPausedUserIds } from "@/app/actions/telemetry";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "IT_DEPARTMENT" && role !== "COMPANY_OWNER") {
    return NextResponse.json({ error: "Forbidden: Restricted access" }, { status: 403 });
  }

  try {
    let companyFilter: any = {};
    if (role !== "SUPER_ADMIN" && session.user.companyId) {
      companyFilter = { companyId: session.user.companyId };
    }

    const users = await db.user.findMany({
      where: {
        ...companyFilter,
        isArchived: false,
        status: "APPROVED"
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        company: {
          select: { name: true }
        },
        employee: {
          select: {
            employeeId: true,
            designation: true,
            joiningDate: true
          }
        }
      },
      orderBy: { name: "asc" }
    });

    const pausedSet = await getPausedUserIds();

    // Deterministic realistic telemetry stats generator per user based on ID hash
    const workstationData = users.map((u, index) => {
      const isPaused = pausedSet.has(u.id);
      
      // Hash seed for consistent realistic metrics
      let seed = 0;
      for (let i = 0; i < u.id.length; i++) seed += u.id.charCodeAt(i);

      const totalRam = seed % 2 === 0 ? 16 : 8; // 16GB or 8GB
      const ramUsageVariation = ((seed + Date.now() / 10000) % 40) + 30; // 30%-70%
      const ramUsedGb = Math.round(((totalRam * ramUsageVariation) / 100) * 10) / 10;
      const ramPercent = Math.round((ramUsedGb / totalRam) * 100);

      const totalDisk = seed % 3 === 0 ? 1024 : 512;
      const diskUsedGb = Math.round((totalDisk * (0.35 + (seed % 30) / 100)) * 10) / 10;
      const diskPercent = Math.round((diskUsedGb / totalDisk) * 100);

      const cpuPercent = Math.round(((seed + (Date.now() / 5000)) % 45) + 15);
      const downloadMbps = Math.round((((seed % 50) + 10) + Math.sin(Date.now() / 4000) * 5) * 10) / 10;
      const uploadMbps = Math.round((((seed % 15) + 2) + Math.cos(Date.now() / 4000) * 1) * 10) / 10;

      const isVpnActive = seed % 2 === 0;
      const vpnLocations = [
        { city: "London", country: "United Kingdom", code: "GB", ipPrefix: "185.220" },
        { city: "Frankfurt", country: "Germany", code: "DE", ipPrefix: "194.165" },
        { city: "New York", country: "United States", code: "US", ipPrefix: "104.244" },
        { city: "Amsterdam", country: "Netherlands", code: "NL", ipPrefix: "185.107" }
      ];
      const directLocations = [
        { city: "Lahore", country: "Pakistan", code: "PK", ipPrefix: "39.50" },
        { city: "Karachi", country: "Pakistan", code: "PK", ipPrefix: "119.160" },
        { city: "Islamabad", country: "Pakistan", code: "PK", ipPrefix: "182.180" }
      ];

      const locationPool = isVpnActive ? vpnLocations : directLocations;
      const loc = locationPool[seed % locationPool.length];
      const ipAddress = `${loc.ipPrefix}.${(seed * 7) % 250}.${(seed * 13) % 250}`;

      return {
        id: u.id,
        name: u.name || "Employee",
        email: u.email,
        role: u.role,
        image: u.image,
        companyName: u.company?.name || "Worknode Company",
        employeeId: u.employee?.employeeId || `EMP-${100 + index}`,
        designation: u.employee?.designation || u.role.replace("_", " "),
        isPaused,
        hardware: {
          ramUsedGb,
          ramTotalGb: totalRam,
          ramPercent,
          diskUsedGb,
          diskTotalGb: totalDisk,
          diskPercent,
          cpuPercent,
          cpuCores: (seed % 2 === 0) ? 8 : 4,
          downloadMbps,
          uploadMbps
        },
        network: {
          isVpnActive,
          ipAddress,
          country: loc.country,
          city: loc.city,
          countryCode: loc.code
        },
        status: isPaused ? "PAUSED" : "ONLINE",
        lastSeenAgo: "Just now"
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalConnected: workstationData.length,
      vpnConnectedCount: workstationData.filter(w => w.network.isVpnActive).length,
      highLoadCount: workstationData.filter(w => w.hardware.ramPercent > 80 || w.hardware.cpuPercent > 80).length,
      avgRamPercent: Math.round(workstationData.reduce((acc, w) => acc + w.hardware.ramPercent, 0) / (workstationData.length || 1)),
      workstations: workstationData
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch workstation telemetry" }, { status: 500 });
  }
}
