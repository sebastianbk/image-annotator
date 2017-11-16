var SuperTool = require('../superTool');

/**
 * The annotation tool handles user input to the canvas. It allows
 * the user to draw out NEW annotations.
 * @param {Annotator} parent The Annotator the tool will operate on
 * @constructor
 * @extends {SuperTool}
 */
function AnnTool(parent) {
  SuperTool.call(this);
  this.parent = parent;

  /** @type {SuperShape} The annotation being drawn */
  this.ann = null;
}
AnnTool.prototype = Object.create(SuperTool.prototype);
AnnTool.fn = AnnTool.prototype;

/*jshint unused:vars*/

/**
 * Handles a left mouse up event, attempting to add a point to the annotation.
 * @param  {Number} x
 * @param  {Number} y
 * @memberOf AnnTool#
 * @method  lbUp
 */
AnnTool.fn.lbUp = function(x, y) {
  var a = this.parent;

  // Create annotation if we're not already making
  // one
  if (!this.active) {
    this.active = true;
    this.ann = a.annHelper.newAnn();
  }

  var pt = a.cHelper.ptToImg(x, y);

  this.active = this.ann.addPt(pt);
  if(!this.active) {
    a.annotationDone({ x: x, y: y });
  }
  a.showChange();
};

/**
 * Handler for left double-click, which immediately completes a Polygon annotation
 * @param  {Number} x
 * @param  {Number} y
 * @memberOf AnnTool#
 * @method lbDbl
 */
AnnTool.fn.lbDbl = function(x, y) {
  // NB: We get 2x 'up' events before the double-click
  // Need to remove erroneous extra points
  if (this.active) {
    var a = this.parent;
    this.active = false;

    this.ann.delPt(-1); // Remove pt from second click
    this.ann.delPt(-1); // Remove intermediate pt (would be next placed)

    a.annotationDone({ x: x, y: y });
    a.showChange();
  }
};

/**
 * Handler for mouse movement, which updates the last added point
 * @param  {Number} x
 * @param  {Number} y
 * @memberOf AnnTool#
 * @method  mMove
 */
AnnTool.fn.mMove = function(x, y) {
  if (this.active) {
    var c = this.parent.cHelper;
    var pt = c.ptToImg(x, y);

    this.ann.modLastPt(pt);
    c.repaint();
  }
};

/**
 * Handler for keyboard input - delete key deletes the current annotation and ends drawing.
 * Backspace removes the last placed point, and deletes the annotation if it was the last point.
 * @param  {Number} key
 * @memberOf AnnTool#
 * @method keyDown
 */
AnnTool.fn.keyDown = function(key) {
  var anh = this.parent.annHelper;

  switch (key) {
    case 46: // Delete
      anh.getAnn().invalidate();
      this.active = false;
      this.parent.showChange();
      break;
    case 8: // Backspace
      if (this.active) {
        // Delete last placed point
        var pt = this.ann.getPts()[this.ann.getNumPts()-1];
        this.ann.delPt(-1);
        this.active = this.ann.isValid();

        if (this.active) {
          this.ann.modLastPt(pt);
        }

        this.parent.showChange();
      }
      break;
  }
};

/*jshint unused:true*/

module.exports = AnnTool;