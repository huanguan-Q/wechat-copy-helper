# 端到端测试文档

## 📋 概述

本目录包含微信内容研究助手的端到端（E2E）测试，使用 Puppeteer 自动化测试扩展的核心功能。

## 🚀 快速开始

### 1. 安装依赖

```bash
# 在项目根目录运行
npm run test:setup

# 或者在 tests 目录运行
cd tests
npm install
```

### 2. 运行测试

```bash
# 在项目根目录运行
npm run test:e2e          # 有界面模式
npm run test:e2e:headless # 无界面模式
npm run test:all          # 运行所有测试（MoonBit + E2E）

# 或者在 tests 目录运行
cd tests
npm run test:e2e
```

## 🧪 测试内容

### 核心功能测试

1. **扩展加载测试**
   - 验证扩展是否正确加载
   - 检查弹窗页面是否可访问

2. **设置页面测试**
   - 功能开关切换
   - 许可证输入功能
   - 设置持久化

3. **内容脚本测试**
   - 图片复制按钮生成
   - 文字选择功能
   - 防盗链绕过

4. **WASM 模块测试**
   - URL 标准化功能
   - 文件名清理功能
   - 性能验证

5. **性能测试**
   - 扩展加载时间
   - 内存使用情况
   - 响应速度

### 测试覆盖范围

- ✅ 扩展安装和加载
- ✅ 用户界面交互
- ✅ 核心业务逻辑
- ✅ WASM 模块功能
- ✅ 性能指标
- ✅ 错误处理

## 📊 测试报告

测试完成后会生成以下文件：

- `test-report.json` - 详细的测试结果报告
- `screenshots/` - 测试过程中的截图
- 控制台输出 - 实时测试状态

### 报告格式

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "results": {
    "total": 15,
    "passed": 14,
    "failed": 1,
    "errors": [
      {
        "test": "测试名称",
        "error": "错误信息"
      }
    ]
  },
  "config": {
    "extensionPath": "/path/to/extension",
    "headless": false
  }
}
```

## ⚙️ 配置选项

### 环境变量

- `HEADLESS=true` - 无界面模式运行
- `TIMEOUT=30000` - 测试超时时间（毫秒）
- `SCREENSHOT=true` - 启用截图功能

### 测试配置

在 `e2e-test.js` 中可以修改以下配置：

```javascript
const TEST_CONFIG = {
  extensionPath: path.resolve(__dirname, '..'),
  testUrl: 'https://mp.weixin.qq.com/s/test-article',
  timeout: 30000,
  headless: false,
};
```

## 🔧 故障排除

### 常见问题

1. **扩展加载失败**
   ```
   Error: 无法找到扩展弹窗页面
   ```
   - 确保扩展文件完整
   - 检查 manifest.json 配置
   - 验证扩展路径正确

2. **Puppeteer 安装失败**
   ```
   Error: Failed to download Chromium
   ```
   - 使用国内镜像：`npm config set puppeteer_download_host=https://npm.taobao.org/mirrors`
   - 或手动安装：`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer`

3. **测试超时**
   ```
   Error: waiting for selector timeout
   ```
   - 增加超时时间
   - 检查选择器是否正确
   - 确认页面加载完成

### 调试模式

```bash
# 启用详细日志
DEBUG=true npm run test:e2e

# 保持浏览器打开（调试用）
KEEP_OPEN=true npm run test:e2e
```

## 📈 持续集成

### GitHub Actions 集成

```yaml
- name: Run E2E Tests
  run: |
    npm run test:setup
    npm run test:e2e:headless

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: test-results
    path: |
      tests/test-report.json
      tests/screenshots/
```

### 本地 CI 脚本

```bash
# 运行完整的 CI 流程
npm run ci
```

这将依次执行：
1. MoonBit 代码格式检查
2. MoonBit 静态分析
3. MoonBit 单元测试
4. 端到端测试
5. WASM 构建

## 🤝 贡献指南

### 添加新测试

1. 在 `e2e-test.js` 中添加新的测试函数
2. 使用 `TestUtils.logTest()` 记录结果
3. 在 `runTests()` 中调用新测试
4. 更新本文档

### 测试最佳实践

- 使用描述性的测试名称
- 添加适当的等待时间
- 捕获和处理异常
- 生成有意义的截图
- 清理测试数据

### 示例测试函数

```javascript
async function testNewFeature(browser) {
  console.log('\n🆕 测试新功能...');
  
  try {
    const page = await browser.newPage();
    
    // 测试逻辑
    const result = await page.evaluate(() => {
      // 在页面中执行的代码
      return true;
    });
    
    TestUtils.logTest('新功能测试', result);
    await TestUtils.takeScreenshot(page, 'new-feature');
    await page.close();
    
  } catch (error) {
    TestUtils.logTest('新功能测试', false, error);
  }
}
```

## 📞 支持

如果遇到测试相关问题：

1. 查看测试报告和截图
2. 检查控制台错误信息
3. 参考故障排除部分
4. 提交 Issue 并附上测试报告

---

**测试愉快！** 🎉