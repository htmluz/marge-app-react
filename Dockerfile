FROM oven/bun:1.2.21-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json eslint.config.js vite.config.ts components.json tsconfig.app.json tsconfig.node.json ./

RUN bun install

COPY . .

RUN bunx --bun vite build


FROM nginx:stable-alpine3.21-perl AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3555

CMD ["nginx", "-g", "daemon off;"]