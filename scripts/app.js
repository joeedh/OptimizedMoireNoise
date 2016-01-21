/*
  _app is for getting module through debug console.  
  not used by the code.  don't confused with _appstate.
*/
var _app = undefined;

/*
function define1(deps, mod) {
  console.log("define " + (mod != undefined ? mod.name : "unknown"), arguments);
  return _reqdefine.apply(arguments);
}*/

define([
  'util', 'const', 'ui', 'image', 'aa_types', 'aa_generator', 'sliders', 'fft'
], function app(util, cconst, ui, image, aa_types, aa_generator, sliders, fft) 
{
  'use strict';
  
  var exports = _app = {};
  var Class = util.Class;
  
  var AppState = Class([
    function constructor() {
      this.report_queue = [];
      this.report_lines = [];
      this._lastsize = [0, 0];
      this.fft = new fft.FFT1D(128);
      
      this.g = this.canvas = undefined;
      this.gui = undefined;
      this._last_mode = -1;
      
      this.points = [];
      this.tiles = this.sliders = this.draw_canvas = this.draw_image = this.draw_canvas_g = undefined;
      this.dimen = undefined;
      this.generator = new aa_generator.AAGen();
      
      this.sliders = new sliders.SliderManager((cconst.DIMEN+3)*4.5+250, 5, 40, window.innerHeight*0.77, cconst.SLIDERS);
      this.sliders.bind_events();
      
      this.reset();
      
      this.build_ui();
    },
    
    function reset() {
      var dimen = this.dimen = cconst.DIMEN;
      
      this.generator.reset(this.dimen);
      
      this.mask_canvas = document.createElement("canvas");
      this.mask_canvas.width = cconst.DIMEN*4;
      this.mask_canvas.height = cconst.DIMEN*4;
      this.mask_g = this.mask_canvas.getContext("2d");
      this.draw_image = new ImageData(cconst.DRAW_IMAGE_SIZE*dimen, cconst.DRAW_IMAGE_SIZE*dimen);
      
      this.large_mask = new ImageData(dimen*4, dimen*4);
      
      this.draw_canvas = document.createElement("canvas");
      this.draw_canvas.width = this.draw_image.width;
      this.draw_canvas.height = this.draw_image.height;
      this.draw_canvas_g = this.draw_canvas.getContext("2d");
      
      this.points = [];
      this.tiles = new image.TileManager(cconst.TILES, cconst.DIMEN);
      this.tiles.make_tiles();
      this.sliders.reset();
      
      this.last_mpos = [undefined, undefined];
      
      this.update_slider_locks();
    },
    
    function on_mousedown(e) {
      this.update_slider_locks();
      
      var x = e.pageX, y = e.pageY;
      this.mdown = true;
      
      this.last_mpos[0] = x;
      this.last_mpos[1] = y;
    },
    
    function on_mousemove(e) {
      this.update_slider_locks();
      
      var x = e.pageX, y = e.pageY;
      
      if (this.mdown) {
        /*
        var scale = 0.005;
        var dx = (x-this.last_mpos[0])*scale, dy = -(y-this.last_mpos[1])*scale;
        
        if (e.shiftKey) {
          dx *= 0.05;
          dy *= 0.05;
        }
        if (e.altKey) {
          dx *= 0.05;
          dy *= 0.05;
        }
        if (e.ctrlKey) {
          dx *= 0.015;
          dy *= 0.015;
        }
        
        this.sliders.sliders[3] += dx;
        this.sliders.sliders[4] += dy;
        this.sliders.save();
        
        redraw_all();*/
      }
      
      this.last_mpos[0] = x;
      this.last_mpos[1] = y;
    },
    
    function on_mouseup(e) {
      this.mdown = false;
    },
    
    function gen() {
      this.generator.gen(this.points, this.dimen, this.sliders.sliders, this.tiles);
    },
    
    function fft() {
      var restrict = ~~(DRAW_RESTRICT_LEVEL*this.generator.max_level());
      var ps = this.generator.points;
      var plen = 0;
      
      var maxlvl = this.generator.max_level();
      restrict /= maxlvl;
      
      var ps2 = this.generator.get_visible_points(restrict, true);
      var plen = ps2.length/PTOT;
      
      var gen = this.generator;
      
      //from PSA
      var fnorm = 2.0 / Math.sqrt(plen);
      var frange  = 10// Frequency range relative to Nyq. freq. of hexagonal lattice
      var size = Math.floor(frange/fnorm);
      
      var size2 = size; //64;
      var fscale = size/size2;
      size = size2;
      
      var fft_image, fft;

      if (this.fft_image != undefined && this.fft_image.width == size) {
        fft_image = this.fft_image;
        fft = fft_image.data;
      } else {
        fft_image = new ImageData(size, size);
        fft = fft_image.data;
        fft.fill(200, 0, fft.length);
        
        this.fft_image = fft_image;
      }
      
      var fft = new fftmod.FFT(size);
      //fft.jitter = 1;
      
      this._fft = fft;
      
      var pi = 0;
      var this2 = this;
      
      var next = function() {
        var steps = 95;
        
        var pi2 = Math.min(pi+steps*PTOT, ps.length);
        if (pi >= ps2.length) return 0;
        
        fft.add_points(ps2, fscale, pi/PTOT, pi2/PTOT);
        pi = pi2;

        this2.report("completed " + (pi/PTOT) + " of " + (ps2.length/PTOT) + " points");
        return 1;
      }
      
      var update = function update() {
        fft.raster(fft_image);
        fft.calc_radial();
      }
      
      next = next.bind(this);
      update = update.bind(this);
      var last_update = util.time_ms();
      
      window._fft_timer = window.setInterval(function() {
        if (!next()) {
          window.clearInterval(_fft_timer);
          window._fft_timer = undefined;
          
          if (util.time_ms() - last_update > 150) {
            update();
            last_update = util.time_ms();
          }
          
          redraw_all();
          return;
        }
        
        if (util.time_ms() - last_update > 150) {
          update();
          last_update = util.time_ms();
          redraw_all();
        }
      });
      
      redraw_all();
    },
    
    function step() {
      this.generator.step(this.dimen, this.sliders.sliders);
      this.generator.save_offsets();
      
      redraw_all();
    },
    
    function draw_transform(g) {
      var w = this.canvas.width, h = this.canvas.height;
      var sz = Math.max(w, h);
      
      g.lineWidth /= sz*cconst.SCALE*0.5;
      
      g.translate(w*0.2+cconst.PANX*sz, h*0.05+cconst.PANY*sz);
      g.scale(sz*cconst.SCALE*0.5, sz*cconst.SCALE*0.5);
    },
    
    function report() {
      var s = "";
      
      for (var i=0; i<arguments.length; i++) {
        if (i > 0) s += " "
        
        s += arguments[i];
      }
      
      console.log(s);
      
      //this.report_queue.push(s);
      this.report_lines.push(s);
      
      if (this.report_lines.length > MAX_REPORT_LINES) {
        this.report_lines.shift();
      }
      
      this.redraw_report();
    },
    
    function offsets_fft() {
      /*
      this.fft = new fft.FFT1D(512);
      var ps = [];
      for (var i=0; i<512; i++) {
        ps.push(Math.random()-0.5);
      }
      
      this.fft.add_samples(ps);
      this.fft.normalize();
      this.fft.dft();
      
      redraw_all();
      
      return;
      //*/
      
      var ps = this.points;
      var offsets = this.generator.offsets;
      
      var lst = new Array(this.points.length/PTOT);
      var tots = new Array(this.points.length/PTOT);
      lst.fill(0, 0, lst.length);
      tots.fill(0, 0, tots.length);
      var aaret = new aa_types.AAReturn();
      
      for (var i=0; i<this.points.length; i += PTOT) {
        var f = ps[i+PF];
        
        aaret.id = ps[i+PID], aaret.f = ps[i+PF]; aaret.float_id = ps[i+PFID];
        
        var dxdy = this.generator.get_offset(aaret, this.sliders.sliders);
        
        var j = ~~(f*lst.length*0.999999);
        var dx = dxdy[0];
        
        lst[j] += dx;
        tots[j]++;
      }
      
      var last = 0;
      for (var i=0; i<lst.length; i++) {
        if (tots[i] > 0) {
          lst[i] /= tots[i];
          last = lst[i];
        } else {
          var s = i;
          for (; i<lst.length && !tots[i]; i++) {
          }
          
          var e = i;
          var next = e >= lst.length ? last : lst[e]/tots[e];
          if (s == e) {
            console.log("yeeksh!");
            continue;
          }
          
          for (var j=s; j<e; j++) {
            var t = (j-s) / (e - s);
            var f = last + (next - last)*t;
            
            lst[j] = f;
          }
        }
      }
      
      this.fft = new fft.FFT1D(lst.length);
      
      this.fft.add_samples(lst);
      this.fft.normalize();
      
      this.fft.dft();
      redraw_all();
    },
    
    function redraw_report() {
      var r = document.getElementById("messages");
      var ls = this.report_lines;
      
      var s = "";
      for (var i=0; i<ls.length; i++) {
        s += ls[i] + "<br>\n";
      }
      
      r.innerHTML = s;
    },
    
    function update_slider_locks() {
      if (cconst.PROTECT_OFFFSETS || this.generator.offsets.used > 0) {
        this.sliders.lock(0);
        this.sliders.lock(1);
      } else {
        this.sliders.unlock(0);
        this.sliders.unlock(1);
      }
    },
    
    function draw() {
      this.update_slider_locks();
      
      this.points = [];
      this.gen();
      
      var g = this.g; 
      
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (this.fft_image != undefined) {
        var fftx=20, ffty=350;
        g.putImageData(this.fft_image, fftx, ffty);
        
        var steps = 32;
        var t = 0, dt = 1.0 / (steps-1);
        
        var h = 40;
        var y = ffty+this.fft_image.height + h + 2;
        
        g.strokeStyle = "black";
        g.beginPath();
        
        var first = 1;
        
        for (var i=0; i<steps; i++, t += dt) {
          var f = this._fft.eval_radial(t);
          
          //if (f < 0) continue; //fft wants us to skip this t value
          f = 1.0 - f;
          
          var x2 = fftx + i*3;
          var y2 = y + f*h;
          //y2 = y;
          
          if (first) {
            g.moveTo(x2, y2);
            first = 0;
          } else {
            g.lineTo(x2, y2);
          }
        }
        
        g.stroke();
      }
      
      g.save();
      this.draw_transform(g);
      g.translate(0, 0.5);
      
      var ps = this.points;
      
      
      /*
      g.beginPath();
      var r = 0.125/cconst.DIMEN;
      
      for (var i=0; i<ps.length; i += PTOT) {
        var x = ps[i], y = ps[i+1], id = ps[i+PID], gen = ps[i+PGEN], ix = ps[i+PIX], iy = ps[i+PIY];
        
        g.rect(x-r/2, y-r/2, r, r);
        
        //slow!
        //g.moveTo(x, y);
        //g.arc(x, y, r, -Math.PI, Math.PI);
      }
      g.fill();
      
      //*/
      
      var ps = this.points;
      var offsets = this.generator.offsets;
      
      if (cconst.DRAW_OFFSET_FUNCS) {
        var lst = [];
        
        for (var i=0; i<ps.length; i += PTOT) {
          lst.push(i);
        }
        
        var use_fid = !cconst.OFFSET_FUNC_FMODE;
        
        lst.sort(function(a, b) {
          var f1 = ps[a + (use_fid ? PFID : PF)], f2 = ps[b + (use_fid ? PFID : PF)];
          
          return f1 - f2;
        });
        
        g.save();
        
        g.beginPath();
        g.strokeStyle = "black";
        g.rect(0, 0, 1, 1);
        g.stroke();
        
        var ma = new util.MovingAverage(4);
        var aaret = new aa_types.AAReturn();
        
        for (var si=0; si<2; si++) {
          g.beginPath();
          g.strokeStyle = si ? "green" : "red";
          g.moveTo(0, 0);
          
          for (var _i=0; _i<lst.length; _i++) {
            var i = lst[_i];
            var id = ps[i+PID], f = ps[i+PF], fid = cconst.OFFSET_FUNC_FMODE ? ps[i+PF] : ps[i+PFID];
            
            aaret.id = id;
            aaret.f = f;
            aaret.float_id = ps[i+PFID];
            aaret.co[0] = aaret.co[1] = 0;
            aaret.mask_f = ps[i+PGEN];
            
            var dxdy = this.generator.get_offset(aaret, this.sliders.sliders);
            
            if (isNaN(f) || isNaN(id) || isNaN(dxdy[0]) || isNaN(dxdy[1])) {
              console.log(f, id, dxdy[0], dxdy[1], dxdy);
              throw new Error("NaN!");
            }
            
            var scale = cconst.GRAPH_SCALE;
            scale = Math.pow(scale, 7.0);
            
            scale = 1 + 900*scale;
            
            var x = (-cconst.GRAPH_PAN + fid) * scale;
            var y = si ? dxdy[1] : dxdy[0];
            
            if (cconst.SMOOTH_GRAPH) {
              ma.add(y);
              y = ma.sample();
            }
            
            g.lineTo(x, -y*0.05);
          }
          g.stroke();
        }
        
        g.restore();
      }
      
      g.strokeStyle = "orange"
      this.fft.draw(g);
      
      g.restore();
      
      var iview = new Int32Array(this.draw_image.data.buffer);
      iview.fill(-0x10000000, 0, iview.length);
      
      var clr = [0.9, 0.9, 0.9];
      
      for (var i=0; i<ps.length; i += PTOT) {
        var x = ps[i], y = ps[i+1], id = ps[i+PID], gen = ps[i+PGEN], ix = ps[i+PIX], iy = ps[i+PIY];
        var f = ps[i+PF];
        
        if (ix-cconst.DOMAIN_PANX*cconst.DOMAIN_PAN_MUL > 100 || iy-cconst.DOMAIN_PANY*cconst.DOMAIN_PAN_MUL > 100) {
            continue;
        }
        
        if (cconst.DRAW_COLORS) {
          clr[0] = (1-gen)*0.25;
          clr[1] = clr[2] = gen*gen*gen*gen*gen;
        } else if (cconst.DRAW_IDS) {
          //var fid = ((~~id)*524287 + 4194271) & 16777213//((1<<19)-1);
          //fid /= 16777213//((1<<19)-1);
          
          //var fid = Math.fract(id*0.2342343243445) + Math.fract(id*1.2342342);
          //fid = Math.fract(1.0 / (0.0000001*fid + 0.000001));
          
          //fid = Math.cos(id / ((1<<9)-1))*0.5+0.5; 
          
          //fid = fid*0.5 + 0.5;
          var fid = Math.fract(id / ((1<<19)-1));
          
          
          clr[0] = clr[1] = clr[2] = fid;
          
          //var f2 = f*0.3 + 0.7;
          //clr[0] =  f2*Math.fract(1.0 / (0.00001+0.0000001*(fid*2.235423+0.234532)));
          //clr[1] =  f2*Math.fract(1.0 / (0.00001+0.000000002*(0.4542+fid*5.32432)));
          //clr[2] =  f2*Math.fract(1.0 / (0.00001+0.000000003*(0.234324+fid*15.34543)));
        }
        
        this.raster_point(x, y, clr, 1);
      }
      
      var cg = this.draw_canvas_g;
      cg.putImageData(this.draw_image, 0, 0);
      g.drawImage(this.draw_canvas, 100, 70);
      
      if (cconst.DRAW_MASK) {
        g.putImageData(this.large_mask, 50, 40);
      }
      
      this.tiles.draw(this.canvas, g, 2, 2);
      this.sliders.draw(this.canvas, g);
    },
    
    function raster_point(x, y, clr, r) {
      var image = this.draw_image, idata = image.data;
      
      var ix = ~~(x*image.width+0.5), iy = ~~(y*image.width+0.5);
      var offs = cconst.get_searchoff(Math.max(Math.ceil(r), 1));
      
      var r = ~~(clr[0]*255), g = ~~(clr[1]*255), b = ~~(clr[2]*255);
      
      for (var i=0; i<offs.length; i++) {
          var ix2 = ix + offs[i][0], iy2 = iy + offs[i][1];
          
          if (ix2 < 0 || iy2 < 0 || ix2 >= image.width || iy2 >= image.height) {
              continue;
          }
          
          var idx = (iy2*image.width + ix2)*4;
          idata[idx] = r;
          idata[idx+1] = g;
          idata[idx+2] = b;
          idata[idx+3]=255;
      }
    },
    
    function on_tick() {
      if (this.gui == undefined) return;
      
      if (window.innerWidth != this._lastsize[0] || window.innerHeight != this._lastsize[1]) {
        //this.on_resize();
      }
      
      this.gui.on_tick();
      this.gui2.on_tick();
      this.gui3.on_tick();
    },
    
    function on_resize() {
      return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      
      this._lastsize[0] = this.canvas.width;
      this._lastsize[1] = this.canvas.height;
      
      redraw_all();
    },
    
    function gen_offsets_file() {
      var consts = {};
      
      for (var k in cconst) {
        if (k[0] == k[0].toUpperCase() && typeof(cconst[k]) != "function") {
          consts[k] = cconst[k];
        }
      }
      
      var ret = {
        sliders : this.sliders.sliders,
        offsets : this.generator.offsets.toJSON(),
        "const" : consts,
        code1   : ""+_appstate.generator._gen._sample_intern,
        code2   : ""+_appstate.generator._gen.sample
      };
      
      return JSON.stringify(ret);
    },
    
    function save_mask() {    
      var mask = this.large_mask;
      
      var mg = this.mask_g;
      mg.clearRect(0, 0, mask.width, mask.height);
      mg.putImageData(mask, 0, 0);
      
      var url = this.mask_canvas.toDataURL();
      //window.open(url);
      
      console.log("saving mask to local storage...");
      localStorage.startup_mask_bn4 = url;
      //window.open(url);
    },
        
    function on_keydown(e) {
      console.log(e.keyCode);
      
      switch (e.keyCode) {
        case 68: //dkey
          this.step(this.dimen);
          break;
        case 82: //rkey
          this.reset();
          redraw_all();
          break;
        case 83: //skey
          this.save_mask();
          break;
        case 75: //kkey
          this.do_optimize_timer();
          
          break;
      }
    },
    
    function do_optimize_timer() {
      if (this.timer != undefined) {
        window.clearInterval(this.timer);
        console.log("stopping timer");
        
        this.timer = undefined;
        return;
      }
      
      console.log("starting timer");
      
      var this2 = this;
      this.timer = window.setInterval(function() {
        this2.step();
      }, 50);
    },
    
    function destroy_all_settings() {
      throw new Error("implement me");

      this.report("Removing all stored user data");
      this.report("  (except for any cached masks)");
      
      ui.destroy_all_settings();
      for (var i=0; i<generators.length; i++) {
        generators[i].destroy_all_settings();
      }
      
      this.gui.destroy();
      this.gui2.destroy();
      this.gui3.destroy();
      this.gui = undefined;
      this.gui2 = undefined;
      this.gui3 = undefined;
      
      var this2 = this;
      
      require.undef("const");
      require(["const"], function(module) {
        cconst = module;
        console.log("reloaded const.js");
        
        this2.reset();
        this2.build_ui();
        redraw_all();
      });
    },
    
    function build_ui() {
      var gui3 = this.gui3 = new ui.UI(cconst);
      
      var panel = gui3.panel("Frequency Function");
      panel.curve("OFFSET_FREQ_FUNC", "Frequency", undefined, true);
      
      var gui2 = this.gui2 = new ui.UI(cconst);
      gui2.dat.close();
      gui3.dat.close();
      
      gui2.panel("Offset Function");
      gui2.curve("OFFSET_FUNC", "Wave Curve", undefined, true);
      gui2.slider("OFFSET_MUL", "Freq", 0, 10775, 1, false, true);
      gui2.slider("OFFSET_AMPLITUDE", "Amp", 0, 4, 0.001, false, true);
      gui2.slider("OFFSET_MIDLEVEL", "Mid Level", 0, 1, 0.001, false, true);
      gui2.slider("OFFSET_PHASE", "Wave Phase", 0, 1, 0.001, false, true);
      gui2.slider("OFFSET_PHASEX", "X Phase", 0, 1, 0.001, false, true);
      gui2.slider("OFFSET_PHASEY", "Y Phase", 0, 1, 0.001, false, true);
      gui2.check("OFFSET_FUNC_FMODE", "Use F");
      
      var gui = this.gui = new ui.UI(cconst);
      
      //("GRAPH_SCALE", "Graph Scale", 0.0, 1.0, 0.0001, false, true);
      gui.slider("DIMEN", "Dimen", 0, 128, 1, true, false);
      gui.check("PROTECT_OFFFSETS", "Protect Offsets");
      gui.slider("DOMAIN_PANX", "X Shift", 0, 324, 1, true, true);
      gui.slider("DOMAIN_PANY", "Y Shift", 0, 324, 1, true, true);
      
      var this2 = this;
      gui.button("_reset", "Reset", function() {
        _appstate.reset();
        redraw_all();
      });
      
      gui.button("_run", "Optimize", function() {
        _appstate.do_optimize_timer();
      });
      
      gui.check("DRAW_COLORS", "Draw Colors");
      gui.check("DRAW_IDS", "Draw IDs");
      gui.check("DRAW_MASK", "Draw Mask");
      
      var panel = gui.panel("Indices");
      panel.close();
      
      panel.button("saveoffs", "Save", function() {
        var buf = this.gen_offsets_file();
        var blob = new Blob([buf], {type : 'application/x-octet-stream'});
        var url = URL.createObjectURL(blob);
        
        window.open(url);
      }, this);
      
      panel.check("LIMIT_INTENSITY", "Limit Intensity");
      panel.slider("INTENSITY_STEPS", "Steps", 1, 100, 1, true, true);
      panel.slider("ID_INTENSITY_STEPS", "ID Steps", 1, 1400, 1, true, true);
      panel.check("BRUTE_FORCE_IDS", "Brute Force");
      
      gui.check("RANDOM_SAMPLE", "Random Domain");
      gui.check("PROGRESSIVE", "Progressive");
      
      var panel = gui.panel("Point Cache");
      panel.check('USE_OFFSET_FUNCTIONS', 'Procedural Offsets');
      
      panel.button("clear_cache", "Clear Cache", function() {
        console.log("clearing offsets");
        
        _appstate.generator.clear_offsets();
        redraw_all();
      }, this);
      
      /*
      var panel = gui.panel("FFT");
      var this2 = this;
      panel.button("fft", "FFT", function() {
        _appstate.offsets_fft()
      });
      //*/
      
      var panel = gui.panel("Graph Offset Functions");
      
      panel.check("DRAW_OFFSET_FUNCS", "Graph Offsets");
      panel.check("SMOOTH_GRAPH", "Smooth Graph");
      
      panel.slider("GRAPH_SCALE", "Graph Scale", 0.0, 1.0, 0.0001, false, true);
      panel.slider("GRAPH_PAN", "Graph Pan", 0.0, 1.0, 0.0001, false, true);
      
      panel.button("clear_graph_sliders", "ResetGraphSliders", function() {
        console.log("clearing offsets");
        
        this.sliders.sliders[1] = this.sliders.sliders[2] = this.sliders.sliders[3] = 0;
        this.sliders.sliders[4] = 0.5;
        
        this.sliders.save();
        redraw_all();
      }, this); 

    }
  ]);
  
  var animreq = undefined;
  window.redraw_all = function() {
    if (animreq == undefined) {
      animreq = requestAnimationFrame(function() {
        //console.log("draw");
        
        animreq = undefined;
        _appstate.draw();
      });
    }
  }
  
  console.log("loaded");
  
  window._appstate = new AppState();
  _appstate.reset();
  
  _appstate.canvas = document.getElementById("canvas");
  _appstate.g = _appstate.canvas.getContext("2d");
  
  redraw_all();
  
  window.addEventListener("touchstart",function(e) {
    //console.log(e.touches[0]);
    _appstate.on_mousedown(e.touches[0]);
  });
  
  //*
  window.addEventListener("touchmove",function(e) {
    //console.log(e.touches[0]);
    this.mdown = true;
    _appstate.on_mousemove(e.touches[0]);
    //e.preventDefault()
  });
  window.addEventListener("touchcancel",function(e) {
    //console.log(e.touches[0]);
    _appstate.on_mouseup(e.touches[0]);
    //e.preventDefault()
  });
  
  window.addEventListener("touchend",function(e) {
    //console.log(e.touches[0]);
    _appstate.on_mouseup(e.touches[0]);
    //e.preventDefault()
  });
  //*/
  
  window.addEventListener("keydown", _appstate.on_keydown.bind(_appstate));
  window.addEventListener("mousedown", _appstate.on_mousedown.bind(_appstate));
  window.addEventListener("mousemove", _appstate.on_mousemove.bind(_appstate));
  window.addEventListener("mouseup", _appstate.on_mouseup.bind(_appstate));
  
  return exports;
});

