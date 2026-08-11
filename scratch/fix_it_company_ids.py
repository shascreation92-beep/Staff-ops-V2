import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('51.38.71.134', username='root', password='kLsQAj9ESYPa', timeout=15)

node_code = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const primaryCompanyId = "5423cc4a-b1a7-4607-8738-fc1ec133f4ed";

  const updated = await prisma.user.updateMany({
    where: { role: "IT_DEPARTMENT" },
    data: { companyId: primaryCompanyId }
  });
  console.log("Updated IT users count:", updated.count);

  const updatedEmp = await prisma.employee.updateMany({
    where: { user: { role: "IT_DEPARTMENT" } },
    data: { companyId: primaryCompanyId }
  });
  console.log("Updated IT employees count:", updatedEmp.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
"""

import base64
b64_code = base64.b64encode(node_code.encode('utf-8')).decode('utf-8')

cmd = f'cd /var/www/staffops && node -e "eval(Buffer.from(\'{b64_code}\', \'base64\').toString(\'utf-8\'))"'
stdin, stdout, stderr = client.exec_command(cmd)
print('STDOUT:', stdout.read().decode('utf-8', errors='ignore'))
print('STDERR:', stderr.read().decode('utf-8', errors='ignore'))
client.close()
