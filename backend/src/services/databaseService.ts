// backend/src/services/databaseService.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from '../lib/prisma'
import fs from 'fs/promises'

const execAsync = promisify(exec)

function generateSafePassword(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function provisionDatabase(
  projectId: string,
  projectName: string,
  dbType: 'mysql' | 'postgresql' = 'mysql'
): Promise<DatabaseCredentials> {
  
  const existing = await prisma.database.findUnique({ where: { projectId } })
  if (existing) {
    return {
      host: existing.host,
      port: existing.port,
      name: existing.name,
      user: existing.user,
      password: existing.password,
      type: existing.type
    }
  }
  
  // 🔥 Fix: Nama database & user pendek (max 32 char)
  const shortName = projectName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().substring(0, 20)
  const dbName = shortName
  const dbUser = shortName.substring(0, 16) + '_usr'  // Max 20 char
  const dbPassword = generateSafePassword(16)
  
  try {
    if (dbType === 'mysql') {
      // 🔥 Tunggu MySQL siap dengan retry
      let ready = false
      for (let i = 0; i < 30; i++) {
        try {
          await execAsync(`docker exec db-${projectId} mysqladmin ping -h 127.0.0.1 -uroot --password=\${MYSQL_ROOT_PASSWORD} --silent 2>/dev/null || docker exec db-${projectId} mysqladmin ping -h 127.0.0.1 -uroot --silent`)
          ready = true
          break
        } catch {
          await new Promise(r => setTimeout(r, 2000))
        }
      }
      
      if (!ready) throw new Error('MySQL not ready')
      
      // 🔥 Coba berbagai cara koneksi MySQL
      const sql = `CREATE DATABASE IF NOT EXISTS \`${dbName}\`;
CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';
GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';
FLUSH PRIVILEGES;`
      
      const tmpFile = `/tmp/db-init-${projectId}.sql`
      await fs.writeFile(tmpFile, sql)
      await execAsync(`docker cp ${tmpFile} db-${projectId}:/tmp/init.sql`)
      
      // 🔥 Coba 3 cara koneksi
      let success = false
      const passwords = ['rootpassword', '', 'password']
      
      for (const pass of passwords) {
        try {
          const cmd = pass 
            ? `docker exec db-${projectId} mysql -uroot -p${pass} -e "source /tmp/init.sql"`
            : `docker exec db-${projectId} mysql -uroot -e "source /tmp/init.sql"`
          await execAsync(cmd)
          success = true
          break
        } catch {}
      }
      
      if (!success) {
        // 🔥 Terakhir: coba tanpa password (socket)
        try {
          await execAsync(`docker exec db-${projectId} mysql -e "source /tmp/init.sql"`)
        } catch (e: any) {
          throw new Error(`MySQL connection failed: ${e.message}`)
        }
      }
      
    } else if (dbType === 'postgresql') {
      await execAsync(`docker exec db-${projectId} psql -U postgres -c "CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'; CREATE DATABASE ${dbName} OWNER ${dbUser};"`)
    }
    
    // Simpan ke database
    const db = await prisma.database.create({
      data: {
        projectId,
        type: dbType,
        host: dbType === 'mysql' ? 'mysql' : 'postgres',
        port: dbType === 'mysql' ? 3306 : 5432,
        name: dbName,
        user: dbUser,
        password: dbPassword,
        status: 'active'
      }
    })
    
    // 🔥 Auto-update config files in container
    try {
      const appContainer = `app-${projectId}`
      const files = ['koneksi.php', 'config.php', 'db.php', '.env']
      for (const file of files) {
        try {
          await execAsync(`docker exec ${appContainer} sh -c "
            sed -i 's/DB_HOST=.*/DB_HOST=mysql/' /var/www/html/${file} 2>/dev/null
            sed -i 's/DB_DATABASE=.*/DB_DATABASE=${dbName}/' /var/www/html/${file} 2>/dev/null
            sed -i 's/DB_USERNAME=.*/DB_USERNAME=${dbUser}/' /var/www/html/${file} 2>/dev/null
            sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=${dbPassword}/' /var/www/html/${file} 2>/dev/null
          "`)
        } catch {}
      }
    } catch {}
    
    return {
      host: db.host,
      port: db.port,
      name: db.name,
      user: db.user,
      password: db.password,
      type: db.type
    }
    
  } catch (error: any) {
    console.error('Database provisioning failed:', error)
    throw new Error(`Database provisioning failed: ${error.message}`)
  }
}

export interface DatabaseCredentials {
  host: string
  port: number
  name: string
  user: string
  password: string
  type: string
}

export async function getDatabaseCredentials(projectId: string): Promise<DatabaseCredentials | null> {
  const db = await prisma.database.findUnique({ where: { projectId } })
  if (!db) return null
  return {
    host: db.host,
    port: db.port,
    name: db.name,
    user: db.user,
    password: db.password,
    type: db.type
  }
}

export async function importDatabase(
  projectId: string,
  sqlFilePath: string,
  dbType: 'mysql' | 'postgresql' = 'mysql'
): Promise<string> {
  const containerName = `db-${projectId}`
  try {
    await execAsync(`docker cp ${sqlFilePath} ${containerName}:/tmp/import.sql`)
    if (dbType === 'mysql') {
      await execAsync(`docker exec ${containerName} mysql -uroot -prootpassword -e "source /tmp/import.sql"`)
    } else {
      await execAsync(`docker exec ${containerName} psql -U postgres -f /tmp/import.sql`)
    }
    return 'Database imported successfully'
  } catch (error: any) {
    throw new Error(`Database import failed: ${error.message}`)
  }
}