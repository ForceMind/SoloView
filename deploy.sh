#!/bin/bash

# SoloView 一键部署/更新脚本
# 适用系统: Ubuntu / CentOS / Debian / Alibaba Cloud Linux

echo "========================================="
echo "   SoloView Auto Deploy Script"
echo "========================================="

# 1. 检查是否安装 Node.js
if ! command -v node &> /dev/null; then
    echo "[Info] Node.js not found. Installing..."
    
    # 检测系统发行版
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    elif [ -f /etc/redhat-release ]; then
        OS="centos"
    else
        echo "Unsupported OS. Please install Node.js manually."
        exit 1
    fi

    # 安装 Node.js
    if [[ "$OS" == "opencloudos" || "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "fedora" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
        # CentOS / RHEL / OpenCloudOS 系列
        # 尝试使用 yum (部分旧系统) 或 dnf
        if command -v dnf &> /dev/null; then
            sudo dnf module enable nodejs:18 -y || true
            sudo dnf install -y nodejs
        else
             # 如果没有 dnf，尝试添加 NodeSource 源 (通用 RHEL 兼容)
             curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
             sudo yum install -y nodejs
        fi
    elif [[ "$OS" == "ubuntu" || "$OS" == "debian" || "$OS" == "kali" ]]; then
        # Ubuntu / Debian 系列
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
         echo "Unsupported OS: $OS. Please install Node.js manually."
         exit 1
    fi
else
    echo "[Info] Node.js is already installed: $(node -v)"
fi

# 2. 检查是否安装 PM2 (进程管理)
if ! command -v pm2 &> /dev/null; then
    echo "[Info] Installing PM2..."
    # 确保 npm 存在
    if command -v npm &> /dev/null; then
        sudo npm install -g pm2
    else
        echo "[Error] npm not found. Node.js installation might have failed."
        exit 1
    fi
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
