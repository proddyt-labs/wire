# wire
> Chat — Proddyt Labs
> Marca: `« · »` | Cor: `#F472B6` (pink)

## Stack
- Vue 3 + TypeScript + Vite (frontend)
- Node + Express + TypeScript + Socket.io (backend)
- Prisma + PostgreSQL
- Auth: Gate SSO (sso.proddyt.site)

## Modelo
- `User` — vinculado ao Gate (`gateId`)
- `Room` — sala (1:1 ou grupo)
- `RoomMember` — pivot user-room
- `Message` — mensagens (com índice `[roomId, createdAt]`)

## Setup local
```bash
# DB
docker compose -f compose.dev.yml up -d

# Backend
cd backend && cp .env.example .env && npm install && npx prisma db push && npm run dev

# Frontend
cd ../frontend && cp .env.example .env && npm install && npm run dev
```
