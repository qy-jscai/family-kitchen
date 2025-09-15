FROM node:18-alpine

WORKDIR /app

# 1. 复制包文件
COPY package*.json ./

# 2. 安装依赖
RUN npm install --production --max-old-space-size=256

# 3. 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动命令
CMD ["npm", "start"]