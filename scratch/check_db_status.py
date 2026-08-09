import paramiko, sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('51.38.71.134', username='root', password='kLsQAj9ESYPa', timeout=10)

s = """const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, dutyStatus: true } });
  console.log('USERS:', JSON.stringify(users, null, 2));
  const snaps = await prisma.screensnapshot.findMany({ orderBy: { capturedAt: 'desc' }, take: 10 });
  console.log('SNAPS:', JSON.stringify(snaps, null, 2));
}
run();
"""

cmd = "cd /var/www/staffops && node -e " + repr(s)
stdin, stdout, stderr = client.exec_command(cmd)

print("STDOUT:\n", stdout.read().decode('utf-8'))
print("STDERR:\n", stderr.read().decode('utf-8'))
client.close()
