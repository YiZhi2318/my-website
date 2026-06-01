// 本地 GitHub Pages 代理服务器
// 通过本机代理 (127.0.0.1:443) 访问 GitHub Pages
// 访问: http://localhost:3000/my-website/

const http = require('http');
const https = require('https');

const PORT = 3000;
const TARGET = 'YiZhi2318.github.io';

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: 443,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, Host: TARGET, Connection: 'close' },
    rejectUnauthorized: false,
  };

  const proxy = https.request(options, (targetRes) => {
    // 修复内容类型以正确渲染
    const headers = { ...targetRes.headers };
    if (headers['content-type'] && headers['content-type'].includes('text/plain')) {
      headers['content-type'] = 'text/html; charset=utf-8';
    }
    res.writeHead(targetRes.statusCode, headers);
    targetRes.pipe(res);
  });

  proxy.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('代理错误: ' + e.message + '\n\n尝试: 关闭加速工具或修改 hosts 文件');
  });

  req.pipe(proxy);
});

server.listen(PORT, () => {
  console.log('==========================================');
  console.log('  ✅ 本地代理已启动！');
  console.log(`  🌐 访问: http://localhost:${PORT}/my-website/`);
  console.log('==========================================');
  console.log('  按 Ctrl+C 停止');
});
