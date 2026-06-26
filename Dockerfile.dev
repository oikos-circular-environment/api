FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npm install --ignore-scripts && npx prisma generate

CMD ["npm", "run", "dev"]
