# Deploy producție pentru „miha” (Bun + Hono + React/Vite)

## Precondiții
- Server Ubuntu (root).
- `git`, `curl`, `ufw` (opțional) instalate.
- Bun instalat global.

## Instalare Bun
```bash
curl -fsSL https://bun.sh/install | bash
# Reîncarcă shell-ul sau adaugă manual exportul PATH, de ex.:
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

## Pregătire cod
```bash
cd /var/www
git clone git@github.com:Narcis13/miha.git
cd miha

# Instalează dependințele monorepo (rulează postinstall pentru shared/server)
bun install

# Build client (React + Vite)
bun run build:client
```

După build, artefactele clientului se află în `client/dist`. Serverul Bun (Hono) este configurat să servească SPA din `client/dist` și API-ul pe același port (implicit `3765`).

## Pornire server (producție)
Varianta simplă (foreground):
```bash
# Rulează serverul direct (TS, fără watch)
cd /var/www/miha/server
bun run src/index.ts
```

## Serviciu systemd
Pentru rulare persistentă și auto‑restart:
```bash
sudo tee /etc/systemd/system/miha.service > /dev/null <<'EOF'
[Unit]
Description=Miha Bun/Hono server
After=network.target

[Service]
Type=simple
Environment=BUN_INSTALL=/root/.bun
Environment=PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
WorkingDirectory=/var/www/miha
ExecStart=/root/.bun/bin/bun run server/src/index.ts
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable miha
sudo systemctl start miha

# Loguri live
journalctl -u miha -f
```

## Firewall (opțional)
```bash
sudo ufw allow 3765/tcp
sudo ufw status
```

## Structură runtime
- API: expus de Hono (`/beneficiaries`, `/payment-packages`, `/payments`, `/settings`).
- SPA: servită de Bun/Hono din `client/dist` (fallback „index.html” pentru rute client-side).
- Baza de date: `server/beneficiaries.sqlite` (SQLite) în `WorkingDirectory`.

## Actualizări cod
```bash
cd /var/www/miha
git pull
bun install
bun run build:client
sudo systemctl restart miha
```

## Notă despre port
- Serverul rulează pe `3765` (configurat în `server/src/index.ts`). Schimbarea portului se face prin editarea fișierului și restartul serviciului.

