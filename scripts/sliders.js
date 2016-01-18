var _sliders = undefined;
define(['util'], function sliders(util) {
  'use strict';
  
  var exports = _sliders = {};
  var Class = util.Class;

  var gsb_rets = new util.cachering(function() {
    return [[0, 0], [0, 0]];
  }, 32);
  
  var SliderManager = exports.SliderManager = Class([
    function constructor(x, y, slidwid, slidheight, sliders) {
      this.slidesize = [slidwid, slidheight];
      this.x = x;
      this.y = y;
      this.sliders = sliders;
      this.pad = 15;
      
      this.last_mpos = [0, 0];
      this.act_slider = -1;
      this.mdown = false;
      
      this.locked = {};
      this.load();
    },
    
    function bind_events() {
      var this2 = this;
      
      window.addEventListener("mousedown", function(e) {
        this2.on_mousedown(e);
      });
      window.addEventListener("mousemove", function(e) {
        this2.on_mousemove(e);
      });
      window.addEventListener("mouseup", function(e) {
        this2.on_mouseup(e);
      });
    },
    
    function reset() {
    },
    
    function on_mousedown(e) {
      this.mdown = true;
      
      this.last_mpos[0] = e.pageX;
      this.last_mpos[1] = e.pageY;
      
      if (this.act_slider >= 0) {
        e.stopPropagation();
      }
    },

    function load() {
      if (!("startup_file_bn10_sliders" in localStorage)) {
        return;
      }
      
      var sliders = JSON.parse(localStorage.startup_file_bn10_sliders);
      var len = Math.min(this.sliders.length, sliders.length);
      
      for (var i=0; i<len; i++) {
        this.sliders[i] = sliders[i];
      }
    },
    
    function lock(slider) {
      this.locked[slider] = 1;
    },
    
    function unlock(slider) {
      this.locked[slider] = 0;
    },
    
    function save() {
      localStorage.startup_file_bn10_sliders = JSON.stringify(this.sliders);
    },
    
    function on_mousemove(e) {
      var sliders = this.sliders;
      
      if (!this.mdown) {
        var act = this.actslider;
        this.actslider = -1;
        
        for (var i=0; i<sliders.length; i++) {
          var box = this.get_slider_box(i);
          var x = e.pageX, y = e.pageY;
          if (x >= box[0][0] && x <= box[0][0]+box[1][0] && 
              y >= box[0][1] && y <= box[0][1]+box[1][1])
          {
            this.actslider = i;
          }
        }
        
        if (this.actslider != act) {
          redraw_all();
        }
      } else if (this.actslider >= 0) {
        if (this.actslider >= 0 && this.locked[this.actslider]) {
          return;
        }
        
        var dy = -(e.pageY - this.last_mpos[1]) / 700.0;
        
        if (e.shiftKey)
          dy *= 0.05;
        if (e.ctrlKey)
          dy *= 0.05;
        if (e.altKey)
          dy *= 0.01025;
        
        console.log(sliders, this.actslider); 
        sliders[this.actslider] += dy;
        console.log("SLIDERS=[" + sliders + "];");
        
        this.save();
        
        window.redraw_all();
        e.stopPropagation();
      }

      this.last_mpos[0] = e.pageX;
      this.last_mpos[1] = e.pageY;
    },

    function on_mouseup(e) {
      this.mdown = false;
    },
      
    function get_slider_box(i) {
      var pad=this.pad, swid=this.slidesize[0];
      var ret = gsb_rets.next();
      
      ret[0][0] = this.x + (swid+pad)*i;
      ret[0][1] = this.y;
      ret[1][0] = swid;
      ret[1][1] = this.slidesize[1];
      
      return ret;
    },

    function draw(canvas, g) {
      var sliders = this.sliders;
      
      var w = this.slidesize[0], h = this.slidesize[1];
      
      var x = this.x + w + 7;
      var y = this.y, pad=11, swid=40;
          g.fillStyle = "rgba(0, 0, 0, 0.1)";
      
      for (var i=0; i<sliders.length; i++) {
        g.beginPath();
        
        var b = this.get_slider_box(i);
        
        g.rect(b[0][0], b[0][1], b[1][0], b[1][1]);
        x += swid+pad;
        
        g.fillStyle = i==this.actslider ? "rgba(50, 135, 230, 0.2)" : "rgba(0, 0, 0, 0.1)";
        g.stroke();
        g.fill();
      }
    },
  ]);
  
  return exports;
});
