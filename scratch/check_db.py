import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('51.38.71.134', username='root', password='kLsQAj9ESYPa', timeout=10)

stdin, stdout, stderr = client.exec_command('PGPASSWORD=postgres psql -U postgres -d staffops -c "SELECT id, \\"userId\\", \\"capturedAt\\" FROM screensnapshot ORDER BY \\"capturedAt\\" DESC LIMIT 10;"')
print("STDOUT:\n", stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:\n", stderr.read().decode('utf-8', errors='ignore'))

client.close()
