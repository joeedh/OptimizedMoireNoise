var _aa_generator = undefined;
define([
  "util", "const", "aa_generators", "aa_types", "localforage", "image", "vectormath"
], function aa_generator(util, cconst, aa_generators, aa_types, localforage, image, vectormath) {
  'use strict';
  
  var exports = _aa_generator = {};
  
  var indexedDB = self.indexedDB || self.webkitIndexedDB 
               || self.mozIndexedDB || self.OIndexedDB || self.msIndexedDB;
  
  
  window._test_req = function() {
    navigator.webkitPersistentStorage.requestQuota(1024*1024*10,
      function(e) { console.log("e!", arguments)},
      function(e) { console.log('Error', e); }
   );
  }
  
  var SmallIDB = util.Class([
    function _delete_db() {
      indexedDB.deleteDatabase(this.dbname);
    },
    
    function constructor() {
      this.dbname = "_bluenoise_10";
      this.request = indexedDB.open(this.dbname, 5, {version : 5, storage : 'persistent '});
      var this2 = this;
      
      this.request.onupgradeneeded = function() {
        console.log("onupgradeneeded called!");
        var db = this2.request.result;
        
        var store = db.createObjectStore("settings");
        
        console.log("store", store)
        
        store.transaction.oncomplete = function() {
          console.log("succeeded in initializing database");
        }
        
      }
    },
    
    //val should be an ArrayBuffer or a string
    function set(key, val) {
      var db = this.request.result;
      var tran = db.transaction(settings, "readwrite");  //1 means READ_WRITE
      var store = tran.objectStore(this.dbname);
      
      tran.put(this.dbname, key, val);
    }
  ]);
  
  var get_offset_rets = util.cachering.fromConstructor(vectormath.Vector2, 256);
  
  window._localforage = localforage;
  localforage.setDriver('asyncStorage');

  //stupid localForage isn't working.  use this thing for now.
  //window.localGorage = new SmallIDB();
  
  var Class = util.Class;
  var cachering = util.cachering;
  var get_searchoff = util.get_searchoff;
  
  exports.get_reduce_id = window.get_reduce_id = function get_reduce_id(code, filter_size) {
    var d = filter_size==undefined ? 1 : filter_size;

    var p = 1;
    var reduce_code = "on factor;\n";
    reduce_code += "off period;\non rounded;\n";
    reduce_code += "procedure sample(x, y);\n";
    reduce_code += "    " + code + ";\n" //"    x*seed + y*(seed*0.5-k);\n"; //1.11235
    reduce_code += "\n";
    //ix*seed + iy*(seed*0.5-1.11235)
    reduce_code += "f := "
    
    var first = true;
    for (var i=-d; i<=d; i++) {
      for (var j=-d; j<=d; j++) {
        if (!first)
          reduce_code += " + "
          
        first = false;
        //reduce_code += "(1.0/"+primes[2+p++] + ")*(sample(ix+("+i+"), iy+("+j+"))*"+primes[p++]+"+"+primes[-2+p++]+")\n"
        
        //id += (f*primes[p++])/8;
        reduce_code += "(" + p + " + " + primes[p++] + " * sample(ix+"+i+", iy+"+j+"))/8\n ";
      }
    }
    return reduce_code + ";\n";
  }

  var GENERATOR = exports.GENERATOR = new aa_generators.FuncIxIySeed3();
  
  //var GENERATOR = exports.GENERATOR = new aa_generators.FuncIxIySeed();
  //var GENERATOR = exports.GENERATOR = new aa_generators.ComplexFunc(); //iffy
  //var GENERATOR = exports.GENERATOR = new aa_generators.FuncIxSeedPlusIyOverSeed();
  
  var OX=0, OY=1, OTOT=2;
  
  var AAGen = exports.AAGen = Class([
    function constructor() {
        this._gen = GENERATOR;
        this.offsets = new util.IntHash(OTOT);
        this.load_offsets();
        this.totid = this.offsets.used;
        this.last_slider = undefined;
        this.tot_domain_visited = 0;
        
        this.id_donemap = new util.set();
        this.domain_donemap = {};
    },
    
    function clear_offsets() {
      this.offsets = new util.IntHash(OTOT);
      this.id_donemap = new util.set();
      
      this.save_offsets();
    },
    
    function reset(dimen) {
        this.dimen = dimen;
        
        this.tot_domain_visited = 0;
        this.totid = this.offsets.used;
        
        this.domain_donemap = {};
        this.id_donemap = new util.set();
    },
    
    function step(dimen, params) {
      dimen = Math.min(dimen, 32); //XXX
      
      if (cconst.PROTECT_OFFFSETS) {
        return;
      }
      
      this.totid = this.offsets.used;
      
      if (this.last_slider != params[0]) {
        //this.clear_offsets();
        this.totid = this.offsets.used;
        this.domain_donemap = {};
        this.id_donemap = new util.set();
      }
      
      this.last_slider = params[0];
      
      var size = ~~(dimen);
      
      var DOMAIN_SIZE = cconst.RANDOM_SAMPLE ? cconst.DOMAIN_SIZE : size;
      console.log("  size:", size, size*size, "VISITED", (100*this.tot_domain_visited/(DOMAIN_SIZE*DOMAIN_SIZE)).toFixed(2) + "%", "\n");
      
      var progressive = cconst.PROGRESSIVE;
      
      var tmp = new Array(OTOT);
      tmp.fill(-1, 0, tmp.length);
      
      var GTOT=1;
      var grid = new Float64Array(size*size*GTOT);
      var sample = this._gen;
      
      var this2 = this;
      function filter(f) {
        f = this2._gen.mask_transform(f)
        
        //var steps=2;
        //f = (~~(f*steps))/steps;
       
        return 1.0-f;
      }
      
      var offsets = this.offsets;
      var jitter = false;
      
      if (this.first_step) {
        jitter = true;
        this.first_step = false;
      }
      
      var points = [];
      var hist = new Float64Array(255);
      hist.fill(0, 0, hist.length);
      var histtot = 0;
      var histmax = 0;
      var _i = 0;
      
      var steps = cconst.RANDOM_SAMPLE ? 32*32 : size*size*2;
      steps = 32*32; //XXX
      
      for (var i=0; i<steps; i++) {
        var ix = i % size /* + PANX*/, iy = ~~(i / size) /* + PANY*/;
        
        var ix = ~~(Math.random()*DOMAIN_SIZE);
        var iy = ~~(Math.random()*DOMAIN_SIZE);
        var idx = (iy*DOMAIN_SIZE+ix);
        if (!this.domain_donemap[idx]) {
          this.domain_donemap[idx] = 1;
          this.tot_domain_visited++;
        }
        
        var ret = sample.sample(ix, iy, params);
        
        var _j = 0, stop=0;
        var fully_random = Math.random() > 0.75;
        
        while (!fully_random && cconst.RANDOM_SAMPLE && (ret.id in this.id_donemap)) {
          var ix = ~~(Math.random()*DOMAIN_SIZE);
          var iy = ~~(Math.random()*DOMAIN_SIZE);
          var idx = (iy*DOMAIN_SIZE+ix);
          
          if (!this.domain_donemap[idx]) {
            this.domain_donemap[idx] = 1;
            this.tot_domain_visited++;
          }
          
          var ret = sample.sample(ix, iy, params);
          
          if (_j++ > 100000) {
            console.log("infinite loop!");
            break;
          }
        }
        
        this.id_donemap.add(idx);
        if (this.id_donemap.length >= this.offsets.used-5) {
          this.id_donemap = new util.set();
        }
        
        if (stop) {
          break;
        }
        
        points.push(ix);
        points.push(iy);
        
        if (ret.f < 0) 
          continue;
        
        var f1 = filter(ret.f), id=ret.id;
        var ri = ~~(f1*255*0.9999999);
        
        hist[ri]++;
        histtot += 1;
        histmax = Math.max(hist[ri], histmax);
        
        if (jitter || !(offsets.has(id))) {
          var dx = (Math.random()-0.5)*2.5;
          var dy = (Math.random()-0.5)*2.5;
          
          if (!(offsets.has(id))) {
            this.totid++;
          }
          
          //dx=dy=0;
          tmp[0] = dx;
          tmp[1] = dy;
          offsets.set(id, tmp);
        } else if (!offsets.has(id)) {
          tmp[0] = 0;
          tmp[1] = 0;
          offsets.set(id, tmp);
        }
      }

      /*
      var sum = 0;
      for (var i=0; i<hist.length; i++) {
        hist[i] /= histtot;
        //hist[i] /= histmax;
      }

      //*/
      
      //*
      var sum = 0;
      for (var i=0; i<hist.length; i++) {
        hist[i] /= histtot;
        sum += hist[i];

        hist[i] = sum;
        //hist[i] /= histmax;
      }
      //*/
      
      window.hist = hist;
      window.histtot = histtot;
      
      var rmul = 0.9;
      
      var r;
      if (progressive) {
        var totpoint = size*size;
        r = rmul*Math.sqrt((size*size) / (2*Math.sqrt(3)*totpoint));
      } else {
        r = rmul*Math.sqrt(1.0 / (2*Math.sqrt(3)));
      }
      
      //r = 4.0;
      var r3 = r*3;
      
      var offs = cconst.get_searchoff(3);
      
      for (var i=0; i<points.length; i += 2) {
        var ix = points[i], iy = points[i+1];
      //for (var i=0; i<size*size; i++) {
        //var ix = i % size + PANX, iy = ~~(i / size) + PANY;
        var oix = ix, oiy = iy;
        
        var ret = sample.sample(ix, iy, params);
        if (ret.f < 0) {
          continue;
        }
        
        var f1 = filter(ret.f), id1=ret.id;
        var ri = ~~(f1*255*0.999999);
        f1 = hist[ri];
        
        var totpoint = size*size, r1, r1_rd;
        if (progressive) {
          //don't let radius go to infinity as f1 goes to zero
          r1 = rmul*Math.sqrt((size*size) / (2*Math.sqrt(3)*totpoint*f1));
          totpoint *= (f1*0.96 + 0.04);
          
          r1_rd = (rmul+0.4)*Math.sqrt((size*size) / (2*Math.sqrt(3)*totpoint));
        } else {
          var r1 = r;
          r1_rd = r;
        }
        
        var rd = ~~(Math.sqrt(2)*r1_rd*3+1)+1;
        rd = Math.min(rd, 60);
        
        window.rd = rd;
        
        var offs = cconst.get_searchoff(rd);
       
        ix = ret.co[0], iy = ret.co[1];
        
        var dx1=0, dy1=0;
        
        if (offsets.has(id1) && !cconst.OFFSET_FUNCTIONS) {
          var dxy1 = offsets.get(id1);
          dx1 = dxy1[0], dy1 = dxy1[1];
        }
        ix += dx1, iy += dy1;
        
        var sumx=0, sumy=0, sumw=0;
        
        for (var j=0; j<offs.length; j++) {
          var ix2 = ix + offs[j][0];
          var iy2 = iy + offs[j][1];
          
          if (~~ix2 == oix && ~~iy2 == oiy) {
            continue;
          }
          
          var ret = sample.sample(~~ix2, ~~iy2, params);
          ix2=ret.co[0], iy2=ret.co[1];
          var id2 = ret.id, f2 = filter(ret.f);
          
          if (f2 < 0) continue;
          
          var ri = ~~(f2*255*0.999999);
          /*
          if (ri < 0 || ri > 255 || isNaN(hist[ri])) {
            console.log("eek!", hist[r2], ri, f2, id2, ix, iy, ix2, iy2);
            
            throw new  Error();
          }*/
          f2 = hist[ri];
          
          var r2, r3;
          if (progressive) {
            var ff = Math.max(f1, f2);
            
            var ri = ~~(ff*255*0.999999);
            ff = hist[ri];
            
            totpoint = size*size*((f1*0.5+f2*0.5)*0.0 + ff + 0.000001);
            
            r2 = rmul*Math.sqrt((size*size) / (2*Math.sqrt(3)*totpoint));
            r3 = r2*3;
            //r3=r1*3;
          } else {
            r2=r, r3=r2*3;
          }
          
          var dx2=0, dy2=0;
          
          if (offsets.has(id2) && !cconst.OFFSET_FUNCTIONS) {
            var dxy2 = offsets.get(id2);
            dx2 = dxy2[0], dy2 = dxy2[1];
          }
          ix2 += dx2, iy2 += dy2;

          if (isNaN(ix2) || isNaN(iy2) || isNaN(ix) || isNaN(iy)) {
            console.log(ix2, iy2, ix, iy);
            throw new Error("NaN!");
          }
          
          var dx = (ix2-ix), dy = (iy2-iy);
          var dis = dx*dx + dy*dy;
          
          if (dis > r3) {
            continue;
          }
          
          dis = dis != 0.0 ? Math.sqrt(dis) : 0.0;
          var w = 1.0 - dis/r3;
          
          //w *= w;
          w *= w*w;
          //w *= f2;
          
          if (progressive) {
            //w *= Math.pow(Math.min(f1, f2), 50.0);
            var dd = 3.0;
            var fw = (f2+dd) / (dd+f1);
            //w *= Math.pow(fw, 10.0);
            //w *= (f2/f1)*(f2/f1);
            
                //var fd = f1/(0.00001+2*Math.sqrt(3)*f2);
                //var fd = f2/(0.000001+f1);
                //w *= fd//Math.sqrt(fd+0.0001);
          }
          
          dx *= r/dis;
          dy *= r/dis;
          
          sumx += -dx*w;
          sumy += -dy*w;
          sumw += w;
        }
        
        if (isNaN(sumx) || isNaN(sumy) || isNaN(sumw)) {
          console.log(sumx, sumy, sumw);
          throw new Error("NaN again!");
        }
        
        if (sumw == 0) continue;
        sumx /= sumw;
        sumy /= sumw;
        
        var fac = progressive ? 0.3 : 0.1;
        
        
        ix += sumx*fac;
        iy += sumy*fac;
        
        dx1 = ix - oix;
        dy1 = iy - oiy;
        
        tmp[0] = dx1;
        tmp[1] = dy1;
        offsets.set(id1, tmp);
      }
      
      redraw_all();
      var ratio = this.totid / this.tot_domain_visited;
      
      console.log("\nTOTID", this.totid, " of ", DOMAIN_SIZE*DOMAIN_SIZE, "ratio:", ratio.toFixed(3));
      console.log("  visited", this.id_donemap.length, "of", this.offsets.used);
      
      if (++this.pass % 15 == 0) {
        //PANX = ~~(Math.random()*this.dimen*SCALE-size*0.125);
        //PANY = ~~(Math.random()*this.dimen*SCALE-size*0.125);
      }
    },
    
    function load_offsets() {
      if (localStorage.startup_file_bn10_offsets != undefined) {
        var json = JSON.parse(localStorage.startup_file_bn10_offsets);
        this.offsets = util.IntHash.fromJSON(json);
      }
      return;
      
      var this2 = this;
      localforage.getItem("startup_file_bn10_offsets").then(function(offs) {
        var tmp = [0, 0];
        
        for (var i=0; i<offs.length; i += 2) {
          var x = offs[i], y = offs[i+1];
          tmp[0] = x, tmp[1] = y;
          var off = aa_types.decode_offset(tmp);
          
          tmp[0] = off[0], tmp[1] = off[1];
        }
        
        if (offs == null || offs == undefined) {
          return;
        }
        
        var json = JSON.parse(offs);
        this2.offsets = util.IntHash.fromJSON(json);
      });
    },
    
    function save_offsets() {
      localStorage.startup_file_bn10_offsets = JSON.stringify(this.offsets.toJSON());
      return; //XXX
      
      var offs = [];
      
      this.offsets.forEach(function(key, data) {
        var shortoff = aa_types.encode_offset(data);
        
        offs.push(key);
        offs.push(shortoff[0]);
        offs.push(shortoff[1]);
      }, this);
      
      var view = new DataView(new ArrayBuffer((offs.length/3)*8));
      var offview = new Uint16Array(view.buffer);
      var idview = new Int32Array(view.buffer);
      
      for (var i=0; i<offs.length; i += 3) {
        var bytei = (i/3)*8;
        
        idview[bytei>>2] = offs[i];
        offview[(bytei+1)>>2] = offs[i+1];
        offview[(bytei+2)>>2] = offs[i+2];
      }
      
      console.log(view.buffer.byteLength, JSON.stringify(this.offsets.toJSON()).length);
      
      
      localforage.setItem("startup_file_bn10_offsets", offs);
    },
    
    function get_offset(aa_return, params) {
      var ret = get_offset_rets.next();      
      
      if (cconst.USE_OFFSET_FUNCTIONS) {
        var f = cconst.OFFSET_FUNC_FMODE ? aa_return.f : aa_return.float_id;
        
        ret[0] = this._gen.offset_x(f, params);
        ret[1] = this._gen.offset_y(f, params);
        
      } else if (this.offsets.has(aa_return.id)) {
        var dxdy = this.offsets.get(aa_return.id);
        
        ret[0] = dxdy[0];
        ret[1] = dxdy[1];
      } else {
        ret[0] = ret[1] = 0;
      }

      return ret;
    },
    
    function gen(points, size1, params, image_tiles) {
      var sampler = this._gen;
      var tileidx = image.tileidx;
      var border = 4;
      
      var mask_image = image_tiles.tiles[tileidx(cconst.TILES.MASK)], mask = mask_image.data;
      var graph_image = image_tiles.tiles[tileidx(cconst.TILES.GRAPH)], graph = graph_image.data;
      var large_image = _appstate.large_mask, large = large_image.data;
      var offsets = this.offsets;
      
      large_image.data.fill(0, 0, large_image.data.length);
      
      var size = size1 + border*2;
      var panx = cconst.DOMAIN_PANX*cconst.DOMAIN_PAN_MUL;
      var pany = cconst.DOMAIN_PANY*cconst.DOMAIN_PAN_MUL;
      
      for (var i=0; i<size*size; i++) {
        var ix = i % size, iy = ~~(i / size);
        
        ix += panx;
        iy += pany;
        
        ix -= border;
        iy -= border;
        
        var oix=ix, oiy=iy;
        
        var ret = sampler.sample(ix, iy, params);
        var f = ret.f, id = ret.id, float_id = ret.float_id;
        ix = ret.co[0], iy = ret.co[1];
        
        var dxdy = this.get_offset(ret, params);
        
        ix += dxdy[0];
        iy += dxdy[1];
        
        var x = (ix-panx)/size1, y = (iy-pany)/size1;
        
        if (f < 0) continue;
        
        var pi = points.length;
        for (var j=0; j<PTOT; j++) {
          points.push(0);
        }
        
        points[pi+PX] = x;
        points[pi+PY] = y;
        points[pi+PIX] = oix;
        points[pi+PIY] = oiy;
        points[pi+PID] = id;
        points[pi+PGEN] = this._gen.mask_transform(f);
        points[pi+PF] = f;
        points[pi+PFID] = float_id;
        
        //f = 1.0 - (1.0-f)*(1.0-f);
        //f = Math.pow(f, 10.0);
        var fi = ~~(this._gen.mask_transform(f)*255);
        
        //ix -= border>>1;
        //iy -= border>>1;
        
        ix -= panx;
        iy -= pany;
        
        var idx = ((~~(iy+0.5))*size1 + (~~(ix+0.5)))*4;
        
        if (ix < 0 || iy < 0 || ~~(ix) >= size1 || ~~(iy) >= size1) {
          continue;
        }
        
        mask[idx] = mask[idx+1] = mask[idx+2] = fi;
        mask[idx+3] = 255;
        
        var idx2 = ((~~(4*iy))*(size1*4) +(~~(4*ix)))*4;
        
        large[idx2] = large[idx2+1] = large[idx2+2] = fi;
        large[idx2+3] = 255;
      }
    }
  ]);
  return exports;
});
