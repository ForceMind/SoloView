#!/bin/bash

# SoloView 一键部署/更新脚本
# 适用系统: Ubuntu / CentOS / Debian / Alibaba Cloud Linux

echo "========================================="
echo "   SoloView Auto Deploy Script"
echo "========================================="

# 1. 检查是否安装 Node.js
if ! command -v node &> /dev/null; then
    echo "[Info] Node.js not found. Installing..."
    
    # 简单的安装逻辑 (使用 NodeSource)
    if [ -f /etc/redhat-release ]; then
        # CentOS / RHEL
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        # Ubuntu / Debian
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    echo "[Info] Node.js is already installed: $(node -v)"
fi

# 2. 检查是否安装 PM2 (进程管理)
if ! command -v pm2 &> /dev/null; then
    echo "[Info] Installing PM2..."
    sudo npm install -g pm2
fi

# 3. 安装依赖
echo "[Info] Installing dependencies..."
# 确保安装 node-fetch v2 以匹配 CommonJS require
npm install

# 4. 停止旧服务 (如果存在)
pm2 stop soloview-server 2>/dev/null || true
pm2 delete soloview-server 2>/dev/null || true

# 5. 启动服务
echo "[Info] Starting server on port 8080..."
pm2 start server.js --name soloview-server

# 6. 保存 PM2 列表开机自启
pm2 save
# 注意: 第一次运行可能需要执行 pm2 startup，根据提示操作即可

echo "========================================="
echo "   Deployment Success!"
echo "   Access: http://<YOUR_SERVER_IP>:8080"
echo "========================================="
