FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
