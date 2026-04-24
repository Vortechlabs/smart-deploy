import fs from 'fs/promises'

const MAPPING_FILE = '/etc/nginx/conf.d/app-mapping.conf'

export async function updateSubdomainMapping(subdomain: string, port: number) {
    console.log(`📝 Adding mapping: ${subdomain}.41.216.191.42 -> port ${port}`)
    
    // Baca mapping yang ada
    let content = ''
    try {
        content = await fs.readFile(MAPPING_FILE, 'utf-8')
    } catch {
        content = '# Dynamic app mapping - Updated by backend\n\n'
    }
    
    // Hapus baris dengan subdomain yang sama jika ada
    const lines = content.split('\n')
    const newLines = []
    let skipNext = false
    
    for (const line of lines) {
        if (line.includes(`set $app_port_${subdomain}`)) {
            skipNext = true
            continue
        }
        if (skipNext && line.includes(';')) {
            skipNext = false
            continue
        }
        if (!skipNext && !line.includes(`$app_port_${subdomain}`)) {
            newLines.push(line)
        }
    }
    
    // Tambahkan mapping baru
    newLines.push(`set $app_port_${subdomain} ${port};`)
    newLines.push(`if ($subdomain = "${subdomain}") { set $app_port $app_port_${subdomain}; }`)
    newLines.push('')
    
    await fs.writeFile(MAPPING_FILE, newLines.join('\n'))
    
    // Reload Nginx
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    try {
        await execAsync('sudo nginx -t')
        await execAsync('sudo systemctl reload nginx')
        console.log(`✅ Nginx reloaded - ${subdomain}.41.216.191.42 is now LIVE!`)
    } catch (error: any) {
        console.error(`⚠️ Nginx reload failed: ${error.message}`)
    }
}

export async function removeSubdomainMapping(subdomain: string) {
    console.log(`🗑️ Removing mapping for ${subdomain}.41.216.191.42`)
    
    try {
        let content = await fs.readFile(MAPPING_FILE, 'utf-8')
        
        // Hapus mapping yang terkait dengan subdomain
        const lines = content.split('\n')
        const newLines = []
        let skip = false
        
        for (const line of lines) {
            if (line.includes(`$app_port_${subdomain}`) || 
                line.includes(`$subdomain = "${subdomain}"`)) {
                skip = true
                continue
            }
            if (skip && line.includes(';')) {
                skip = false
                continue
            }
            if (!skip) {
                newLines.push(line)
            }
        }
        
        await fs.writeFile(MAPPING_FILE, newLines.join('\n'))
        
        // Reload Nginx
        const { exec } = require('child_process')
        const { promisify } = require('util')
        const execAsync = promisify(exec)
        
        await execAsync('sudo systemctl reload nginx')
        console.log(`✅ Mapping removed for ${subdomain}.41.216.191.42`)
    } catch (error) {
        console.log(`⚠️ Failed to remove mapping:`, error)
    }
}
