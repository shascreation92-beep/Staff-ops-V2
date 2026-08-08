import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('51.38.71.134', username='root', password='kLsQAj9ESYPa', timeout=10)

script = '''cd /var/www/staffops && node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const prisma = new PrismaClient();
async function testZip() {
  const userId = '9880c171-1696-4593-85b5-640a6c2f061b';
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const snapshots = await prisma.screensnapshot.findMany({
    where: { userId, capturedAt: { gte: sevenDaysAgo } }
  });

  console.log('DB SNAPSHOTS FOUND:', snapshots.length);

  const zip = new JSZip();
  const imgFolder = zip.folder('Ahmad_Backup');

  let addedCount = 0;
  for (const snap of snapshots) {
    if (snap.imageUrl) {
      const relativeUrl = snap.imageUrl.startsWith('/') ? snap.imageUrl.slice(1) : snap.imageUrl;
      const filePath = path.join(process.cwd(), 'public', relativeUrl);
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath);
        imgFolder.file(snap.id + '.webp', fileData);
        addedCount++;
      }
    }
  }

  console.log('SUCCESSFULLY ADDED FILES TO ZIP:', addedCount);
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });
  console.log('GENERATED ZIP BUFFER SIZE:', zipBuf.length, 'bytes');
}
testZip();
"'''

stdin, stdout, stderr = client.exec_command(script)
print("STDOUT:\n", stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:\n", stderr.read().decode('utf-8', errors='ignore'))

client.close()
