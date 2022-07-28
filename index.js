const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const path = require('path');
const express = require('express');
const process = require('process');
const globp = require('glob-promise')
const fs = require('fs');

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
app.use('/static', express.static(path.join(__dirname, 'public')))

function getLRScript() {
  return `<script>
  document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] +
  ':35729/livereload.js?snipver=1"></' + 'script>')
</script>`;
}


app.use('/live/', (req, res) => {
  console.log(req.path);
  out = "<style>body{margin: 0; text-align: center;background-color:#333333;}</style>";
  out += "<script src='/static/image_resizer.js'></script>";
  if (path.extname(req.path) == ".mp4")
    out += `<video loop src='${req.path}' autoplay muted></video>`;
  else
    out += `<img src='${req.path}'>`;
  out += getLRScript(); 
  res.send(out);
});

function printFileList(urlpath, lst) {
  let out = `<span class="urlpath">${urlpath}</span><br>`;
  out += "<a class='a_dir' href='../'>Up One Level..</a><br>";
  for (const i of lst) {
    let cls = "a_file";
    let pre = "";
    if (i[i.length-1] == '/') {
      cls = "a_dir";
      pre = "/browse"; 
    } else if (path.extname(i) == ".mp4") {
      cls = "a_video";
    } else if (path.extname(i) == ".jpg" || path.extname(i) == ".png") {
      cls = "a_img";
    }
    out += `<a class='${cls}' href='${pre}/${i.replace(root, "")}'>${path.basename(i)}</a><br>`;
  }
  return out;
}

function sortByModifiedTime(files) {
  return files.map(function (fileName) {
    return {
      name: fileName,
      time: fs.statSync(fileName).mtime.getTime()
    };
  })
  .sort(function (a, b) {
    return b.time - a.time; })
  .map(function (v) {
    return v.name; });
}

app.use('/browse', async(req, res) => {
  const fl = req.query.fl;
  const urlpath = req.path;
  console.log("path", urlpath);
  const sdir = await globp(`${root}/${urlpath}/*/`);

  let smedia = await globp(`${root}/${urlpath}/*.{png,jpg,mp4}`, {nodir: true});
  smedia = sortByModifiedTime(smedia);

  const sfile = await globp(`${root}/${urlpath}/!(*.png|*.jpg|*.mp4)`, {nodir: true});
  const s = sdir.concat(smedia, sfile);
  const filelist = printFileList(urlpath, s);

  rawimglist = smedia.map(x => ({fullpath: x.replace(root, ""), basename: path.basename(x)}));
  //rawimglist = smedia.map(x => path.basename(x));
  res.render('index', {content: filelist, rawimglist});
});


app.use('/', (req, res) => { res.redirect('/browse'); });

app.listen(1234)


