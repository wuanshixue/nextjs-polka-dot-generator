# nextjs-polka-dot-generator 本地部署指南

这份文档用于帮助他人在本地快速部署并运行项目。

## 1. 环境要求

- Node.js: 推荐 20.x 或更高版本
- npm: 推荐 10.x 或更高版本
- Git
- 操作系统: Windows / macOS / Linux

检查版本：

```bash
node -v
npm -v
git --version
```

## 2. 获取项目代码

```bash
git clone https://github.com/wuanshixue/nextjs-polka-dot-generator.git
cd nextjs-polka-dot-generator
```

## 3. 安装依赖

```bash
npm install
```

## 4. 开发模式运行

```bash
npm run dev
```

启动后访问：

- http://localhost:3000

## 5. 生产模式运行

先构建：

```bash
npm run build
```

再启动：

```bash
npm run start
```

默认端口为 3000。

如果需要指定端口（例如 4000）：

```bash
# macOS / Linux
PORT=4000 npm run start

# Windows PowerShell
$env:PORT=4000; npm run start
```

## 6. 常见问题

### 6.1 npm 命令不可用

在 Windows 下先检查 PATH：

```powershell
Get-Command node
Get-Command npm
```

如果命令找不到，请确认 Node.js 已安装并重新打开终端。

### 6.2 PowerShell 提示 npm.ps1 执行策略错误

可执行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

执行后重开终端，再运行 `npm install`。

### 6.3 端口被占用

把端口改成其他值再启动（见第 5 节）。

## 7. 项目脚本说明

```bash
npm run dev    # 本地开发
npm run build  # 生产构建
npm run start  # 生产启动
npm run lint   # 代码检查
```

## 8. 推荐部署流程（给新同事）

1. 安装 Node.js 与 Git
2. 克隆项目并进入目录
3. 执行 `npm install`
4. 执行 `npm run dev`
5. 浏览器打开 http://localhost:3000 验证页面可访问
