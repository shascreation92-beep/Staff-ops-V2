import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('51.38.71.134', username='root', password='kLsQAj9ESYPa', timeout=10)

s = """const { getUsersMonitoringStatusAction, getCompanyScreenshotsAction } = require('/var/www/staffops/.next/server/app/actions/telemetry.js');
async function test() {
  console.log('Testing server actions...');
}
test();
"""

# Let's write a standalone script calling prisma logic directly matching telemetry.ts
s2 = """const { PrismaClient } = require('/var/www/staffops/node_modules/@prisma/client');
const db = new PrismaClient();

async function testStatus() {
  const fiveMinutesAgo = new Date(Date.now() - 300 * 1000);
  console.log('Server Date Now:', new Date().toISOString());
  console.log('Five Mins Ago:', fiveMinutesAgo.toISOString());

  const users = await db.user.findMany({
    where: { isArchived: false, status: "APPROVED" },
    select: { id: true, dutyStatus: true, name: true, email: true }
  });

  const latestSnapshots = await db.screensnapshot.findMany({
    where: { capturedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    orderBy: { capturedAt: "desc" },
    take: 500
  });

  console.log('Total Users:', users.length);
  console.log('Total Snapshots (24h):', latestSnapshots.length);

  for (const u of users) {
    const snap = latestSnapshots.find(s => s.userId === u.id);
    if (!snap) {
      console.log('User:', u.email, '-> NO SNAPSHOT FOUND!');
      continue;
    }
    const capturedDate = new Date(snap.capturedAt);
    const isRecent = capturedDate >= fiveMinutesAgo;
    console.log('User:', u.email, '| Last Snap:', capturedDate.toISOString(), '| isRecent (<=5m):', isRecent, '| Duty:', u.dutyStatus);
  }
  await db.$disconnect();
}
testStatus().catch(console.error);
"""

sftp = client.open_sftp()
with sftp.open('/var/www/staffops/check_script.js', 'w') as f:
    f.write(s2)
sftp.close()

stdin, stdout, stderr = client.exec_command("cd /var/www/staffops && node check_script.js")

out = stdout.read().decode('utf-8')
err = stderr.read().decode('utf-8')

print("OUT:\n", out)
print("ERR:\n", err)
client.close()
