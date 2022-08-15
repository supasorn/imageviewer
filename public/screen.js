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
    $(".mywindow").each(function(k ,v) {
      if ($(v).attr('id') != "template") {

        const of = $(v).offset(); 
        data.push({
          "x": of.left, 
          "y": of.top, 
          "w": $(v).width(), 
          "h": $(v).height(),
          "path": $(v).data("path"),
          "min": false,
          "max": false,
        });
      }
    });
    $.ajax({
      url: '/save_window',
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      complete: function(data) {
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

  function findEmptyXY() {
    for (let i = 50; 1; i+=50) {
      let conflict = 0;
      $(".mywindow").each(function() {
        console.log($(this).offset().left, $(this).offset().top);
        if (Math.abs($(this).offset().left - i) < 50 || Math.abs($(this).offset().top - i) < 50) {
          conflict = 1;
          return false;
        }
      });
      if (!conflict)
        return [i, i];
    }
    return [0, 0];
  }

  function topZIndex() {
    let mx = 0;
    $(".mywindow").each(function() {
      if (parseInt($(this).css("z-index")) > mx)
        mx = parseInt($(this).css("z-index"));
    });
    return mx;
  }

  function createWindow(opts) {
    let nwin = $("#template").clone().removeAttr('id');
    $("#template").after(nwin);

    nwin.data("path", opts["path"]);
    nwin.find(".title").html(opts["path"]);

    let ext = opts["path"].split(".");
    console.log(ext);
    if (ext.length == 1) {
      opts["type"] = "finder"
      nwin.data("type", "finder");
      nwin.data("fixed_aspect", false);
    } else if (ext[1] == "png") {
      opts["type"] = "image"
      nwin.data("type", "image");
      nwin.data("fixed_aspect", true);
    }
    console.log(opts["type"]);

    nwin.css("left", opts["x"]);
    nwin.css("top", opts["y"]);
    if (opts["type"] == "image") {
      var image = new Image();
      image.onload = function() {
        this.setAttribute("class", "imgcontent");
        this.setAttribute("draggable", "false");
        nwin.data("nw", this.naturalWidth);
        nwin.data("nh", this.naturalHeight);

        if (opts["x"] === undefined || opts["y"] == undefined) {
          [opts["x"], opts["y"]] = findEmptyXY();
        } 

        nwin.css("width", opts["w"] || nwin.data("nw") + "px");
        nwin.css("height", (opts["h"] || nwin.data("nh")) + 20 + "px");
        nwin.show();
      }
      image.src = "/" + opts["path"];
      nwin.find(".content").append(image);
    } else if (opts["type"] == "finder") {
      function updateFinder() {
        $.get("/directory" + nwin.data("path"), function(data, status) {
          let html = "<ul>";
          html += `<li><a href='#' class="finder_folder">../</a></li>`;
          for (let i in data["ls"])
            html += `<li><a href="#" class="finder_folder">${data["ls"][i]}</a></li>`
          html += "</ul>";
          nwin.find(".content").html(html);
          nwin.find(".content").css("height", "calc(100% - 20px)");
          nwin.find(".content").css("overflow", "scroll");
          // let json = JSON.parse(data);
          // console.log(data);
          // console.log(json);
          nwin.css("width", "500px");
          nwin.css("height", "500px");
          nwin.show();
          nwin.find(".finder_folder").click(function(e) {
            nwin.data("path", nwin.data("path") + $(this).text());
            console.log(nwin.data("path"));
            updateFinder();
            // alert("click");
            e.preventDefault();
          });
        });
      }
      updateFinder();
    }
    nwin.css("z-index", topZIndex() + 1);
  }

  function createWindowFromImage(imagepath) {
    createWindow({"path": imagepath, "fixed_aspect": true});
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
      // createWindow(json);
      createWindowFromImage(json["path"]);
      refresh();
      await subscribe();
    }
  }

  function IsOnBorder(e, element) {
    var offset = $(element).offset(); 
    var relX = e.pageX - offset.left;
    var relY = e.pageY - offset.top; 

    const SIZE = 7;
    let px = "", py = "";
    if (relX < SIZE && !$(element).data("fixed_aspect")) 
      px = "w";
    else if (relX > $(element).width() - SIZE) 
      px = "e";

    if (relY < SIZE && !$(element).data("fixed_aspect") && false)  
      py = "n";
    else if (relY > $(element).height() - SIZE) 
      py = "s";
    return [px, py, relX, relY];
  }

  function refresh() {
    $(".mywindow").mousedown(function(e) {
      [lpx, lpy, relX, relY] = IsOnBorder(e, this);
      const of = $(this).offset();
      lastx = of.left;
      lasty = of.top;
      lastw = $(this).width();
      lasth = $(this).height();
      lastmx = e.pageX;
      lastmy = e.pageY;
      $(this).css("z-index", topZIndex() + 1);
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
    $(".button_close").click(function() {
      $(this).closest(".mywindow").remove();
      saveWindows();
    });
    $(".mywindow").mousemove(function(e) {
      const [px, py, relX, relY] = IsOnBorder(e, this);
      if (px == "" && py == "") { 
        if ($(this).data("type") == "finder") {
          if (relY < 20)
            $(this).css("cursor", "move");
          else
            $(this).css("cursor", "auto");
        } else {
          $(this).css("cursor", "move");
        }
      } else if (px != "" && py =="")
        $(this).css("cursor", "ew-resize");
      else if (px == "" && py != "") 
        $(this).css("cursor", "ns-resize");
      else if ((px == "e" && py == "n") || (px == "w" && py == "s"))
        $(this).css("cursor", "nesw-resize");
      else
        $(this).css("cursor", "nwse-resize");
    });
    $(document).mousemove(function(e) {
      if (action == 1) {
        awin.css({
          "left": lastx + (e.pageX - lastmx),
          "top": lasty + (e.pageY - lastmy)
        });
      } else if (action == 2) {
        // console.log("action2");
        

        const MINW = 100;
        const MINH = 40;
        if (awin.data("fixed_aspect")) {
          console.log("a");
          if (lpx == 'e' && lastw + (e.pageX - lastmx) >= MINW) {
            awin.css("width", lastw + (e.pageX - lastmx));
            awin.css("height", awin.width() * awin.data("nh") / awin.data("nw") + 20);
          } else if (lpy == 's' && lasth + (e.pageY - lastmy) >= MINH) {
            awin.css("height", lasth + (e.pageY - lastmy));
            awin.css("width", (awin.height() - 20) * awin.data("nw") / awin.data("nh"));
          }
        } else {
          console.log("b");
          if (lpx == 'w' && lastw + lastmx - e.pageX >= MINW) {
            awin.css("width", lastw + (lastmx - e.pageX));
            awin.css("left", lastx + (e.pageX - lastmx));
          } else if (lpx == 'e' && lastw + (e.pageX - lastmx) >= MINW) {
            awin.css("width", lastw + (e.pageX - lastmx));
          }
          if (lpy == 'n' && lasth + (lastmy - e.pageY) >= MINH) {
            awin.css("height", lasth + (lastmy - e.pageY));
            awin.css("top", lasty + (e.pageY - lastmy));
          } else if (lpy == 's' && lasth + (e.pageY - lastmy) >= MINH) {
            awin.css("height", lasth + (e.pageY - lastmy));
          }
        }
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
    // createWindow({"path": "/"});
    refresh();

  });
