window.onresize = window.onload = function() {
  resize();
}

function resize() {
  var img    = document.getElementsByTagName('img')[0];
  winDim = getWinDim();

  img.style.height = winDim.y + "px";
  img.style.width = null;
  if (img.offsetWidth > winDim.x) {
    img.style.height = null;
    img.style.width = winDim.x + "px";
  }
}

function getWinDim() {
  var body = document.documentElement || document.body;
  return {
    x: window.innerWidth  || body.clientWidth,
    y: window.innerHeight || body.clientHeight
  }
}
