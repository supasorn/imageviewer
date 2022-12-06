const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const path = require('path');
const express = require('express');
const process = require('process');
const globp = require('glob-promise')
const fs = require('fs');
const os = require('os');
// const imagesize = require('image-size');
const bodyParser = require('body-parser');


// let root='/home/supasorn/neodpm/';
let root='/data/pakkapon/eg3d-main/eg3d/';
if (process.argv.length > 2) {
  root = process.argv[2];
  if (root.at(-1) != '/')
    root += '/';
}
var resq = [];

console.log("set root=", root);
// open livereload high port and start to watch public directory for changes
const liveReloadServer = livereload.createServer();
liveReloadServer.watch([root, os.homedir()]);
// ping browser on Express boot, once browser has reconnected and handshaken
liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});

const app = express();

// monkey patch every served HTML so they know of changes
// app.use(bodyParser.urlencoded());
app.use(express.json());
app.use(connectLivereload());
app.set('view engine', 'ejs');
app.use(express.static(root));
app.use('/static', express.static(path.join(__dirname, 'public')))
app.use('/imshow', express.static(path.join(os.homedir(), 'tmp_imshow')))

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
app.use('/subscribe', async(req, res) => {
  resq.push(res);
  console.log("newsubscribe");
  // console.log(resq);
});

app.use('/screen', async(req, res) => {
  res.render('screen', {});
});

app.use('/load_windows', async(req, res) => {
  const path = 'screen.json_dat';
  let json = null;
  if (fs.existsSync(path)) {
    let rawdata = fs.readFileSync(path);
    json = JSON.parse(rawdata);
    console.log(json);
    res.send(json);
    res.end();
  }

});

app.use('/finder/', async(req, res) => {
  let urlpath = req.path;
  if (urlpath[urlpath.length - 1] != '/')
    urlpath = urlpath + '/';

  console.log("finder: ", urlpath);
  // console.log(path.join(root, urlpath, '/*/'));

  const sdir = await globp(`${root}/${urlpath}/*/`);

  let smedia = await globp(`${root}/${urlpath}/*.{png,jpg,mp4}`, {nodir: true});
  smedia = sortByModifiedTime(smedia);

  const sfile = await globp(`${root}/${urlpath}/!(*.png|*.jpg|*.mp4)`, {nodir: true});
  const s = sdir.concat(smedia, sfile);
  // let rawimglist = smedia.map(x => ({fullpath: x.replace(root, ""), basename: path.basename(x)}));
  let rawimglist = s.map(x => ({fullpath: x.replace(root, ""), basename: path.basename(x)}));

  res.render('finder', 
    {list: s.map (x => x.replace(path.join(root, urlpath), "")),
     path: urlpath.split("/"),
     rawimglist
    }, (err, html) => {
    res.status(200).send({html, "path": urlpath});
  });
});

// unused
app.use('/directory/', async(req, res) => { 
  let urlpath = req.path;
  if (urlpath[urlpath.length - 1] != '/')
    urlpath = urlpath + '/';

  console.log("directory: ", urlpath);
  // console.log(path.join(root, urlpath, '/*/'));

  const sdir = await globp(`${root}/${urlpath}/*/`);

  let smedia = await globp(`${root}/${urlpath}/*.{png,jpg,mp4}`, {nodir: true});
  smedia = sortByModifiedTime(smedia);

  const sfile = await globp(`${root}/${urlpath}/!(*.png|*.jpg|*.mp4)`, {nodir: true});
  const s = sdir.concat(smedia, sfile);

  // res.send({"path": urlpath, "data": s.map(x => path.basename(x)) });
  res.send({"path": urlpath, "ls": s.map (x => x.replace(path.join(root, urlpath), "")) });
  res.end();

});
app.post('/save_window', async(req, res) => {
  // console.log("data");
  // console.log(req.body);
  const path = 'screen.json_dat';
  console.log("/save_window");
  // console.log("/save_window" + JSON.stringify(req.body));
  // const jsonString = JSON.stringify(json);
  fs.writeFileSync(path, JSON.stringify(req.body));
  res.send(req.body);
  res.end();
});
app.use('/add_window', async(req, res) => {
  console.log("/add_window" + req.query.path);
  resq.forEach((rs) => {
    const rand = Math.random().toString(16).substr(2, 8);
    rs.send({
      "id": rand,
      "path": req.query.path,
    });
    rs.end();
  });
  resq = [];
  res.send("done");
  res.end();
  // const path = 'window.json';
  // let json = null;
  // if (fs.existsSync(path)) {
    // console.log("in");
    // let rawdata = fs.readFileSync(path);
    // json = JSON.parse(rawdata);
    // console.log("json", json);
    // json = [{"id": 1}, {"id": 2}]
  // }
  // const jsonString = JSON.stringify(json);
  // fs.writeFileSync(path, jsonString)
});


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


