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


let root = '/';
// let root='/data/pakkapon/eg3d-main/eg3d/';
if (process.argv.length > 2) {
  root = process.argv[2];
  if (root.at(-1) != '/')
    root += '/';
}
var resq = [];

console.log("set root=", root);
// open livereload high port and start to watch public directory for changes
const liveReloadServer = livereload.createServer();
// liveReloadServer.watch([root, os.homedir()]);
liveReloadServer.watch(["/data/supasorn", "/home2/supasorn", "/data2/supasorn", os.homedir()]);
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
    if (i[i.length - 1] == '/') {
      cls = "a_dir";
      pre = "/browse";
    } else if (path.extname(i) == ".mp4") {
      cls = "a_video";
    } else if (path.extname(i) == ".jpg" || path.extname(i) == ".png" || path.extname(i) == ".JPG") {
      cls = "a_img";
    }
    out += `<a class='${cls}' href='${pre}/${i.replace(root, "")}'>${path.basename(i)}</a><br>`;
  }
  return out;
}

function sortByModifiedTime(files) {
  return files.map(function(fileName) {
    return {
      name: fileName,
      time: fs.statSync(fileName).mtime.getTime()
    };
  })
    .sort(function(a, b) {
      return b.time - a.time;
    })
    .map(function(v) {
      return v.name;
    });
}
app.use('/subscribe', async (req, res) => {
  resq.push(res);
  console.log("newsubscribe");
  // console.log(resq);
});

app.use('/screen', async (req, res) => {
  const path = 'fav.txt';
  if (fs.existsSync(path)) {
    let rawdata = fs.readFileSync(path);
    favs = rawdata.toString().split("\n");
    // remove empty lines
    favs = favs.filter(x => x != "");
  }

  res.render('screen',
    {
      favs: favs
    });
});

app.use('/load_windows', async (req, res) => {
  const path = 'screen.json_dat';
  let json = null;
  if (fs.existsSync(path)) {
    let rawdata = fs.readFileSync(path);
    json = JSON.parse(rawdata);
    console.log("/load_windows" + JSON.stringify(json));

    res.send(json);
    res.end();
  }
});

app.use('/finder/', async (req, res) => {
  let urlpath = req.path;
  if (urlpath[urlpath.length - 1] != '/')
    urlpath = urlpath + '/';

  console.log("finder: ", urlpath);
  // console.log(path.join(root, urlpath, '/*/'));

  const sdir = await globp(`${root}/${urlpath}/*/`);

  let smedia = await globp(`${root}/${urlpath}/*.{png,jpg,JPG,mp4}`, { nodir: true });
  smedia = sortByModifiedTime(smedia);

  const sfile = await globp(`${root}/${urlpath}/!(*.png|*.jpg|*.JPG|*.mp4)`, { nodir: true });
  const s = sdir.concat(smedia, sfile);
  // let rawimglist = smedia.map(x => ({fullpath: x.replace(root, ""), basename: path.basename(x)}));
  let rawimglist = s.map(x => ({ fullpath: x.replace(root, ""), basename: path.basename(x) }));

  const num_folders = sdir.length;
  const num_images = smedia.length;
  const num_files = sfile.length;

  res.render('finder',
    {
      list: s.map(x => x.replace(path.join(root, urlpath), "")),
      path: urlpath.split("/"),
      rawimglist,
      info: `${num_images} imgs`,
    }, (err, html) => {
      res.status(200).send({ html, "path": urlpath });
    });
});

// unused
app.use('/directory/', async (req, res) => {
  let urlpath = req.path;
  if (urlpath[urlpath.length - 1] != '/')
    urlpath = urlpath + '/';

  console.log("directory: ", urlpath);
  // console.log(path.join(root, urlpath, '/*/'));

  const sdir = await globp(`${root}/${urlpath}/*/`);

  let smedia = await globp(`${root}/${urlpath}/*.{png,jpg,JPG,mp4}`, { nodir: true });
  smedia = sortByModifiedTime(smedia);

  const sfile = await globp(`${root}/${urlpath}/!(*.png|*.jpg|*.JPG|*.mp4)`, { nodir: true });
  const s = sdir.concat(smedia, sfile);

  // res.send({"path": urlpath, "data": s.map(x => path.basename(x)) });
  res.send({ "path": urlpath, "ls": s.map(x => x.replace(path.join(root, urlpath), "")) });
  res.end();

});
app.post('/save_window', async (req, res) => {
  // console.log("data");
  // console.log(req.body);
  const file = 'screen.json_dat';
  console.log("/save_window");

  // loop over path in each window, and prepend root
  // req.body.forEach(item => {
  // if (item.path) {
  // item.path = path.join(__dirname, root, item.path);
  // }
  // });
  console.log(req.body);

  fs.writeFileSync(file, JSON.stringify(req.body));
  res.send(req.body);
  res.end();
});
app.use('/add_window', async (req, res) => {
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

app.use('/send_to_mbp', async (req, res) => {
  console.log("/send_to_mbp" + req.query.path);

  let p = path.join(root, req.query.path);
  // run system command
  cmd = `scp ${p} $(if [ -s ~/ssh_client_info.txt ]; then cat ~/ssh_client_info.txt | awk '\{ print $1 \}'; else echo $SSH_CLIENT | awk '\{ print $1 \}'; fi):/Users/supasorn/Downloads`;

  // issue system command "cmd"
  const { exec } = require("child_process");
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      res.send("error");
      res.end();
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      res.send("error");
      res.end();
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
  res.send("done");
  res.end();
});

app.use('/rm', async (req, res) => {
  console.log("/rm " + req.query.path);
  // delete the file given by req.query.path;
  let p = path.join(root, req.query.path);

  // only allows deleting images
  if (path.extname(p) == ".jpg" || path.extname(p) == ".png" || path.extname(p) == ".JPG") {
    if (fs.existsSync(p))
      fs.unlinkSync(p);
  }
  res.send("done");
  res.end();
});

app.use('/get_media_list', async (req, res) => {
  console.log("/get_media_list " + req.query.path);
  // p is the parent directory of the image
  let p = path.dirname(path.join(root, req.query.path));
  let smedia = await globp(`${p}/*.{png,jpg,JPG,mp4}`, { nodir: true });
  smedia = sortByModifiedTime(smedia);
  smedia = smedia.map(x => x.replace(root, ""));
  res.send(smedia);
  res.end();
});


app.use('/browse', async (req, res) => {
  const fl = req.query.fl;
  const urlpath = req.path;
  console.log("path", urlpath);
  const sdir = await globp(`${root}/${urlpath}/*/`);

  let smedia = await globp(`${root}/${urlpath}/*.{png,jpg,JPG,mp4}`, { nodir: true });
  smedia = sortByModifiedTime(smedia);

  const sfile = await globp(`${root}/${urlpath}/!(*.png|*.jpg|*.JPG|*.mp4)`, { nodir: true });
  const s = sdir.concat(smedia, sfile);
  const filelist = printFileList(urlpath, s);

  rawimglist = smedia.map(x => ({ fullpath: x.replace(root, ""), basename: path.basename(x) }));
  //rawimglist = smedia.map(x => path.basename(x));
  res.render('index', { content: filelist, rawimglist });
});


app.use('/', (req, res) => { res.redirect('/browse'); });

app.listen(1234)


