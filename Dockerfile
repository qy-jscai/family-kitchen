# 使用更轻量的Alpine Linux版本的Node.js镜像
FROM node:18-alpine

# 设置容器内的工作目录
WORKDIR /app

# 1. 首先只复制包管理文件（利用Docker缓存层，大幅加速构建）
COPY package*.json ./

# 安装生产环境所需的依赖（清理缓存以减小镜像体积）
RUN npm ci --only=production && npm cache clean --force

# 2. 然后将所有源代码复制到工作目录
COPY . .

# 暴露应用程序运行的端口（必须与您环境变量中设置的 PORT=3000 一致）
EXPOSE 3000

# 设置运行时环境变量（确保与Northflank后台设置的一致）
ENV NODE_ENV=production
ENV PORT=3000

# 以非root用户运行应用，更安全
USER node

# 定义启动命令
CMD ["npm", "start"]