FROM oven/bun:1.2.21-alpine AS builder

WORKDIR /app

COPY package.json ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build


FROM oven/bun:1.2.21-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3555

CMD ["bunx", "serve", "-s", "dist", "-l", "3555"]