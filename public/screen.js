  var windows = [];
  function showMessage(message) {
    // document.body.innerHTML += message;
  }
  var timer;
  var lastx, lasty, lastw, lasth;
  var lpx, lpy;

  var lastmx, lastmy;
  var awin; // active window
  var action;

  function saveWindows() {
    let data = [];
    // for (i in windows) {
      // const w = windows[i];
      // data.push({
        // "x": w.x, "y": w.y, 
        // "w": w.width, 
        // "h": w.height,
        // "title": w.title,
        // "min": w.min,
        // "max": w.max
      // });
    // }
    console.log("HERE");
    $(".mywindow").each(function(k ,v) {
      if ($(v).attr('id') != "template") {

        const of = $(v).offset(); 
        data.push({
          "x": of.left, 
          "y": of.top, 
          "w": $(v).width(), 
          "h": $(v).height(),
          "title": $(v).find(".title").text(),
          "min": false,
          "max": false
        });
      }
    });
    console.log(JSON.stringify(data));
    $.ajax({
      url: '/save_window',
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      complete: function(data) {
        console.log("JSON return");
        console.log(data.responseJSON)
      }
    });
  }
  function saveWindowTimer() {
    clearTimeout(timer);
    timer = setTimeout(function(){ 
      saveWindows();
    }, 100);
  }

  function addNewWindow(json) {
    createWindow(json);
    return;
    console.log("addnewwindow", json);
    windows.push(new WinBox({
      class: ["no-full", "no-animation", "no-shadow"],
      x: json["x"] || 100,
      y: json["y"] || 100,
      width: json["w"] + "px",
      height: (parseInt(json["h"]) + 20) + "px",
      title: json["title"],
      max: json["max"] || false,
      border: "2px solid #555555",
      html: `<img src="/${json["title"]}" class="content" draggable="false">`,
      onresize: function(width, height) {
        let img = this.window.getElementsByClassName("content")[0];
        this.height = this.width * json["h"] / json["w"] + 20;
        saveWindowTimer();
      },
      onmove: saveWindowTimer,
      onmaximize: saveWindowTimer,
      onminimize: saveWindowTimer,
      onclose: function() {
        windows = windows.filter((v) => {return v != this;});
        saveWindowTimer();
      },
      oncreate: function() {
        // this.move();
        setTimeout(() => {
          this.minimize(json["min"] || false);
        }, 1000);
      }
    }));
      
  }

  function createWindow(opts) {
    let nwin = $("#template").clone().removeAttr('id');
    $("#template").after(nwin);
    nwin.find(".content").html(`<img src="/${opts["title"]}" class="imgcontent" draggable="false">`,);
    nwin.find(".title").html(opts["title"]);
    nwin.css({
      "left": opts["x"],
      "top": opts["y"],
      "width": opts["w"] + "px",
      "height": parseInt(opts["h"] + 20) + "px"});
  }

  async function subscribe() {
    let response = await fetch("/subscribe?rand="+Math.random());

    if (response.status == 502) { // connection timeout
      await subscribe();
    } else if (response.status != 200) { // error
      showMessage(response.statusText);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await subscribe();
    } else {
      let message = await response.text();
      let json = JSON.parse(message);
      showMessage(json);
      // addNewWindow(json);
      createWindow(json);
      refresh();
      await subscribe();
    }
  }

  function IsOnBorder(e, element) {
    var offset = $(element).offset(); 
    var relX = e.pageX - offset.left;
    var relY = e.pageY - offset.top; 

    const SIZE = 10;
    let px = "", py = "";
    if (relX < SIZE) 
      px = "w";
    else if (relX > $(element).width() - SIZE) 
      px = "e";

    if (relY < SIZE) 
      py = "n";
    else if (relY > $(element).height() - SIZE) 
      py = "s";
    return [px, py];
  }

  function refresh() {
    $(".mywindow").mousedown(function(e) {
      [lpx, lpy] = IsOnBorder(e, this);
      const of = $(this).offset();
      lastx = of.left;
      lasty = of.top;
      lastw = $(this).width();
      lasth = $(this).height();
      lastmx = e.pageX;
      lastmy = e.pageY;
      $(this).css("z-index", 99999);
      awin = $(this);
      if (lpx == "" && lpy == "") {
        action = 1;
      } else {
        action = 2;
      }
    });
    $(".mywindow").mouseup(function(e) {
      action = 0;
    });
    $(document).mouseup(function(e) {
      action = 0;
    });
    $(".mywindow").mousemove(function(e) {
      const [px, py] = IsOnBorder(e, this);
      if (px != "" || py != "")
        $(this).css("cursor", py + px + "-resize");
      else
        $(this).css("cursor", "move");
    });
    $(document).mousemove(function(e) {
      if (action == 1) {
        awin.css({
          "left": lastx + (e.pageX - lastmx),
          "top": lasty + (e.pageY - lastmy)
        });
      } else if (action == 2) {
          console.log(lpx, lpy);
        if (lpx == 'w') {
          awin.css("width", lastw + (lastmx - e.pageX));
          awin.css("left", lastx + (e.pageX - lastmx));
        } else if (lpx == 'e') {
          awin.css("width", lastw + (e.pageX - lastmx));
        }
        if (lpy == 'n') {
          awin.css("height", lasth + (lastmy - e.pageY));
          awin.css("top", lasty + (e.pageY - lastmy));
        } else if (lpy == 's') {
          awin.css("height", lasth + (e.pageY - lastmy));
        }
        // awin.css({
        //   "width": lastx + (e.pageX - lastmx),
        //   "top": lasty + (e.pageY - lastmy)
        // });
      }
      if (action != 0) {
        saveWindowTimer();
      }
    });
  }
  $(function() {
    $.ajax({
      url: '/load_windows',
      type: "POST",
      contentType: "application/json",
      complete: function(data) {
        console.log("total windows", data.responseJSON.length);
        data.responseJSON.forEach((w) => {
          w["h"] -= 20;
          // addNewWindow(w);
          createWindow(w);
        });
        refresh();
      }
    });
    subscribe();
    refresh();

  });
