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
        o = {
          "x": $(v).css("left"), 
          "y": $(v).css("top"), 
          "z-index": $(v).css("z-index"),
          "w": $(v).css("width"), 
          "h": $(v).css("height"),
          "path": $(v).data("path"),
          "min": $(v).css("visibility") == "hidden",
        };
        if ($(v).find(".slider").length) {
          o["slide"] = $(v).find(".finder_left").css("flex-basis");
        }
        data.push(o);
      }
    });
    // console.log("log", data[0].x, data[1].x);
    // console.log("log", data[0].x, data[1].x);
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

  function findEmptyXY() {
    for (let i = 50; 1; i+=30) {
      let conflict = 0;
      $(".mywindow").each(function() {
        if (Math.abs($(this).offset().left - i) < 30 && Math.abs($(this).offset().top - i) < 30) {
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
    if (ext.length == 1) {
      opts["type"] = "finder"
      nwin.data("type", "finder");
      nwin.data("fixed_aspect", false);
    } else if (ext[1] == "png") {
      opts["type"] = "image"
      nwin.data("type", "image");
      nwin.data("fixed_aspect", true);
    }

    if (opts["x"] === undefined || opts["y"] == undefined) {
      [opts["x"], opts["y"]] = findEmptyXY();
    } 
    nwin.css("left", opts["x"]);
    nwin.css("top", opts["y"]);

    console.log("POS", opts["w"], opts["h"]);

    function finishedLoading(nwin) {
      nwin.show();
      if (opts["min"]) {
        nwin.find(".button_min").click();
      } 
    }

    if (opts["type"] == "image") {
      var image = new Image();
      image.onload = function() {
        this.setAttribute("class", "imgcontent");
        this.setAttribute("draggable", "false");
        nwin.data("nw", this.naturalWidth);
        nwin.data("nh", this.naturalHeight);

        if (opts["w"] === undefined)
          nwin.css("width", nwin.data("nw") + "px");
        else
          nwin.css("width", opts["w"]);

        if (opts["h"] === undefined)
          nwin.css("height", (nwin.data("nh") + 20) + "px");
        else
          nwin.css("height", opts["h"]);
//         nwin.css("width", (opts["w"] || (nwin.data("nw") + "px");
//         nwin.css("height", (opts["h"] || nwin.data("nh")) + 20 + "px");
        finishedLoading(nwin);
      }
      image.src = "/" + opts["path"];
      nwin.find(".content").append(image);
    } else if (opts["type"] == "finder") {
      function updateFinder(path, save_windows=false) {
        console.log("fetch " + path + "," + (nwin.find(".finder_left").css("flex-basis") || opts["slide"]));
        $.get("/finder" + path, {"slide": nwin.find(".finder_left").css("flex-basis") || opts["slide"]}, function(data, status) {
          nwin.data("path", data["path"]);
          nwin.find(".title").text("Finder");
          nwin.find(".content").html(data["html"]);
          nwin.find(".finder_left").css("flex-basis", data["slide"])
          nwin.find(".panel").css("height", "calc(100% - 50px)");
          nwin.find(".content").css("user-select", "none");
          nwin.find(".apathbar").click(function(e) {
            console.log("pathbar", $(this).attr("href"));
            updateFinder($(this).attr("href"), true);
            e.preventDefault();
          });
          nwin.find(".finder_folder").click(function(e) {
            if ($(this).text().at(-1) == "/") {
              console.log(nwin.data("path"));
              updateFinder(nwin.data("path") + $(this).text(), true);
            } else {
              $.get("/add_window", {"path": data["path"].slice(1) + $(this).text()});
            }
            e.preventDefault();
          });
          nwin.find(".aopen").click(function(e) {
            createWindowFromImage($(this).attr("href"));
            refresh();
            e.preventDefault();
          });

          $(".slider").mousedown(function(e) {
            awin = $(this);
            lastmx = e.pageX;
            lastx = parseInt($(this).prev().css("flex-basis"));
            action = "slide";
            e.stopImmediatePropagation();
          });
          finishedLoading(nwin);
          if (save_windows)
            saveWindows();
        });
      }
      if (opts["w"] === undefined)
        nwin.css("width", "500px");
      else
        nwin.css("width", opts["w"]);

      if (opts["h"] === undefined)
        nwin.css("height", "520px");
      else
        nwin.css("height", opts["h"]);
      // nwin.css("width", (opts["w"] || 500) + "px");
      // nwin.css("height", (opts["h"] || 500) + 20 + "px");

      // nwin.find(".finder_left").css("flex-basis", (opts["slide"] || 200) + "px");
      updateFinder(nwin.data("path"));
    }

    if (opts["z-index"] === undefined)
      nwin.css("z-index", topZIndex() + 1);
    else
      nwin.css("z-index", opts["z-index"]);
  }

  function createWindowFromImage(imagepath) {
    createWindow({"path": imagepath, "fixed_aspect": true});
  }

/*
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
      // createWindow(json);
      createWindowFromImage(json["path"]);
      refresh();
      await subscribe();
    }
  }
*/

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

  function findEmptyXYMin() {
    const ww = $(window).width();
    for (let y = 20; 1; y+= 25) {
      for (let x = 0; x < ww; x+=200) {
        let conflict = 0;
        $(".window_min").each(function() {
          if (Math.abs($(this).offset().left - x) < 5 && Math.abs(parseInt($(this).css("bottom")) - y) < 5) {
            conflict = 1;
            return false;
          }
        });
        if (!conflict)
          return [x, y];
      }
    }
    return [0, 0];
  }
  function createMinWindow(win) {
    // if (win.css("visibility") == "hidden")
      // return;
    let nwin = $("#template_min").clone().removeAttr('id');
    nwin.find(".title").html(win.find(".title").html());
    nwin.css("width", "200px");
    let [ex, ey] = findEmptyXYMin();
    nwin.css("left", ex + "px");
    nwin.css("bottom", ey + "px");

    $("#template_min").after(nwin);
    nwin.show();
    win.css("visibility", "hidden");

    nwin.click(function() {
      nwin.remove();
      win.css("visibility", "visible");
      saveWindows();
    });
    nwin.find(".button_close").click(function() {
      nwin.remove();
      win.remove();
      saveWindows();
    });
    saveWindows();
  }
  function snap(self, x, y) {
    const gap = 10;
    const sna = 5; // snap range

    let ox = x, oy = y;
    let mx = sna, my = sna;
    let cx = [], cy = [];
    const w = parseInt(self.css("width"));
    const h = parseInt(self.css("height"));

    $(".mywindow").each(function() {
      if ($(this).is(self) || $(this).attr("id") == "template") return true;
      const nx = parseInt($(this).css("left"));
      const ny = parseInt($(this).css("top"));
      const nw = parseInt($(this).css("width"));
      const nh = parseInt($(this).css("height"));
      cx.push(nx);
      cx.push(nx - w);
      cx.push(nx - w - gap);
      cx.push(nx + nw);
      cx.push(nx + nw + gap);
      cx.push(nx + nw - w);
      cy.push(ny);
      cy.push(ny - h);
      cy.push(ny - h - gap);
      cy.push(ny + nh);
      cy.push(ny + nh + gap);
      cy.push(ny + nh - h);
    });
    for (let i in cx) {
      const dx = Math.abs(cx[i] - x);
      const dy = Math.abs(cy[i] - y);
      if (dx < mx) {
        mx = dx;
        ox = cx[i];
      }
      if (dy < my) {
        my = dy;
        oy = cy[i];
      }
    }
    return [ox, oy];
  }
  function snapwh(self, w, h) {
    const gap = 10;
    const sna = 5; // snap range

    let ox = w, oy = h;
    let mx = sna, my = sna;
    let cx = [self.data("nw")], cy = [self.data("nh") + 20];
    const x = parseInt(self.css("left"));
    const y = parseInt(self.css("top"));

    $(".mywindow").each(function() {
      if ($(this).is(self) || $(this).attr("id") == "template") return true;
      const nx = parseInt($(this).css("left"));
      const ny = parseInt($(this).css("top"));
      const nw = parseInt($(this).css("width"));
      const nh = parseInt($(this).css("height"));
      // console.log($(this).find(".title").text(), nx, ny, nw, nh);
      cx.push(nx - x);
      cx.push(nx - x - gap);
      cx.push(nx - x + nw);
      cy.push(ny - y);
      cy.push(ny - y - gap);
      cy.push(ny - y + nh);
    });
    for (let i in cx) {
      const dx = Math.abs(cx[i] - w);
      const dy = Math.abs(cy[i] - h);
      if (dx < mx) {
        mx = dx;
        ox = cx[i];
        oy = Math.round(ox * self.data("nh") / self.data("nw")) + 20;
      }
      if (dy < my) {
        my = dy;
        oy = cy[i];
        ox = Math.round((oy - 20) * self.data("nw") / self.data("nh"))
      }
    }
    return [ox, oy];
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
        if ($(this).data("type") != "finder" || relY < 20)
          action = "move";
      } else {
        action = "resize";
      }
    });
    $(".mywindow").mouseup(function(e) {
      action = 0;
    });
    $(document).mouseup(function(e) {
      action = 0;
    });
    $(".mywindow .button_max").click(function() {
      alert("from win");
    });

    // console.log("e registered");
    $(".button_min").off('click').click(function() {
      createMinWindow($(this).closest(".mywindow"));
      // $(this).closest(".mywindow").hide();
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
    $(document).off('mousemove').mousemove(function(e) {
      const discrete = 1;
      if (action == "move") {
        let nx = lastx + (e.pageX - lastmx);
        let ny = lasty + (e.pageY - lastmy);
        [nx, ny] = snap(awin, nx, ny);
        console.log(nx, ny);
        // if (awin.data("fixed_aspect")) {
          // nx = Math.round(nx / 20) * 20;
          // ny = Math.round(ny / 20) * 20;
        // }
        awin.css({
          "left": nx,
          "top": ny 
        });
      } else if (action == "resize") {
        // console.log("action2");
        

        const MINW = 100;
        const MINH = 40;
        if (awin.data("fixed_aspect")) {
          if (lpx == 'e' && lastw + (e.pageX - lastmx) >= MINW) {
            awin.css("width", parseInt(lastw + (e.pageX - lastmx)));
            awin.css("height", parseInt(awin.width() * awin.data("nh") / awin.data("nw") + 20));
          } else if (lpy == 's' && lasth + (e.pageY - lastmy) >= MINH) {
            awin.css("height", parseInt(lasth + (e.pageY - lastmy)));
            awin.css("width", parseInt((awin.height() - 20) * awin.data("nw") / awin.data("nh")));
          }
          // if (discrete) {
          const [nw, nh] = snapwh(awin, parseInt(awin.css("width")), parseInt(awin.css("height")));
          awin.css("width", nw);
          awin.css("height", nh);
          // }

        } else {
          if (lpx == 'w' && lastw + lastmx - e.pageX >= MINW) {
            awin.css("width", parseInt(lastw + (lastmx - e.pageX)));
            awin.css("left", parseInt(lastx + (e.pageX - lastmx)));
          } else if (lpx == 'e' && lastw + (e.pageX - lastmx) >= MINW) {
            awin.css("width", parseInt(lastw + (e.pageX - lastmx)));
          }
          if (lpy == 'n' && lasth + (lastmy - e.pageY) >= MINH) {
            awin.css("height", parseInt(lasth + (lastmy - e.pageY)));
            awin.css("top", parseInt(lasty + (e.pageY - lastmy)));
          } else if (lpy == 's' && lasth + (e.pageY - lastmy) >= MINH) {
            awin.css("height", parseInt(lasth + (e.pageY - lastmy)));
          }
        }
      } else if (action == "slide") {
        let neww = lastx + (e.pageX - lastmx);
        let mw = awin.closest(".mywindow").width();
        if (neww > mw - 10)
          neww = mw - 10; 
        if (neww < 0)
          neww = 0;
        awin.prev().css("flex-basis", neww + "px");
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
        console.log(data.responseJSON);
        data.responseJSON.forEach((w) => {
          createWindow(w);
        });
        refresh();
      }
    });
    // subscribe();
    // createWindow({"path": "/"});
    refresh();

  });
