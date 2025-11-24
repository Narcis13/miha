# Deploy producție pentru „miha" (Bun + Hono + React/Vite)

## Precondiții
- Server Ubuntu/Linux
- `git`, `curl` instalate
- Bun instalat global
- (Opțional) PM2 sau systemd pentru proces persistent

## Instalare Bun
```bash
curl -fsSL https://bun.sh/install | bash

# Reîncarcă shell-ul sau adaugă manual exportul PATH:
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verifică instalarea
bun --version
```

## Instalare PM2 (opțional, recomandat)
```bash
# Instalare globală
npm install -g pm2

# Sau cu bun
bun install -g pm2

# Verifică instalarea
pm2 --version
```

## Pregătire cod

### Primul deployment
```bash
# Clonează repository-ul
cd /var/www
git clone git@github.com:Narcis13/miha.git
cd miha

# Instalează dependințele monorepo (rulează automat postinstall pentru shared/server)
bun install

# Build client (React + Vite)
bun run build:client
```

## Pornire server în producție

### Opțiunea 1: PM2 (Recomandat)

PM2 este un process manager profesional care oferă:
- Restart automat la crash
- Log management
- Monitoring
- Pornire la boot (startup script)
- Zero-downtime reload

#### Configurare inițială PM2

**Pas 1: Creează fișier de configurare PM2**
```bash
cd /var/www/miha

# Creează ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'miha',
    script: 'bun',
    args: 'run server/src/index.ts',
    cwd: '/var/www/miha',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/www/miha/logs/pm2-error.log',
    out_file: '/var/www/miha/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}
EOF

# Creează director pentru loguri
mkdir -p /var/www/miha/logs
```

**Pas 2: Pornește aplicația cu PM2**
```bash
# Pornește serverul
pm2 start ecosystem.config.js

# Verifică status
pm2 status

# Vezi loguri live
pm2 logs miha

# Vezi loguri cu filtru
pm2 logs miha --lines 100
```

**Pas 3: Configurare pornire automată la boot**
```bash
# Salvează configurația curentă PM2
pm2 save

# Generează și instalează script de startup
pm2 startup

# Urmează instrucțiunile afișate (probabil va afișa o comandă cu sudo pe care trebuie să o execuți)
# De exemplu:
# sudo env PATH=$PATH:/home/sysadm/.bun/bin pm2 startup systemd -u sysadm --hp /home/sysadm
```

#### Comenzi utile PM2

```bash
# Status aplicații
pm2 status
pm2 list

# Loguri
pm2 logs miha              # Live logs
pm2 logs miha --lines 200  # Ultimele 200 linii
pm2 logs miha --err        # Doar erori

# Restart
pm2 restart miha           # Restart normal
pm2 reload miha            # Zero-downtime reload

# Stop/Start
pm2 stop miha
pm2 start miha

# Monitoring
pm2 monit                  # Dashboard interactiv
pm2 show miha              # Detalii despre proces

# Management
pm2 delete miha            # Șterge procesul din PM2
pm2 flush                  # Curăță toate logurile
pm2 reset miha             # Resetează contoare restart

# Actualizare PM2
pm2 update
```

### Opțiunea 2: Systemd (Alternativă la PM2)

Pentru medii enterprise sau când PM2 nu este disponibil:

```bash
# Creează serviciu systemd
sudo tee /etc/systemd/system/miha.service > /dev/null <<'EOF'
[Unit]
Description=Miha Bun/Hono server
After=network.target

[Service]
Type=simple
User=sysadm
Group=sysadm
WorkingDirectory=/var/www/miha
ExecStart=/home/sysadm/.bun/bin/bun run server/src/index.ts
Restart=always
RestartSec=3
StandardOutput=append:/var/www/miha/logs/miha.log
StandardError=append:/var/www/miha/logs/miha-error.log

# Environment
Environment=NODE_ENV=production
Environment=PATH=/home/sysadm/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
EOF

# Creează director pentru loguri
mkdir -p /var/www/miha/logs

# Activează și pornește serviciul
sudo systemctl daemon-reload
sudo systemctl enable miha
sudo systemctl start miha

# Verifică status
sudo systemctl status miha

# Vezi loguri
sudo journalctl -u miha -f
sudo journalctl -u miha -n 100 --no-pager
```

#### Comenzi utile Systemd

```bash
# Management
sudo systemctl start miha
sudo systemctl stop miha
sudo systemctl restart miha
sudo systemctl status miha

# Loguri
sudo journalctl -u miha -f           # Live logs
sudo journalctl -u miha -n 100       # Ultimele 100 linii
sudo journalctl -u miha --since today
sudo journalctl -u miha --since "1 hour ago"

# Dezactivează serviciu
sudo systemctl disable miha
```

### Opțiunea 3: Screen/Tmux (Development/Testing)

Pentru medii de development sau teste rapide:

#### Cu Screen
```bash
# Instalează screen dacă nu există
sudo apt install screen

# Pornește server în screen session
cd /var/www/miha
screen -S miha -dm bun run server/src/index.ts

# Reconectează la session
screen -r miha

# Detașează din session: Ctrl+A apoi D

# Listează sessions
screen -ls

# Omoară session
screen -X -S miha quit
```

#### Cu Tmux
```bash
# Instalează tmux dacă nu există
sudo apt install tmux

# Pornește server în tmux session
cd /var/www/miha
tmux new-session -d -s miha 'bun run server/src/index.ts'

# Reconectează la session
tmux attach -t miha

# Detașează din session: Ctrl+B apoi D

# Listează sessions
tmux ls

# Omoară session
tmux kill-session -t miha
```

## Actualizări cod (Update/Redeploy)

### Cu PM2
```bash
cd /var/www/miha

# 1. Pull ultimele modificări
git pull

# 2. Instalează dependințe noi (dacă există)
bun install

# 3. Rebuild client
bun run build:client

# 4. Restart server (zero-downtime)
pm2 reload miha

# SAU restart complet
pm2 restart miha
```

### Cu Systemd
```bash
cd /var/www/miha

# 1. Pull ultimele modificări
git pull

# 2. Instalează dependințe noi
bun install

# 3. Rebuild client
bun run build:client

# 4. Restart serviciu
sudo systemctl restart miha
```

## Backup bază de date

```bash
# Backup manual
cd /var/www/miha/server
cp beneficiaries.sqlite beneficiaries.sqlite.backup-$(date +%Y%m%d-%H%M%S)

# Sau cu compresie
tar -czf beneficiaries-backup-$(date +%Y%m%d-%H%M%S).tar.gz beneficiaries.sqlite

# Backup automat cu cron (rulează zilnic la 2 AM)
crontab -e
# Adaugă:
# 0 2 * * * cd /var/www/miha/server && cp beneficiaries.sqlite beneficiaries.sqlite.backup-$(date +\%Y\%m\%d) && find . -name "beneficiaries.sqlite.backup-*" -mtime +30 -delete
```

## Import date beneficiari

```bash
cd /var/www/miha

# Import din CSV
bun run import:beneficiaries ./path/to/pensionari.csv

# Verifică importul
bun -e "import db from 'bun:sqlite'; const d = new db('/var/www/miha/server/beneficiaries.sqlite'); console.log('Total beneficiari:', d.query('SELECT COUNT(*) as c FROM beneficiaries').get());"
```

## Structură runtime

- **API**: Expus de Hono pe port `3765`
  - `/beneficiaries` - CRUD beneficiari
  - `/payment-packages` - CRUD pachete plăți
  - `/payments` - CRUD plăți individuale
  - `/settings` - Setări instituție
  - `/assets/*` - Asset-uri statice (JS, CSS)
  - `/*` - Fallback pentru SPA (index.html)

- **Client SPA**: Servit de Hono din `client/dist/`
- **Baza de date**: `server/beneficiaries.sqlite` (SQLite)
- **Loguri**:
  - PM2: `/var/www/miha/logs/pm2-*.log`
  - Systemd: `journalctl -u miha`

## Firewall

```bash
# Permite accesul la port 3765
sudo ufw allow 3765/tcp
sudo ufw status
```

## Monitoring și verificare

### Verificare server rulează
```bash
# Verifică proces
ps aux | grep "bun.*server"

# Verifică port
netstat -tlnp | grep 3765
# SAU
ss -tlnp | grep 3765

# Test HTTP
curl http://localhost:3765/beneficiaries
curl http://109.99.176.211:3765/beneficiaries
```

### Verificare bază de date
```bash
# Număr beneficiari
bun -e "import db from 'bun:sqlite'; const d = new db('/var/www/miha/server/beneficiaries.sqlite'); console.log(d.query('SELECT COUNT(*) as c FROM beneficiaries').get());"

# Ultimii beneficiari adăugați
bun -e "import db from 'bun:sqlite'; const d = new db('/var/www/miha/server/beneficiaries.sqlite'); console.log(d.query('SELECT name, cnp FROM beneficiaries ORDER BY created_at DESC LIMIT 5').all());"
```

### Monitoring PM2
```bash
# Dashboard interactiv
pm2 monit

# Status detaliat
pm2 show miha

# Informații sistem
pm2 info miha
```

## Troubleshooting

### Portul este deja folosit
```bash
# Vezi ce proces folosește portul 3765
sudo lsof -i :3765
# SAU
sudo netstat -tlnp | grep 3765

# Omoară procesul
sudo kill -9 <PID>

# Cu PM2
pm2 delete miha
pm2 start ecosystem.config.js
```

### Aplicația nu pornește
```bash
# Verifică loguri PM2
pm2 logs miha --err --lines 50

# Verifică loguri systemd
sudo journalctl -u miha -n 50 --no-pager

# Test manual
cd /var/www/miha
bun run server/src/index.ts
```

### Erori la build client
```bash
# Curăță și rebuildeză
cd /var/www/miha
rm -rf node_modules
rm -rf client/dist
bun install
bun run build:client
```

### Baza de date lipsă sau coruptă
```bash
# Verifică există
ls -lh /var/www/miha/server/beneficiaries.sqlite

# Restaurează din backup
cd /var/www/miha/server
cp beneficiaries.sqlite.backup-YYYYMMDD beneficiaries.sqlite

# Sau reimportă date
bun run import:beneficiaries ./pensionari.csv
```

### PM2 nu salvează configurația
```bash
# Resalvează
pm2 save --force

# Regenerează startup script
pm2 unstartup
pm2 startup
# Rulează comanda afișată
pm2 save
```

## Schimbare port

Pentru a schimba portul de la 3765 la altceva:

1. Editează `server/src/index.ts`:
```typescript
// La final, schimbă:
export default { fetch: app.fetch, port: 8080 }  // noul port
```

2. Rebuildeză și restart:
```bash
cd /var/www/miha
pm2 restart miha
# SAU
sudo systemctl restart miha
```

3. Actualizează firewall:
```bash
sudo ufw allow 8080/tcp
sudo ufw delete allow 3765/tcp
```

## Performanță și optimizare

### Limită fișiere deschise (pentru trafic mare)
```bash
# Verifică limita curentă
ulimit -n

# Mărește temporar
ulimit -n 65536

# Permanent (editează /etc/security/limits.conf)
sudo tee -a /etc/security/limits.conf << EOF
sysadm soft nofile 65536
sysadm hard nofile 65536
EOF
```

### Monitorizare resurse
```bash
# CPU și memorie
pm2 monit

# Disk space
df -h /var/www/miha

# Database size
ls -lh /var/www/miha/server/beneficiaries.sqlite
```

## Securitate

### Recomandări producție

1. **Reverse proxy** (Nginx/Caddy) în fața aplicației
2. **SSL/TLS** pentru HTTPS
3. **Firewall** restrict access la port
4. **Backup** regulat bază de date
5. **Log rotation** pentru a preveni umplerea disk-ului
6. **User non-root** pentru rulare proces (deja configurat: `sysadm`)

### Exemplu configurare Nginx
```nginx
server {
    listen 80;
    server_name miha.example.com;

    location / {
        proxy_pass http://localhost:3765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Notă

Serverul folosește **căi absolute** pentru baza de date și fișierele client, astfel încât poate fi pornit din orice director de lucru. Toate căile sunt rezolvate relativ la locația fișierului sursă (`import.meta.dir`).
