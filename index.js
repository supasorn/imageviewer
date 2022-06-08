const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const path = require('path');
const express = require('express');
const process = require('process');
const globp = require('glob-promise')
const fs = require('fs').promises;

let root='/home/supasorn/neodpm/';
if (process.argv.length == 3) {
  root = process.argv[2]
}
console.log("set root=", root);
// open livereload high port and start to watch public directory for changes
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(root);
// ping browser on Express boot, once browser has reconnected and handshaken
liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});

const app = express();

// monkey patch every served HTML so they know of changes
app.use(connectLivereload());
app.set('view engine', 'ejs');
app.use(express.static(root));

function getLRScript() {
  return `<script>
  document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] +
  ':35729/livereload.js?snipver=1"></' + 'script>')
</script>`;
}

app.use('/live/', (req, res) => {
  console.log(req.path);
  out = "";
  if (path.extname(req.path) == ".mp4")
    out += `<video loop src='${req.path}' autoplay muted></video>`;
  else
    out += `<img src='${req.path}'>`;
  out += getLRScript(); 
  res.send(out);
});

function printFileList(lst) {
  let out = "";
  for (const i of lst) {
    let cls = "a_file";
    let pre = "";
    if (i[i.length-1] == '/') {
      cls = "a_dir";
      pre = "/browse"; 
    }
    out += `<a class='${cls}' href='${pre}/${i.replace(root, "")}'>${i.replace(root, "")}</a><br>`;
  }
  return out;
}

app.use('/browse', async(req, res) => {
  const fl = req.query.fl;
  const path = req.path;
  console.log("path", path);
  const sdir = await globp(`${root}/${path}/*/`);
  const sfile = await globp(`${root}/${path}/*`, {nodir: true});
  const s = sdir.concat(sfile);

  const filelist = printFileList(s);

  let rawimglist = await globp(`${root}${path}*.{png,jpg,mp4}`);
  rawimglist = rawimglist.map(x => x.replace(root, ""));
  //res.send("yes");
  res.render('index', {content: filelist, rawimglist});
});


app.listen(1234)


