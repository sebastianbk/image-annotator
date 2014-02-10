var containercss = {
  position : "relative",
  // "margin" : "20px 0 0 0",
  // "background" : "gray",
  overflow : "hidden"
};

var canvascss = {
  position : "absolute",
  left : 0,
  top : 0,
  "z-index" : 100,
  cursor : "move"
};

// Annotations - as distinct on the canvas
function Annotation(type) {
  this.valid = false;
  this.pts = [{x:0,y:0}, {x:0,y:0}];
  this.type = type;
};


//////////////////////////////////////////////////////
///// Annotator Object Definition ////////////////////

// Creates a new annotator (to be bound to a DOM object)
function Annotator(src, w, h) {
  // Parameters
  this.src = src;
  this.w = w;
  this.h = h;

  // Controls
  this.zoomin = null;
  this.zoomout = null;
  this.pan = null;
  this.annotate = null;
  this.attType = null;

  // Components
  this.container = null
  this.canvas = null;


  // Annotations
  this.att = null;
  this.atts = new Array();
  this.selectedType = "rect";

  // Drawing
  this.g = null;

  // Transform info
  this.curScale = 0.9;
  this.xOffs = 0;
  this.yOffs = 0;

  // Canvas ops
  this.x0 = 0;
  this.x1 = 0;
  this.y0 = 0;
  this.y1 = 0;
  this.curOp = "pan";
  this.active = false;
  this.polyC = 0;
}
Annotator.fn = Annotator.prototype;

// Updates an existing annotator with a new image
// (Also resets the pan/zoom and annotations)
Annotator.fn.update = function(src, w, h) {
  this.src = src;
  this.w = w;
  this.h = h;

  // Reloading & resizing
  this.container.width(w).height(h);
  this.img.attr("src", src).width(w).height(h);

  // Reset pan/zoom
  this.curScale = 0.9;
  this.xOffs = 0;
  this.yOffs = 0;

  // Reset annotation
  this.att = null;
  this.atts = new Array();

  // Resize canvas
  this.canvas[0].width = w;
  this.canvas[0].height = h;
}

//////////////////////////////////////////////////////
// Instantiates an annotator inside a DOM object
Annotator.fn.build = function($parent) {
  // Register and generate annotator components
  $parent.addClass("annotator");
  $parent.data("Annotator", this);

  // Controls
  this.zoomin    = $('<button id="zoomin">+</button>').appendTo($parent);
  this.zoomout   = $('<button id="zoomout">-</button>').appendTo($parent);
  this.pan       = $('<button id="pan">Pan</button>').appendTo($parent);
  this.annotate  = $('<button id="annot">Annotate</button>').appendTo($parent);

  this.attType      = $('<select id="typesel"></select>')
                      .html('<option>Box</option><option>Polygon</option>')
                      .appendTo($parent);

  // Canvas container
  this.container = $('<div></div>')
                      .css(containercss)
                      .width(this.w)
                      .height(this.h)
                      .appendTo($parent);

  // Load the image
  this.img = $('<img src="'+this.src+'"></img>')
                      .width(this.w)
                      .height(this.h)
                      .hide()
                      .appendTo($parent);

  // The drawing canvas
  this.canvas = $('<canvas>Unsupported browser.</canvas>')
                      .css(canvascss)
                      .appendTo(this.container);
  // Resize canvas
  this.canvas[0].width = this.w;
  this.canvas[0].height = this.h;

  // Get the drawing context
  this.g = this.canvas[0].getContext("2d");

  var a = this; // loss of context when defining callbacks

  // Zoom control
  this.zoomin.click(function(){a.zoom(1.25);});
  this.zoomout.click(function(){a.zoom(0.8);});

  // Operation selection
  this.attType.change(function() {
    var str = $(this).val();

    if (str == "Box") {
      a.selectedType = "rect";
    }
    else if (str == "Polygon") {
      a.selectedType = "poly";
    }
  });

  this.pan.click(function(){
    a.curOp = "pan";
    a.canvas.css("cursor", "move");
  });

  this.annotate.click(function(){
    a.curOp = "annotate";
    a.canvas.css("cursor", "crosshair");
  });

  // Mouse down - start drawing or panning
  this.canvas.mousedown(function(e){
    a.mbDown(e.pageX, e.pageY);
  });

  // Movement continues draw/pan as long as the mouse button is held
  this.canvas.mousemove(function(e){
    a.mMove(e.pageX, e.pageY);
  });

  // Operation end
  this.canvas.mouseup(function(){
    a.mbUp();
  });

  // We have to wait for the image to load before we can use it
  this.img.load(function(){
    a.doTransform();
  });
}

//////////////////////////////////////////////////////
// Mouse control
Annotator.fn.mbDown = function(x, y) {
  if (!this.active) {
    var offset = this.canvas.offset();
    this.x1 = this.x0 = x - offset.left;
    this.y1 = this.y0 = y - offset.top;
    this.active = true;

    if (this.curOp == "annotate") {
      this.att = new Annotation(this.selectedType);
      this.att.valid = true;
      this.atts.push(this.att);

      if (this.att.type == "poly") {
        this.att.pts[0] = new ptToImg(this, this.x0, this.y0);
        this.polyC = 1;
      }
    }
  }
}

Annotator.fn.mbUp = function() {
  // End ONLY if dragged
  if (this.curOp == "annotate") {
    if (this.x0 != this.x1 && this.y0 != this.y1) {
      if (this.att.type == "rect") this.active = false;
      else if (this.att.type == "poly") {
        this.x0 = this.x1;
        this.y0 = this.y1;
        this.polyC++;
      }
    }
    else if (this.att.type == "poly" && this.polyC > 1) {
      this.active = false;
    }
  }
  else {
    this.active = false;
  }
}

Annotator.fn.mMove = function(x, y) {
  if (!this.active) return;

  var offset = this.canvas.offset();
  this.x1 = x - offset.left;
  this.y1 = y - offset.top;

  var dx = this.x1 - this.x0;
  var dy = this.y1 - this.y0;

  if (this.curOp == "pan") {
    // Panning the image
    this.doPan(dx, dy);
    this.x0 = this.x1;
    this.y0 = this.y1;
  }
  else if (this.curOp == "annotate") {
    // Annotation - in image space
    var pt1 = new ptToImg(this, this.x0, this.y0);
    var pt2 = new ptToImg(this, this.x1, this.y1);

    if (this.att.type == "rect") {
      this.att.pts[0] = pt1;
      this.att.pts[1] = pt2;
    }
    else if (this.att.type == "poly") {
      // Save next point
      this.att.pts[this.polyC] = pt2;
    }

    // Redraw
    this.doTransform();
  }
}

//////////////////////////////////////////////////////
// Canvas Operations

// Canvas re-draw op
Annotator.fn.repaint = function() {
  var g = this.g;
  var $img = this.img;

  var w = $img.width();
  var h = $img.height();

  // Drop shadow
  g.shadowColor = "#555";
  g.shadowBlur = 40;

  // Draw the image
  g.drawImage($img[0], -w/2, -h/2);

  // Annotation
  for (var i = 0; i < this.atts.length; i++) {
    this.drawAtt(this.atts[i]);
  }
}

// Annotation draw op
Annotator.fn.drawAtt = function(att) {
  var g = this.g;

  if (!att.valid) return;

  g.shadowColor = "#222";
  g.shadowBlur = 5;
  g.strokeStyle = "white";
  g.lineWidth = 1 / this.curScale;
  g.fillStyle = "white";

  // Box drawing (2-point)
  if (att.type == "rect") {
    var x0 = att.pts[0].x;
    var y0 = att.pts[0].y;
    var x1 = att.pts[1].x;
    var y1 = att.pts[1].y;

    var dx = Math.abs(x1-x0);
    var dy = Math.abs(y1-y0);
    var x = Math.min(x0, x1);
    var y = Math.min(y0, y1);

    g.strokeRect(x, y, dx, dy);

    this.drawPt({x:x0, y:y0});
    this.drawPt({x:x0, y:y1});
    this.drawPt({x:x1, y:y0});
    this.drawPt({x:x1, y:y1});
  }
  // Polygon drawing (n-point)
  else if (att.type == "poly") {
    g.beginPath();
    g.moveTo(att.pts[0].x, att.pts[0].y);

    for (var i = 1; i < att.pts.length; i++) {
      g.lineTo(att.pts[i].x, att.pts[i].y);
    }

    g.lineTo(att.pts[0].x, att.pts[0].y);
    g.stroke();

    for (var i = 0; i < att.pts.length; i++) {
      this.drawPt(att.pts[i]);
    }
  }
}

// Point drawing util
Annotator.fn.drawPt = function(pt) {
  var g = this.g;
  g.beginPath();
  g.arc(pt.x, pt.y, 2.5/this.curScale, 0, 2*Math.PI, false);
  g.fill();
}

// General transform op
Annotator.fn.doTransform = function() {
  var g = this.g;

  // Reset xform & clear
  g.setTransform(1,0,0,1,0,0);
  g.clearRect(0, 0, this.w, this.h);

  // To draw in position with scaling,
  // move to position (translate), then
  // scale before drawing at (0, 0)
  g.translate(this.w/2 + this.xOffs, this.h/2 + this.yOffs);
  g.scale(this.curScale, this.curScale);

  this.repaint();
}

// Pan op
Annotator.fn.doPan = function(x, y) {
  // New offset
  var margin = 100;

  this.xOffs += x;
  this.yOffs += y;

  var xLim = (this.w/2)*this.curScale;
  var yLim = (this.h/2)*this.curScale;

  if (this.xOffs >  xLim) this.xOffs =  xLim;
  if (this.xOffs < -xLim) this.xOffs = -xLim;
  if (this.yOffs >  yLim) this.yOffs =  yLim;
  if (this.yOffs < -yLim) this.yOffs = -yLim;

  this.doTransform();
}

// Zoom op
Annotator.fn.zoom = function(scale) {
  // New scaling level
  this.curScale *= scale;
  if (this.curScale < 0.9) this.curScale = 0.9;
  this.doTransform();
}

// Util - canvas to image space
function ptToImg(a, x, y) {
  var x = (x-a.w/2-a.xOffs)/a.curScale;
  var y = (y-a.h/2-a.yOffs)/a.curScale;

  return {x:x,y:y};
}


//////////////////////////////////////////////////////
///// API Definition /////////////////////////////////

(function( $ ) {
  // The annotator function - appplicable to any jQuery object collection
  $.fn.annotator = function(src, width, height) {
    return this.each(function() {
      // Check for annotator class
      $parent = $(this);
      var a;

      // Update if we're passed an existing annotator
      if ($parent.hasClass("annotator")) {
        a = $parent.data("Annotator");
        a.update(src, width, height);
      }
      else {
        a = new Annotator(src, width, height);
        a.build($parent);
      }
    });
  };
}(jQuery));
