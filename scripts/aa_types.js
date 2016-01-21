var _aa_types = undefined;
define([
  "util", "const", "vectormath"
], function aa_types(util, cconst, vectormath) {
  'use strict';
  
  var exports = _aa_types = {};
  
  var Class = util.Class;
  var cachering = util.cachering;
  var get_searchoff = util.get_searchoff;
  
  var fract = Math.fract, tent = Math.tent, cos = Math.cos, sin = Math.sin, 
      pow = Math.pow, sqrt = Math.sqrt, exp = Math.exp, log = Math.log,
      acos = Math.acos, asin = Math.asin, atan2 = Math.atan2, atan = Math.atan,
      abs = Math.abs, floor = Math.floor, ceil = Math.ceil;
      
  //handy little version of cosine with 0..1 domain in both x and y
  function cos1(f) {
    return cos(f*Math.PI)*0.5 + 0.5;
  }

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
      this.float_id = -1;
      this.f = -1;
      this.mask_f = -1;
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

//*
  var frand = exports.frand = function(f) {
    f = Math.fract(f)*0.5 + f*0.00001 * f*f*0.0001 + 0.000001;
    f *= 0.000001;
    
    return Math.fract(1.0 / f);
  }
  
  var DF_EPS = 1e-11;
  var AAFunc = exports.AAFunc = Class([
    function f(ix, iy, params) {
    },
    
    //procedurally generated offset x. default is random jitter
    function offset_x(f, params) {
      //sqrt(3) is just an irrational multiplier
      //not sure I need it, but to be safe. . .
      return frand(f*Math.sqrt(3))-0.5;
    },
    
    function offset_y(f, params) {
      //Math.PI is just an irrational multiplier
      //not sure I need it, but to be safe. . .
      return frand(f*Math.PI)-0.5;
    },
    
    Class.static(function create(codeset, add_wave_name) {
      function make_func(name, code, add_wave_name) {
        if (add_wave_name) code = add_wave_name + "(" + code + ")"
        var ret = undefined;
      
        var pi = Math.PI, e = Math.exp(1);
        var min = Math.min, max = Math.max;
        
        eval([
          "ret = function " + name + "(ix, iy, params) {",
          "  var seed = params[0], seed2=params[1], seed3=params[3];",
          "  return " + code + ";",
          "}"
        ].join("\n"));
        
        return ret;
      }
      var methods = [];
      for (var k in codeset) {
        methods.push(make_func(k, codeset[k], k=="f" || k == "id" ? add_wave_name : undefined));
      }
      
      return Class(AAFunc, methods);
    }),
    
    function id(ix, iy, params) {
      return this._filter_id(ix, iy, params);;
    },
    
    function _filter_id(ix, iy, params) {
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
        
        var f = this.f(ix2, iy2, params);

        if (f < 0) 
            continue;
          
        //f = Math.min(Math.max(f, 0.0), 1.0);
        var ri = ~~(f*LEVEL_STEPS*0.999999999999);
        
        seed = (seed*_get_id_muls[ri] + _get_id_seeds[ri]) & 524287; //% 81773//33554393;
      }
      
      return Math.fract(seed/524287);
    },
    
    function df_x(ix, iy, params) {
      var a = this.f(ix-DF_EPS, iy, params);
      var b = this.f(ix+DF_EPS, iy, params);
      return (b - a) / (2*DF_EPS0);
    },
    
    //transforms f (return value of this.f()) to have better distribution for progressive point sets
    function mask_transform(f) {
      return f*f*f*f*0.5 + f*f*f*0.5;
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

    function sample(ix, iy, params) {
      //returns an AAReturn instance
      var ret = aagen_rets.next();
      
      ret.f = this.f(ix, iy, params);
      ret.mask_f = this.mask_transform(ret.f);
      ret.id = this.id(ix, iy, params);
      
      if (cconst.LIMIT_INTENSITY) {
        ret.f = (~~(0.5+ret.f*cconst.INTENSITY_STEPS)) / cconst.INTENSITY_STEPS;
        ret.id = (~~(0.5+ret.id*40*cconst.ID_INTENSITY_STEPS))/ (40*cconst.ID_INTENSITY_STEPS);
      }
      
      if (cconst.BRUTE_FORCE_IDS) {
        ret.id = this._filter_id(ix, iy, params);
      }
      
      ret.float_id = ret.id;
      ret.id = ~~(ret.id*(1<<19));
    
      ret.co[0] = ix;
      ret.co[1] = iy;
      
      return ret;
    }
  ]);
  //*/
  
  var aagen_rets = util.cachering.fromConstructor(AAReturn, 32);
  
  return exports;
});
