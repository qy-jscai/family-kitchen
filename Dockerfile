# 使用更轻量的Alpine Linux版本的Node.js镜像
FROM node:18-alpine

# 设置容器内的工作目录
WORKDIR /app

# 1. 首先只复制包管理文件（利用Docker缓存层，大幅加速构建）
COPY package*.json ./

# 安装生产环境所需的依赖
RUN npm ci --only=production

# 2. 然后将所有源代码复制到工作目录
COPY . .

# 暴露应用程序运行的端口
EXPOSE 3000

# 设置运行时环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 清理npm缓存以减小镜像体积
RUN npm cache clean --force

# 重要：更改文件所有权给node用户
RUN chown -R node:node /app

# 以非root用户运行应用，更安全
USER node

# 定义启动命令
CMD ["npm", "start"]
