#!/usr/bin/env node

/**
 * DeepSeek Harness RTL & Vazirmatn Typography Patcher
 * 
 * In memory of Saber Rastikerdar (creator of Vazirmatn font)
 * Inspired by Antigravity-RTL & Claude-RTL-Patcher
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// CSS rules for Persian/Arabic RTL & Hybrid Font Pairing
const CSS_INJECTION = `
@import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Vazirmatn:wght@300;400;500;600;700&display=swap');

* {
  font-family: 'Inter', 'Vazirmatn', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, "PingFang SC", "Microsoft YaHei", sans-serif !important;
}

/* Smart bidirectional text & alignment for chat, markdown, headers, and inputs */
p, li, span, div, h1, h2, h3, h4, h5, h6, textarea, input, label, blockquote {
  unicode-bidi: plaintext !important;
  text-align: start !important;
}

/* Code & Monospace: Geist Mono (Primary), JetBrains Mono, Vazirmatn, monospace */
code, pre, pre *, code *, kbd, samp, var,
[data-diff], [data-diff] *,
[data-read], [data-read] *,
[data-search], [data-search] *,
[data-terminal], [data-terminal] *,
.monospace, .shiki, .shiki *,
.xterm, .xterm * {
  font-family: 'Geist Mono', 'JetBrains Mono', 'Vazirmatn', Menlo, Monaco, Consolas, "Fira Code", monospace !important;
  direction: ltr !important;
  unicode-bidi: normal !important;
  text-align: left !important;
}
`;

// Client-side JS injector for desktop Electron window & web UI
const JS_INJECTION = `
// RTL & Vazirmatn Font Injector - DeepSeek Harness Persian RTL
(function() {
  function injectPersianRTL() {
    if (document.getElementById('persian-rtl-vazirmatn-style')) return;
    const style = document.createElement('style');
    style.id = 'persian-rtl-vazirmatn-style';
    style.textContent = ${JSON.stringify(CSS_INJECTION)};
    (document.head || document.documentElement).appendChild(style);

    // Auto set dir="auto" on input fields and textareas for natural cursor positioning
    function setupDirAuto(el) {
      if (!el.getAttribute('dir')) {
        el.setAttribute('dir', 'auto');
      }
    }
    document.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach(setupDirAuto);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            if (node.matches && node.matches('textarea, input[type="text"], input:not([type])')) {
              setupDirAuto(node);
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach(setupDirAuto);
            }
          }
        }
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', injectPersianRTL);
  } else {
    injectPersianRTL();
  }
})();
`;

function computeIntegrity(buffer) {
  const blockSize = 4 * 1024 * 1024;
  const blocks = [];
  for (let i = 0; i < buffer.length; i += blockSize) {
    const chunk = buffer.subarray(i, Math.min(i + blockSize, buffer.length));
    blocks.push(crypto.createHash('sha256').update(chunk).digest('hex'));
  }
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  return {
    algorithm: 'SHA256',
    hash,
    blockSize,
    blocks: blocks.length ? blocks : [hash]
  };
}

// Custom Pickle encoder matching Electron / Chromium specification
function createHeaderBuffers(headerJsonString) {
  const jsonBuf = Buffer.from(headerJsonString, 'utf8');
  const jsonLen = jsonBuf.length;
  const remainder = jsonLen % 4;
  const padding = remainder === 0 ? 0 : 4 - remainder;
  
  const payloadSize = 4 + jsonLen + padding;
  const hBuf = Buffer.alloc(4 + payloadSize);
  hBuf.writeUInt32LE(payloadSize, 0);
  hBuf.writeUInt32LE(jsonLen, 4);
  jsonBuf.copy(hBuf, 8);
  if (padding > 0) hBuf.fill(0, 8 + jsonLen, 8 + jsonLen + padding);
  
  const sBuf = Buffer.alloc(8);
  sBuf.writeUInt32LE(4, 0);
  sBuf.writeUInt32LE(hBuf.length, 4);
  return { sBuf, hBuf };
}

function getDefaultAsarPath() {
  const platform = os.platform();
  const home = os.homedir();
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return path.join(localAppData, 'Programs', 'DeepSeek Harness', 'resources', 'app.asar');
  } else if (platform === 'darwin') {
    return '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar';
  } else {
    // Linux paths
    const candidates = [
      '/opt/DeepSeek Harness/resources/app.asar',
      path.join(home, '.local', 'share', 'DeepSeek Harness', 'resources', 'app.asar')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }
}

function patchAsar(inputAsarPath, outputAsarPath) {
  if (!fs.existsSync(inputAsarPath)) {
    throw new Error(`File not found: ${inputAsarPath}`);
  }

  const fd = fs.openSync(inputAsarPath, 'r');
  const buf8 = Buffer.alloc(8);
  fs.readSync(fd, buf8, 0, 8, 0);
  const headerBufSize = buf8.readUInt32LE(4);
  const headerBuf = Buffer.alloc(headerBufSize);
  fs.readSync(fd, headerBuf, 0, headerBufSize, 8);
  const jsonLen = headerBuf.readUInt32LE(4);
  const headerJsonStr = headerBuf.toString('utf8', 8, 8 + jsonLen);
  const header = JSON.parse(headerJsonStr);
  const origBaseOffset = 8 + headerBufSize;

  let fileList = [];
  function collect(node, p = '') {
    if (node.offset !== undefined) {
      fileList.push({ path: p, node, origOffset: BigInt(node.offset), origSize: BigInt(node.size) });
    }
    if (node.files) {
      for (const [k, v] of Object.entries(node.files)) {
        collect(v, p ? p + '/' + k : k);
      }
    }
  }
  collect(header);
  fileList.sort((a, b) => Number(a.origOffset - b.origOffset));

  const replacements = new Map();

  function getFileContent(fileEntry) {
    const b = Buffer.alloc(Number(fileEntry.origSize));
    fs.readSync(fd, b, 0, b.length, origBaseOffset + Number(fileEntry.origOffset));
    return b;
  }

  // 1. Desktop preload script
  const preloadEntry = fileList.find(f => f.path === 'lib/preload-app.cjs');
  if (preloadEntry) {
    let content = getFileContent(preloadEntry).toString('utf8');
    const marker = '// RTL & Vazirmatn Font Injector';
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      content = content.substring(0, idx).trimEnd();
    }
    content += '\n' + JS_INJECTION + '\n';
    replacements.set(preloadEntry.path, Buffer.from(content, 'utf8'));
  }

  // 2. Web UI HTML
  const htmlEntry = fileList.find(f => f.path === 'dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/index.html');
  if (htmlEntry) {
    let content = getFileContent(htmlEntry).toString('utf8');
    content = content.replace(/<style id="persian-rtl-vazirmatn-style">[\s\S]*?<\/style>\s*/, '');
    const styleTag = `<style id="persian-rtl-vazirmatn-style">${CSS_INJECTION}</style>\n  </head>`;
    content = content.replace('</head>', styleTag);
    replacements.set(htmlEntry.path, Buffer.from(content, 'utf8'));
  }

  // 3. Web UI CSS
  const cssEntry = fileList.find(f => f.path.startsWith('dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-') && f.path.endsWith('.css'));
  if (cssEntry) {
    let content = getFileContent(cssEntry).toString('utf8');
    const marker = '/* Persian RTL & Vazirmatn */';
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      content = content.substring(0, idx).trimEnd();
    }
    content += '\n/* Persian RTL & Vazirmatn */\n' + CSS_INJECTION + '\n';
    replacements.set(cssEntry.path, Buffer.from(content, 'utf8'));
  }

  if (replacements.size === 0) {
    fs.closeSync(fd);
    return { alreadyPatched: true };
  }

  // Update sizes & integrity
  for (const [filePath, newBuf] of replacements.entries()) {
    const entry = fileList.find(f => f.path === filePath);
    entry.node.size = newBuf.length;
    entry.node.integrity = computeIntegrity(newBuf);
    entry.newBuf = newBuf;
  }

  // Recompute offsets
  let curOffset = 0n;
  for (const entry of fileList) {
    entry.node.offset = curOffset.toString();
    const size = entry.newBuf ? BigInt(entry.newBuf.length) : entry.origSize;
    curOffset += size;
  }

  const { sBuf, hBuf } = createHeaderBuffers(JSON.stringify(header));

  const outFd = fs.openSync(outputAsarPath, 'w');
  fs.writeSync(outFd, sBuf, 0, sBuf.length);
  fs.writeSync(outFd, hBuf, 0, hBuf.length);

  const CHUNK_SIZE = 16 * 1024 * 1024;
  const copyBuf = Buffer.alloc(CHUNK_SIZE);

  function copyRange(srcStart, length) {
    let remaining = Number(length);
    let curSrc = origBaseOffset + Number(srcStart);
    while (remaining > 0) {
      const toRead = Math.min(remaining, CHUNK_SIZE);
      const bytesRead = fs.readSync(fd, copyBuf, 0, toRead, curSrc);
      if (bytesRead === 0) break;
      fs.writeSync(outFd, copyBuf, 0, bytesRead);
      curSrc += bytesRead;
      remaining -= bytesRead;
    }
  }

  let i = 0;
  while (i < fileList.length) {
    const entry = fileList[i];
    if (entry.newBuf) {
      fs.writeSync(outFd, entry.newBuf, 0, entry.newBuf.length);
      i++;
    } else {
      let blockStart = entry.origOffset;
      let blockLength = entry.origSize;
      let j = i + 1;
      while (j < fileList.length && !fileList[j].newBuf && (fileList[j].origOffset === blockStart + blockLength)) {
        blockLength += fileList[j].origSize;
        j++;
      }
      copyRange(blockStart, blockLength);
      i = j;
    }
  }

  fs.closeSync(outFd);
  fs.closeSync(fd);

  return { alreadyPatched: false, replacementsCount: replacements.size };
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let asarPath = getDefaultAsarPath();
  let explicitPath = false;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      asarPath = args[i + 1];
      explicitPath = true;
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '--revert') {
      const bakPath = asarPath + '.bak';
      if (fs.existsSync(bakPath)) {
        fs.copyFileSync(bakPath, asarPath);
        console.log(`[✔] Restored original app.asar from backup: ${bakPath}`);
        process.exit(0);
      } else {
        console.error(`[✖] Backup not found at: ${bakPath}`);
        process.exit(1);
      }
    }
  }

  // If a clean backup exists and user didn't specify --path, use the pristine backup as input
  let inputAsar = asarPath;
  const defaultBak = asarPath + '.bak';
  if (!explicitPath && fs.existsSync(defaultBak)) {
    inputAsar = defaultBak;
  }

  if (!outputPath) {
    outputPath = path.join(path.dirname(asarPath), 'app.asar.patched');
  }

  console.log('====================================================');
  console.log('  DeepSeek Harness RTL & Custom Typography Patcher  ');
  console.log('  Dedicated to the memory of Saber Rastikerdar      ');
  console.log('====================================================');
  console.log(`Input:  ${inputAsar}`);
  console.log(`Target: ${asarPath}`);
  console.log(`Output: ${outputPath}`);

  try {
    const res = patchAsar(inputAsar, outputPath);
    console.log(`[✔] Successfully generated patched asar with ${res.replacementsCount} modified files.`);
  } catch (err) {
    console.error(`[✖] Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { patchAsar, getDefaultAsarPath };
