var isMouseDown = false;
var previewSize = -1;

$(document).ready(function(){
  let $panelOne = $(".panel.one");
  let $panelTwo = $(".panel.two");
  let $panelContainer = $panelOne.parent();
  function resize(width) {
    if (width < 0)
      width = localStorage.getItem("width");
    if (width == null)
      width = 20; 
    localStorage.setItem("width", width);
    $panelOne.css({ width: width + "%" });
    $panelTwo.css({ width: 100 - width + "%" });


    if (previewSize < 0) 
      previewSize = localStorage.getItem("width" + "_" + window.location.pathname);
    if (previewSize == null) 
      previewSize = 200;
    localStorage.setItem("width" + "_" + window.location.pathname, previewSize);

    $(".preview").height(previewSize + "px");
    $("img").css({
      "maxHeight":previewSize + "px",
      "maxWidth":previewSize + "px",
      "width": previewSize + "px",
    });
    $("#mainviewer").css('display', 'flex');
    $(".slider").show();
  }

  function mouseMoveHandler(e) {
    if (!isMouseDown) return;

    var clientX = e.clientX || (e.touches && e.touches[0].clientX);
    if(isNaN(clientX))
      return;

    let width = (clientX / $panelContainer.width()) * 100;
    width = width < 0 ? 0 : width;
    resize(width);
    // don't allow a value that's smaller than zero;
  }
  $(".slider").on("mousedown touchstart", function() {
    !isMouseDown && $panelContainer.on("mousemove touchmove", mouseMoveHandler);
    isMouseDown = true;
  });

  $(window).on("mouseup touchend", function() {
    isMouseDown = false;
    $panelContainer.off("mousemove touchmove");
  });

  resize(-1);

  function setItemSize(direction) {
    let exp = Math.round(Math.log(previewSize / 200.0) / Math.log(0.9));
    exp += direction;
    previewSize = 200 * Math.pow(0.9, exp);
    console.log(previewSize);
    resize(-1);
  }

  $("#size_decrease").click(function(e) {
    setItemSize(1);
  });
  $("#size_increase").click(function(e) {
    setItemSize(-1);
  });

  $("a.apreview").click(function(e) {
    let img = $(this).children("img");
    let w = img[0].naturalWidth;
    let h = img[0].naturalHeight;
    window.open($(this).attr("href"), "_blank", `width=${w},height=${h},location=no,status=no,titlebar=no`);
    new WinBox({
      class: "modern",
      width: w + "px",
      height: h + "px",
      title: $(this).attr("imgpath"),
      border: "2px solid #555555",
      html: `<img src="/${$(this).attr("imgpath")}" class="content">`,
      onresize: function(width, height) {
        let img = this.window.getElementsByClassName("content")[0];

        img.style.height = height + "px";
        img.style.width = null;
        if (img.offsetWidth > width) {
          img.style.height = null;
          img.style.width = width + "px";
        }
      },

    });
    return false;
  });

});
