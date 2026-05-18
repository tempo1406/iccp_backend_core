# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:23-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Cài đầy đủ deps (bao gồm devDeps) để build TypeScript
RUN npm ci

COPY . .

RUN npm run build

# ─── Stage 2: Development ─────────────────────────────────────────────────────
FROM node:23-alpine AS dev

WORKDIR /usr/src/app

# Fonts cho chart rendering trong periodic report (xlsx workbook)
RUN apk add --no-cache fontconfig ttf-dejavu

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "start:dev"]


# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM node:23-alpine AS prod

WORKDIR /usr/src/app

# Fonts cho chart rendering trong periodic report (xlsx workbook)
RUN apk add --no-cache fontconfig ttf-dejavu

COPY package*.json ./

# Chỉ cài production deps
RUN npm ci --omit=dev

# Copy artifact đã build từ stage builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy entrypoint: chạy migration trước khi start app
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
