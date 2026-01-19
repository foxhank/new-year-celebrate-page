const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect('/index.html?name=新年快乐');
});

app.get('/greet/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  res.redirect(`/index.html?name=${encodeURIComponent(name)}`);
});

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`访问 http://localhost:${port}/greet/你的名字 来查看祝福`);
});
