import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('51.38.71.134', username='root', password='kLsQAj9ESYPa', timeout=10)

stdin, stdout, stderr = client.exec_command('''cd /var/www/staffops && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const userId = '9880c171-1696-4593-85b5-640a6c2f061b';
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  console.log('sevenDaysAgo:', sevenDaysAgo.toISOString());

  const snaps = await prisma.screensnapshot.findMany({
    where: {
      userId,
      capturedAt: { gte: sevenDaysAgo }
    }
  });
  console.log('SNAPS COUNT WITH GTE 7 DAYS:', snaps.length);
}
test();
"''')
print("STDOUT:\n", stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:\n", stderr.read().decode('utf-8', errors='ignore'))

client.close()
