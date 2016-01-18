var _aa_types = undefined;
define([
  "util", "const", "vectormath"
], function aa_types(util, cconst, vectormath) {
  'use strict';
  
  var exports = _aa_types = {};
  
  var Class = util.Class;
  var cachering = util.cachering;
  var get_searchoff = util.get_searchoff;
  
  var encode_offset_rets = new util.cachering(function() {
    return [0, 0];
  }, 32);
  
  var off_min = -55;
  var off_max = 55;
  
  //encodes offsets into shorts
  var encode_offset = exports.encode_offset = function(offset) {
    var ret = encode_offset_rets.next();
    
    ret[0] = ~~(((offset[0] - off_min) / (off_max - off_min)) * 65535);
    ret[1] = ~~(((offset[1] - off_min) / (off_max - off_min)) * 65535);
    
    ret[0] = Math.min(Math.max(ret[0], 0.0), 65535);
    ret[1] = Math.min(Math.max(ret[1], 0.0), 65535);
    
    return ret;
  }
  
  var decode_offset = exports.decode_offset = function(offset) {
    var ret = encode_offset_rets.next();
    
    ret[0] = (offset[0]/65535) * (off_max - off_min) + off_min;
    ret[1] = (offset[1]/65535) * (off_max - off_min) + off_min;
    
    return ret;
  }
  
  var AAReturn = exports.AAReturn = Class([
    function constructor() {
      this.co = new vectormath.Vector2();
      this.id = -1;
      this.f = -1;
    }
  ]);

  var LEVEL_STEPS = 255;
  
  var _get_id_seeds = exports._get_id_seeds = new Array(LEVEL_STEPS);
  var _get_id_muls  = exports._get_id_muls  = new Array(LEVEL_STEPS);
  var _seed = 0;
  for (var i=0; i<LEVEL_STEPS; i++) {
    var rnd = Math.fract(1.0 / (0.0000001234*_seed*_seed + 0.000001));
    rnd = ~~(rnd*(2<<25));

    if (_get_id_seeds.indexOf(rnd) >= 0) {
      throw new Error("psuedo-randomization error!");
    }

    _get_id_seeds[i] = rnd;
    _seed += 0.001;


    rnd = Math.fract(1.0 / (0.0000001234*_seed*_seed + 0.000001));
    rnd = ~~(rnd*(2<<15));
    
    if (_get_id_muls.indexOf(rnd) >= 0) {
      throw new Error("psuedo-randomization error!");
    }

    _get_id_muls[i] = 1 + rnd;
    _seed += 0.001;
  }

  //33554393 <- prime
  //2689861  <- prime
  //1048573  <- prime
  //819173   <- prime
  //262133   <- prime
  //81773    <- prime
  //3067     <- prime
  //3559     <- prime
  //4397     <- prime

/*
  var DF_EPS = 1e-11;
  var AAFunc = exports.AAFunc = Class([
    function f(ix, iy, params) {
      
    },
    
    function df_x(ix, iy, params) {
      var a = this.f(ix-DF_EPS, iy, params);
      var b = this.f(ix+DF_EPS, iy, params);
      return (b - a) / (2*DF_EPS0);
    },
    
    function df_y(ix, iy, params) {
      var a = this.f(ix, iy-DF_EPS, params);
      var b = this.f(ix, iy+DF_EPS, params);
      return (b - a) / (2*DF_EPS0);
    },
    function df_seed(ix, iy, params) {
      var k = params[0]; 
      
      params[0] = k - df;
      var a = this.f(ix-DF_EPS, iy, params);
      params[0] = k + df;
      var b = this.f(ix+DF_EPS, iy, params);
      params[0] = k;
      
      return (b - a) / (2*DF_EPS0);
    },
  ]);
  */
  
  var AAGenerator = exports.AAGenerator = Class([
    function constructor() {
    },
    
    function sample(ix, iy, params) {
      //returns an AAReturn instance
    },

    function _sample_intern(ix, iy, params) {
    },
    
    function _compute_id(ix, iy, params) {
      /*
      var d = 2;
      var id = 0;
      var p = 1;
      
      for (var i=-d; i<=d; i++) {
        for (var j=-d; j<=d; j++) {
          var f = this._sample_intern(ix+i, iy+j, params);
          
          id += (f*cconst.primes[p++] + cconst.primes[p++])/cconst.primes[p++];
          //id += f*cconst.primes[p++];
        }
      }
      
      return Math.fract(id);*/
      
      var offs = cconst.get_searchoff_rect(1); //will return 9x9 grid offsets
      var seed = 0;
      
      for (var i=0; i<offs.length; i++) {
        var ix2 = offs[i][0]+ix, iy2 = offs[i][1]+iy;
        
        var f = this._sample_intern(ix2, iy2, params);

        if (f < 0) 
            continue;
          
        //f = Math.min(Math.max(f, 0.0), 1.0);
        var ri = ~~(f*LEVEL_STEPS*0.999999999999);
        
        seed = (seed*_get_id_muls[ri] + _get_id_seeds[ri]) & 524287; //% 81773//33554393;
      }
      
      return seed;
    }
  ]);
  
  return exports;
});
