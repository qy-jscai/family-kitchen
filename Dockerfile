FROM node:18-alpine

WORKDIR /app

# 1. 复制包文件
COPY package*.json ./

# 2. 使用更稳健的安装命令，添加内存限制
RUN npm install --production --max-old-space-size=256

# 3. 复制源代码
COPY . .

# 更改文件所有权
RUN chown -R node:node /app

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 清理缓存
RUN npm cache clean --force

# 切换用户
USER node

# 启动命令
CMD ["npm", "start"]