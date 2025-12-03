# PM2 Quick Start Guide

Quick reference pentru deployment cu PM2.

## Setup inițial (doar prima dată)

```bash
cd /var/www/miha

# 1. Pornește aplicația
pm2 start ecosystem.config.js

# 2. Salvează configurația
pm2 save

# 3. Configurează pornire automată la boot
pm2 startup
# Rulează comanda afișată (cu sudo)
```

## Comenzi zilnice

```bash
# Status
pm2 status
pm2 list

# Loguri
pm2 logs miha              # Live logs
pm2 logs miha --lines 100  # Ultimele 100 linii

# Restart
pm2 restart miha

# Stop/Start
pm2 stop miha
pm2 start miha
```

## Update aplicație

```bash
cd /var/www/miha
git pull
bun install
bun run build:client
pm2 reload miha  # Zero-downtime restart
```

## Monitoring

```bash
# Dashboard interactiv
pm2 monit

# Informații detaliate
pm2 show miha
```

## Troubleshooting

```bash
# Verifică erori
pm2 logs miha --err

# Restart complet
pm2 restart miha

# Recreează procesul
pm2 delete miha
pm2 start ecosystem.config.js
pm2 save
```

Pentru mai multe detalii, vezi [DEPLOYMENT.md](./DEPLOYMENT.md)
