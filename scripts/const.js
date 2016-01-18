var PX=0, PY=1, PIX=2, PIY=3, PID=4, PGEN=5, PF=6, PTOT=7;

var _const = undefined;
define([
  "util", 'image'
], function cconst(util, image) {
  'use strict';
  
  var exports = _const = {};
  
  exports.GRAPH_SCALE = 0.0;
  exports.GRAPH_PAN = 0.0;
  exports.SMOOTH_GRAPH = true;
  exports.DRAW_COLORS = true;
  exports.DRAW_IDS = true;
  exports.PROGRESSIVE = true;
  
  exports.DIMEN = 24;
  exports.SLIDERS = [0.8471428571428565, 0.0625, 0.0, 0.0, 0.5];
  window._SLIDERS = exports.SLIDERS;
  
  exports.DRAW_IMAGE_SIZE = 6;
  exports.DOMAIN_SIZE = 2048;
  exports.RANDOM_SAMPLE = true;
  exports.DRAW_OFFSET_FUNCS = false;
  
  exports.OFFSET_FUNCTIONS = false;
  
  exports.DOMAIN_PAN_MUL = 128;
  
  exports.USE_MERSENNE = true;
  exports.SCALE = 0.6;
  exports.PANX = -0.1;
  exports.PANY = 0.1;
  exports.DRAW_MASK = false;
  exports.LIMIT_INTENSITY = false;
  exports.INTENSITY_STEPS = 8;
  exports.ID_INTENSITY_STEPS = 8;
  exports.BRUTE_FORCE_IDS = false;
  exports.PROTECT_OFFFSETS = false;
  
  exports.DOMAIN_PANX = 0;
  exports.DOMAIN_PANY = 0;
  
  var TILES = exports.TILES = {
    MASK       : 0,
    GRAPH      : 1,
  };
  
  Math._random = Math.random;
  Math.random = function() {
    if (exports.USE_MERSENNE) {
      return _util.random();
    } else {
      return Math._random();
    }
  }

  window._search_offs = new Array(64);
  _search_offs[0] = [];

  function gen_soff_variants(soff) {
    var steps = 16;
    var hash = {};
    
    function shuffle(lst) {
      for (var i=0; i<lst.length; i++) {
        var ri = ~~(Math.random()*lst.length*0.999999);
        var t = lst[ri];
        
        lst[ri] = lst[i];
        lst[i] = t;
      }
    }
    
    for (var i=0; i<soff.length; i++) {
      var ix = soff[i][0], iy = soff[i][1];
      var dis = ix*ix + iy*iy;
      
      if (!(dis in hash)) {
        hash[dis] = [];
      }
      
      var lvl = hash[dis];
      lvl.push([ix, iy]);
    }
    
    var ret = [];
    
    for (var si=0; si<steps; si++) {
      var lst = [];
      
      for (var k in hash) {
        var lvl = hash[k];
        
        //don't shuffle base level
        if (si > 0) {
          shuffle(lvl);
        }
        
        for (var j=0; j<lvl.length; j++) {
          lst.push(lvl[j]);
        }
      }
      
      lst.sort(function(a, b) {
        return a[0]*a[0] + a[1]*a[1] - b[0]*b[0] - b[1]*b[1];
      });
      
      ret.push(lst);
    }
    
    return ret
  }
  
  var _roffs = {};
  var get_searchoff_rect = exports.get_searchoff_rect = function get_searchoff_rect(n, noreport) {
    if (n in _roffs) {
      return _roffs[n];
    }
    
    var ret = [];
    
    for (var i=-n; i<=n; i++) {
      for (var j=-n; j<=n; j++) {
        ret.push([i, j]);
      }
    }
    
    //sort by distance to origin (center)
    ret.sort(function(a, b) {
      return a[0]*a[0] + a[1]*a[1] - b[0]*b[0] - b[1]*b[1];
    });
    
    _roffs[n] = ret;

    return ret;
  }
  
  var get_searchoff_norand = exports.get_searchoff_norand = function get_searchoff_norand(n, noreport) {
    if (_search_offs[n] != undefined) {
      var variants = _search_offs[n];
      return variants[0];
    }
    
    get_searchoff(n, noreport);
    
    return _search_offs[n][0];
  }
  
  var get_searchoff = exports.get_searchoff = function get_searchoff(n, noreport) {
    var r = n, i=n;
    
    if (_search_offs.length <= n) {
      _search_offs.length = n+1;
    }
    
    if (_search_offs[n] != undefined) {
      var variants = _search_offs[n];
      var ri = ~~(Math.random()*variants.length*0.99999);
      
      return variants[ri];
    }

    if (!noreport)
      console.trace("generate search a off of radius", n, "...");
    
    var lst = [];
    for (var x=-i; x<=i; x++) {
      for (var y=-i; y<=i; y++) {
        var x2 = x < 0 ? x+1 : x;
        var y2 = y < 0 ? y+1 : y;
        
        var dis = x2*x2 + y2*y2;
        dis = dis != 0.0 ? Math.sqrt(dis) : 0.0;
        
        //console.log(dis.toFixed(3), r.toFixed(3));
        
        if (dis > r) {
          continue;
        }
        
        lst.push([x, y]);
      }
    }
    
    //sort by distance to origin (center)
    lst.sort(function(a, b) {
      return a[0]*a[0] + a[1]*a[1] - b[0]*b[0] - b[1]*b[1];
    });
    
   _search_offs[n] = gen_soff_variants(lst);
    
    return exports.get_searchoff(n);
  }

  window.gen_soff_variants = gen_soff_variants;
  
  for (var i=0; i<16; i++) {
      get_searchoff(i, true);
  }
  
  function gen_primes(max) {
    max = max == undefined ? 512 : max;
    
    var ret = new Array(max);
    
    for (var i=0; i<ret.length; i++) {
      ret[i] = i;
    }
    
    for (var j=2; j<ret.length; j++) {
      var k = j+j;
      while (k < ret.length) {
        ret[k] = -1;
        k += j;
      }
    }
    
    var r2 = [];
    for (var i=0; i<ret.length; i++) {
      if (ret[i] != -1) {
        r2.push(ret[i]);
      }
    }
    
    return r2;
  }

  var primes = exports.primes = gen_primes(512*10);

  return exports;
});

