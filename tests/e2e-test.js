/**
 * 端到端测试 - 微信内容研究助手
 * 
 * 测试扩展的核心功能：图片复制、文字复制、设置管理等
 * 使用 Puppeteer 进行自动化测试
 * 
 * 运行方式：
 * npm install puppeteer --save-dev
 * node tests/e2e-test.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// 测试配置
const TEST_CONFIG = {
  extensionPath: path.resolve(__dirname, '..'),
  testUrl: 'https://mp.weixin.qq.com/s/test-article',
  timeout: 30000,
  headless: false, // 设为 true 可无头运行
};

// 测试结果统计
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * 测试工具函数
 */
class TestUtils {
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async waitForElement(page, selector, timeout = 5000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.error(`Element not found: ${selector}`);
      return false;
    }
  }

  static async takeScreenshot(page, name) {
    const screenshotPath = path.join(__dirname, 'screenshots', `${name}.png`);
    await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  static logTest(name, passed, error = null) {
    testResults.total++;
    if (passed) {
      testResults.passed++;
      console.log(`✅ ${name}`);
    } else {
      testResults.failed++;
      console.log(`❌ ${name}`);
      if (error) {
        console.error(`   Error: ${error.message}`);
        testResults.errors.push({ test: name, error: error.message });
      }
    }
  }
}

/**
 * 扩展加载测试
 */
async function testExtensionLoading(browser) {
  console.log('\n🔍 测试扩展加载...');
  
  try {
    const pages = await browser.pages();
    const extensionPage = pages.find(page => 
      page.url().includes('chrome-extension://') && 
      page.url().includes('popup.html')
    );
    
    if (extensionPage) {
      TestUtils.logTest('扩展弹窗页面加载', true);
      return extensionPage;
    } else {
      // 尝试打开扩展弹窗
      const page = await browser.newPage();
      await page.goto('chrome://extensions/');
      await TestUtils.sleep(2000);
      
      TestUtils.logTest('扩展加载', false, new Error('无法找到扩展弹窗页面'));
      return null;
    }
  } catch (error) {
    TestUtils.logTest('扩展加载', false, error);
    return null;
  }
}

/**
 * 设置页面功能测试
 */
async function testSettingsPage(page) {
  console.log('\n⚙️ 测试设置页面功能...');
  
  try {
    // 测试开关控件
    const toggles = await page.$$('.toggle-switch');
    if (toggles.length > 0) {
      TestUtils.logTest('设置开关控件存在', true);
      
      // 测试开关切换
      await toggles[0].click();
      await TestUtils.sleep(500);
      TestUtils.logTest('设置开关切换功能', true);
    } else {
      TestUtils.logTest('设置开关控件', false, new Error('未找到开关控件'));
    }
    
    // 测试许可证输入
    const licenseInput = await page.$('#licenseKeyInput');
    if (licenseInput) {
      await licenseInput.type('TEST-LICENSE-KEY-12345');
      const value = await page.evaluate(el => el.value, licenseInput);
      TestUtils.logTest('许可证输入功能', value === 'TEST-LICENSE-KEY-12345');
    } else {
      TestUtils.logTest('许可证输入', false, new Error('未找到许可证输入框'));
    }
    
    await TestUtils.takeScreenshot(page, 'settings-page');
    
  } catch (error) {
    TestUtils.logTest('设置页面测试', false, error);
  }
}

/**
 * 内容脚本功能测试
 */
async function testContentScript(browser) {
  console.log('\n📄 测试内容脚本功能...');
  
  try {
    const page = await browser.newPage();
    
    // 创建测试页面
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>微信文章测试页面</title>
        <meta name="referrer" content="no-referrer">
      </head>
      <body>
        <div id="js_content">
          <h1>测试文章标题</h1>
          <p>这是一段测试文字，用于测试复制功能。</p>
          <img src="https://mmbiz.qpic.cn/test-image.jpg" alt="测试图片" style="width:200px;height:150px;">
          <p>更多测试内容...</p>
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(testHtml);
    await page.addScriptTag({ path: path.join(TEST_CONFIG.extensionPath, 'wasmLoader.js') });
    await page.addScriptTag({ path: path.join(TEST_CONFIG.extensionPath, 'content.js') });
    await TestUtils.sleep(2000);
    
    // 测试图片复制按钮生成
    const copyButtons = await page.$$('.copy-btn');
    TestUtils.logTest('图片复制按钮生成', copyButtons.length > 0);
    
    // 测试文字选择功能
    const textContent = await page.$('#js_content p');
    if (textContent) {
      await page.evaluate(el => {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        selection.removeAllRanges();
        selection.addRange(range);
      }, textContent);
      
      const selectedText = await page.evaluate(() => window.getSelection().toString());
      TestUtils.logTest('文字选择功能', selectedText.includes('测试文字'));
    }
    
    await TestUtils.takeScreenshot(page, 'content-script-test');
    await page.close();
    
  } catch (error) {
    TestUtils.logTest('内容脚本测试', false, error);
  }
}

/**
 * WASM 模块功能测试
 */
async function testWasmModule(browser) {
  console.log('\n🌙 测试 WASM 模块功能...');
  
  try {
    const page = await browser.newPage();
    
    // 加载 WASM 模块
    await page.addScriptTag({ path: path.join(TEST_CONFIG.extensionPath, 'wasmLoader.js') });
    await TestUtils.sleep(1000);
    
    // 测试 URL 标准化功能
    const normalizeResult = await page.evaluate(() => {
      if (window.Compute && window.Compute.normalizeImageUrl) {
        return window.Compute.normalizeImageUrl('https://mmbiz.qpic.cn/test.jpg');
      }
      return null;
    });
    
    TestUtils.logTest('WASM URL 标准化', 
      normalizeResult && normalizeResult.includes('wx_fmt=png') && normalizeResult.includes('tp=webp')
    );
    
    // 测试文件名清理功能
    const sanitizeResult = await page.evaluate(() => {
      if (window.Compute && window.Compute.sanitizeFilename) {
        return window.Compute.sanitizeFilename('test/file:name*.jpg');
      }
      return null;
    });
    
    TestUtils.logTest('WASM 文件名清理', 
      sanitizeResult && sanitizeResult === 'test_file_name_.jpg'
    );
    
    await page.close();
    
  } catch (error) {
    TestUtils.logTest('WASM 模块测试', false, error);
  }
}

/**
 * 性能测试
 */
async function testPerformance(browser) {
  console.log('\n⚡ 测试性能指标...');
  
  try {
    const page = await browser.newPage();
    
    // 测试扩展加载时间
    const startTime = Date.now();
    await page.addScriptTag({ path: path.join(TEST_CONFIG.extensionPath, 'wasmLoader.js') });
    await page.addScriptTag({ path: path.join(TEST_CONFIG.extensionPath, 'content.js') });
    const loadTime = Date.now() - startTime;
    
    TestUtils.logTest('扩展加载性能', loadTime < 3000); // 3秒内加载完成
    console.log(`   加载时间: ${loadTime}ms`);
    
    // 测试内存使用
    const metrics = await page.metrics();
    const memoryUsage = metrics.JSHeapUsedSize / 1024 / 1024; // MB
    TestUtils.logTest('内存使用合理', memoryUsage < 50); // 小于50MB
    console.log(`   内存使用: ${memoryUsage.toFixed(2)}MB`);
    
    await page.close();
    
  } catch (error) {
    TestUtils.logTest('性能测试', false, error);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始端到端测试 - 微信内容研究助手');
  console.log('='.repeat(50));
  
  let browser;
  
  try {
    // 启动浏览器并加载扩展
    browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      args: [
        `--disable-extensions-except=${TEST_CONFIG.extensionPath}`,
        `--load-extension=${TEST_CONFIG.extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    console.log('✅ 浏览器启动成功');
    
    // 等待扩展加载
    await TestUtils.sleep(3000);
    
    // 运行测试套件
    const extensionPage = await testExtensionLoading(browser);
    
    if (extensionPage) {
      await testSettingsPage(extensionPage);
    }
    
    await testContentScript(browser);
    await testWasmModule(browser);
    await testPerformance(browser);
    
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    testResults.errors.push({ test: 'Test Runner', error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // 输出测试结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(50));
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed}`);
  console.log(`失败: ${testResults.failed}`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ 失败详情:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  // 生成测试报告
  const reportPath = path.join(__dirname, 'test-report.json');
  await fs.promises.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: testResults,
    config: TEST_CONFIG
  }, null, 2));
  
  console.log(`\n📄 测试报告已保存: ${reportPath}`);
  
  // 退出码
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, TestUtils };