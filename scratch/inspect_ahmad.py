import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('51.38.71.134', username='root', password='kLsQAj9ESYPa', timeout=10)

stdin, stdout, stderr = client.exec_command('''cd /var/www/staffops && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  console.log('USERS:', JSON.stringify(users, null, 2));

  const snaps = await prisma.screensnapshot.findMany({ take: 5, orderBy: { capturedAt: 'desc' } });
  console.log('SAMPLE SNAPS:', JSON.stringify(snaps, null, 2));
}
run().then(() => prisma.\$disconnect());
"''')
print("STDOUT:\n", stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:\n", stderr.read().decode('utf-8', errors='ignore'))

client.close()
