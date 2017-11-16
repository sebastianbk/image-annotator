var Annotator = require('./annotator');

/**
 * The annotator api function - applicable to any jQuery object, this creates an Annotator which is bound to the parent element.
 * If an annotator is already bound to the element, this method updates the annotator with the new input.
 * @param  {Object} input
 * @return {Annotator} The element's annotator.
 * @method annotator
 */
module.exports.annotator = function(input) {
  var w, h;

  if (typeof input.src !== "undefined") {
    input.img = $('<img src="'+input.src+'"></img>').hide();
  }
  else if (typeof input.img === "undefined") {
    input.img = null;
  }
  
  if (typeof input.features === "undefined") {
    input.features = null;
  }
  else if (!input.features instanceof Array) {
    throw "Error: input.features is not a valid Array instance";
  }

  if (typeof input.controls === "undefined") {
    input.controls = true;
  }
  else if (!input.controls instanceof Boolean) {
    throw "Error: input.controls is not a Boolean";
  }

  if (typeof input.width === "undefined")   {w = 640;}
  else                                      {w = input.width;}

  if (typeof input.width === "undefined")   {h = 480;}
  else                                      {h = input.height;}

  // Check for annotator class
  var $parent = $(this);
  var a;

  // Update if we're passed an existing annotator
  if ($parent.hasClass("annotator")) {
    a = $parent.data("Annotator");
    a.update(input.img, w, h);
  }
  else {
    a = new Annotator(input.img, w, h, input);
    a.parent = $parent;
    a.build($parent);
  }

  // Apply input
  a.featuresIn(input);
  a.annsIn(input);
  a.cssIn(input);

  a.showChange();

  return a;
};
