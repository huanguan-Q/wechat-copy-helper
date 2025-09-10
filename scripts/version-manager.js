#!/usr/bin/env node

/**
 * 自动版本更新管理器
 * 支持语义化版本控制 (Semantic Versioning)
 * 自动同步 package.json 和 moonbit/moon.mod.json 的版本号
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 版本类型枚举
const VERSION_TYPES = {
  PATCH: 'patch',     // 1.0.0 -> 1.0.1 (bug fixes)
  MINOR: 'minor',     // 1.0.0 -> 1.1.0 (new features)
  MAJOR: 'major'      // 1.0.0 -> 2.0.0 (breaking changes)
};

// 文件路径配置
const PATHS = {
  PACKAGE_JSON: path.join(__dirname, '../package.json'),
  MOON_MOD_JSON: path.join(__dirname, '../moonbit/moon.mod.json'),
  CHANGELOG: path.join(__dirname, '../CHANGELOG.md')
};

class VersionManager {
  constructor() {
    this.packageJson = null;
    this.moonModJson = null;
  }

  /**
   * 读取配置文件
   */
  loadConfigs() {
    try {
      this.packageJson = JSON.parse(fs.readFileSync(PATHS.PACKAGE_JSON, 'utf8'));
      this.moonModJson = JSON.parse(fs.readFileSync(PATHS.MOON_MOD_JSON, 'utf8'));
    } catch (error) {
      console.error('❌ 读取配置文件失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 解析版本号
   * @param {string} version - 版本号字符串 (e.g., "1.2.3")
   * @returns {object} - {major, minor, patch}
   */
  parseVersion(version) {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new Error(`无效的版本号格式: ${version}`);
    }
    return {
      major: parts[0],
      minor: parts[1],
      patch: parts[2]
    };
  }

  /**
   * 增加版本号
   * @param {string} currentVersion - 当前版本号
   * @param {string} type - 版本类型 (patch/minor/major)
   * @returns {string} - 新版本号
   */
  incrementVersion(currentVersion, type) {
    const version = this.parseVersion(currentVersion);
    
    switch (type) {
      case VERSION_TYPES.PATCH:
        version.patch++;
        break;
      case VERSION_TYPES.MINOR:
        version.minor++;
        version.patch = 0;
        break;
      case VERSION_TYPES.MAJOR:
        version.major++;
        version.minor = 0;
        version.patch = 0;
        break;
      default:
        throw new Error(`不支持的版本类型: ${type}`);
    }
    
    return `${version.major}.${version.minor}.${version.patch}`;
  }

  /**
   * 获取当前版本号
   * @returns {string} - 当前版本号
   */
  getCurrentVersion() {
    const packageVersion = this.packageJson.version;
    const moonVersion = this.moonModJson.version;
    
    if (packageVersion !== moonVersion) {
      console.warn(`⚠️  版本不一致: package.json(${packageVersion}) vs moon.mod.json(${moonVersion})`);
      console.log('使用 package.json 中的版本作为基准');
    }
    
    return packageVersion;
  }

  /**
   * 更新版本号
   * @param {string} newVersion - 新版本号
   */
  updateVersion(newVersion) {
    // 更新 package.json
    this.packageJson.version = newVersion;
    fs.writeFileSync(PATHS.PACKAGE_JSON, JSON.stringify(this.packageJson, null, 2) + '\n');
    
    // 更新 moon.mod.json
    this.moonModJson.version = newVersion;
    fs.writeFileSync(PATHS.MOON_MOD_JSON, JSON.stringify(this.moonModJson, null, 2) + '\n');
    
    console.log(`✅ 版本已更新到: ${newVersion}`);
  }

  /**
   * 更新 CHANGELOG.md
   * @param {string} version - 版本号
   * @param {string} type - 版本类型
   * @param {string} description - 更新描述
   */
  updateChangelog(version, type, description) {
    const date = new Date().toISOString().split('T')[0];
    const typeEmoji = {
      [VERSION_TYPES.MAJOR]: '🚀',
      [VERSION_TYPES.MINOR]: '✨',
      [VERSION_TYPES.PATCH]: '🐛'
    };
    
    const changelogEntry = `\n## [${version}] - ${date}\n\n### ${typeEmoji[type]} ${type.toUpperCase()}\n\n${description}\n`;
    
    try {
      let changelog = fs.readFileSync(PATHS.CHANGELOG, 'utf8');
      
      // 在第一个 ## 之前插入新的版本记录
      const firstVersionIndex = changelog.indexOf('\n## ');
      if (firstVersionIndex !== -1) {
        changelog = changelog.slice(0, firstVersionIndex) + changelogEntry + changelog.slice(firstVersionIndex);
      } else {
        changelog += changelogEntry;
      }
      
      fs.writeFileSync(PATHS.CHANGELOG, changelog);
      console.log('✅ CHANGELOG.md 已更新');
    } catch (error) {
      console.warn('⚠️  更新 CHANGELOG.md 失败:', error.message);
    }
  }

  /**
   * 创建 Git 标签
   * @param {string} version - 版本号
   */
  createGitTag(version) {
    try {
      execSync(`git add .`, { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
      execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });
      console.log(`✅ Git 标签 v${version} 已创建`);
    } catch (error) {
      console.warn('⚠️  创建 Git 标签失败:', error.message);
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
📦 版本管理器 - 使用说明

用法:
  node scripts/version-manager.js <command> [options]

命令:
  current                    显示当前版本
  patch [description]        增加补丁版本 (1.0.0 -> 1.0.1)
  minor [description]        增加次要版本 (1.0.0 -> 1.1.0)
  major [description]        增加主要版本 (1.0.0 -> 2.0.0)
  set <version>             设置指定版本
  sync                      同步 package.json 和 moon.mod.json 版本
  help                      显示帮助信息

选项:
  --no-git                  不创建 Git 标签
  --no-changelog            不更新 CHANGELOG.md

示例:
  node scripts/version-manager.js current
  node scripts/version-manager.js patch "修复图片复制问题"
  node scripts/version-manager.js minor "新增 AI 集成功能"
  node scripts/version-manager.js major "重构工具链架构"
  node scripts/version-manager.js set 2.0.0
`);
  }

  /**
   * 同步版本号
   */
  syncVersions() {
    const packageVersion = this.packageJson.version;
    const moonVersion = this.moonModJson.version;
    
    if (packageVersion === moonVersion) {
      console.log(`✅ 版本已同步: ${packageVersion}`);
      return;
    }
    
    console.log(`🔄 同步版本: ${moonVersion} -> ${packageVersion}`);
    this.updateVersion(packageVersion);
  }

  /**
   * 主执行函数
   */
  run() {
    const args = process.argv.slice(2);
    const command = args[0];
    const options = {
      noGit: args.includes('--no-git'),
      noChangelog: args.includes('--no-changelog')
    };

    this.loadConfigs();

    switch (command) {
      case 'current':
        console.log(`📦 当前版本: ${this.getCurrentVersion()}`);
        break;

      case 'patch':
      case 'minor':
      case 'major': {
        const currentVersion = this.getCurrentVersion();
        const newVersion = this.incrementVersion(currentVersion, command);
        const description = args[1] || `${command} version update`;
        
        console.log(`🔄 版本更新: ${currentVersion} -> ${newVersion}`);
        this.updateVersion(newVersion);
        
        if (!options.noChangelog) {
          this.updateChangelog(newVersion, command, description);
        }
        
        if (!options.noGit) {
          this.createGitTag(newVersion);
        }
        break;
      }

      case 'set': {
        const targetVersion = args[1];
        if (!targetVersion) {
          console.error('❌ 请指定目标版本号');
          process.exit(1);
        }
        
        // 验证版本号格式
        try {
          this.parseVersion(targetVersion);
        } catch (error) {
          console.error('❌', error.message);
          process.exit(1);
        }
        
        const currentVersion = this.getCurrentVersion();
        console.log(`🔄 设置版本: ${currentVersion} -> ${targetVersion}`);
        this.updateVersion(targetVersion);
        
        if (!options.noGit) {
          this.createGitTag(targetVersion);
        }
        break;
      }

      case 'sync':
        this.syncVersions();
        break;

      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;

      default:
        console.error(`❌ 未知命令: ${command}`);
        this.showHelp();
        process.exit(1);
    }
  }
}

// 执行版本管理器
if (require.main === module) {
  const versionManager = new VersionManager();
  versionManager.run();
}

module.exports = VersionManager;