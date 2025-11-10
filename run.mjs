#!/usr/bin/env node

/**
 * ccNexus Web版 运行脚本
 * 默认: 开发模式（前端构建）
 * 构建: node run.mjs -b 或 node run.mjs --build
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
}

// 检查命令是否存在
async function commandExists(cmd) {
  try {
    const command = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`
    await execAsync(command)
    return true
  } catch {
    return false
  }
}

// 执行命令并实时输出
function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`))
      }
    })

    child.on('error', reject)
  })
}

// 检查前端依赖
function checkFrontendDeps() {
  const nodeModulesPath = join(__dirname, 'frontend', 'node_modules')
  return existsSync(nodeModulesPath)
}

// 安装前端依赖
async function installFrontendDeps() {
  log.info('📦 安装前端依赖...')
  const frontendDir = join(__dirname, 'frontend')

  // 检测是否在国内网络环境
  const useRegistry = process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmmirror.com'
  log.info(`使用 NPM 镜像: ${useRegistry}`)

  try {
    await runCommand('npm', ['install', '--registry', useRegistry], { cwd: frontendDir })
    log.success('前端依赖安装完成')
  } catch (error) {
    log.error('前端依赖安装失败')
    throw error
  }
}

// 构建前端
async function buildFrontend() {
  log.info('🏗️  构建前端...')
  const frontendDir = join(__dirname, 'frontend')

  // 检查前端依赖
  if (!checkFrontendDeps()) {
    await installFrontendDeps()
  }

  try {
    await runCommand('npm', ['run', 'build'], { cwd: frontendDir })
    log.success('前端构建完成')
  } catch (error) {
    log.error('前端构建失败')
    throw error
  }
}

// 开发模式
async function dev() {
  log.title('🚀 启动 ccNexus Web 版开发模式')

  // 检查 Go 是否安装
  if (!(await commandExists('go'))) {
    log.error('未找到 Go 命令，请先安装 Go: https://golang.org/dl/')
    process.exit(1)
  }

  // 检查前端依赖并启动前端开发服务器
  if (!checkFrontendDeps()) {
    await installFrontendDeps()
  }

  log.info('🔧 启动前端开发服务器...')
  const frontendDir = join(__dirname, 'frontend')
  
  // 启动前端开发服务器
  const frontendProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: frontendDir,
  })

  frontendProcess.on('error', (error) => {
    log.error('前端服务器启动失败: ' + error.message)
  })

  // 配置国内镜像
  const goEnv = {
    ...process.env,
    GOPROXY: 'https://goproxy.cn,direct',
  }

  log.info('⏳ 等待前端构建完成...')
  await new Promise(resolve => setTimeout(resolve, 3000))

  log.info('🔧 启动后端 Go 服务...')
  log.info('访问 http://localhost:8080')
  
  try {
    await runCommand('go', ['run', 'main.go'], { env: goEnv })
  } catch (error) {
    log.error('后端启动失败')
    process.exit(1)
  }
}

// 构建
async function build(options = {}) {
  log.title('🏗️  构建 ccNexus Web 版')

  // 检查 Go 是否安装
  if (!(await commandExists('go'))) {
    log.error('未找到 Go 命令，请先安装 Go: https://golang.org/dl/')
    process.exit(1)
  }

  // 构建前端
  await buildFrontend()

  // 构建 Go 应用
  log.title('🏗️  构建 Go 应用')

  // 配置国内镜像
  const goEnv = {
    ...process.env,
    GOPROXY: 'https://goproxy.cn,direct',
  }

  const buildDir = join(__dirname, 'build', 'bin')
  let args = ['build', '-o', join(buildDir, 'ccNexus')]

  if (options.prod) {
    args.push('-ldflags', '-w -s')
    log.info('🎯 生产模式构建（启用优化和压缩）')
  }

  args.push('main.go')

  try {
    await runCommand('go', args, { env: goEnv })
    log.success('✅ 构建完成！输出位置: ' + buildDir + '/ccNexus')
  } catch (error) {
    log.error('Go 构建失败')
    process.exit(1)
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}ccNexus Web 版运行脚本${colors.reset}

${colors.bright}用法:${colors.reset}
  node run.mjs [选项]

${colors.bright}选项:${colors.reset}
  ${colors.green}无参数${colors.reset}              开发模式（默认）
  ${colors.green}-b, --build${colors.reset}        构建模式
  ${colors.green}-p, --prod${colors.reset}         生产构建（优化+压缩）
  ${colors.green}-h, --help${colors.reset}         显示帮助信息

${colors.bright}示例:${colors.reset}
  ${colors.cyan}node run.mjs${colors.reset}                 # 开发模式
  ${colors.cyan}npm start${colors.reset}                   # 开发模式（简写）
  ${colors.cyan}node run.mjs -b${colors.reset}             # 标准构建
  ${colors.cyan}node run.mjs -b -p${colors.reset}          # 生产构建
`)
}

// 主函数
async function main() {
  const args = process.argv.slice(2)

  // 显示帮助
  if (args.includes('-h') || args.includes('--help')) {
    showHelp()
    return
  }

  // 判断是构建还是开发
  const isBuild = args.includes('-b') || args.includes('--build')
  const isProd = args.includes('-p') || args.includes('--prod')

  try {
    if (isBuild) {
      await build({
        prod: isProd
      })
    } else {
      await dev()
    }
  } catch (error) {
    log.error(error.message)
    process.exit(1)
  }
}

// 执行
main()
