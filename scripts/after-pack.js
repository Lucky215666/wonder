const { execSync } = require('child_process')
const path = require('path')

exports.default = async function (context) {
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)
  const rcedit = path.join(__dirname, '..', 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe')
  const iconPath = path.join(__dirname, '..', 'public', 'icon.ico')
  const version = context.packager.appInfo.version

  try {
    execSync(`"${rcedit}" "${exePath}" ` +
      `--set-version-string "FileDescription" "Wonder - AI 文献分析与知识管理工具" ` +
      `--set-version-string "ProductName" "Wonder" ` +
      `--set-version-string "CompanyName" "Bruce Zhao" ` +
      `--set-version-string "LegalCopyright" "Copyright © 2026 Bruce Zhao" ` +
      `--set-version-string "LegalTrademarks" "MIT License" ` +
      `--set-file-version "${version}" ` +
      `--set-product-version "${version}" ` +
      `--set-icon "${iconPath}"`)
    console.log('[after-pack] Version info and icon updated successfully')
  } catch (err) {
    console.error('[after-pack] Failed to update version info:', err.message)
  }
}
