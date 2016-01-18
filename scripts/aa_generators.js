var _aa_generators = undefined;
define([
  "util", "const", "aa_types"
], function aa_generators(util, cconst, aa_types) {
  'use strict';
  
  console.log(aa_types);
  
  var exports = _aa_generators = {};
  
  var Class = util.Class;
  var cachering = util.cachering;
  var get_searchoff = util.get_searchoff;
  
  var fract = Math.fract, tent = Math.tent, cos = Math.cos, sin = Math.sin,
      sqrt = Math.sqrt, abs = Math.abs, floor = Math.floor, ceil = Math.ceil,
      atan2 = Math.atan2, atan=Math.atan, acos=Math.acos, asin=Math.asin;
      
  function cos1(f) {
    return cos(f*Math.PI)*0.5 + 0.5;
  }
  
  var gen_rets = util.cachering.fromConstructor(aa_types.AAReturn, 256);
  
  var isincos_rets = new util.cachering(function() {
    return [0, 0];
  }, 32);
  
  function isincos(s1) {
    var steps = 32;
    var ds = s1/steps, s=0;
    var ret = isincos_rets.next();
    
    var x = 0, y = 0;
    
    for (var i=0; i<steps; i++, s += ds) {
      var k = s;
      var th = (s*s)/2;
      
      var dx1 = Math.sin(th), dy1 = Math.cos(th);
      
      var dy2 = -dx1*s;
      var dx2 = dy1*s;
      
      var dx3 = dy1 - dx1*s*s;
      var dy3 = dx1 - dy1*s*s;
      
      var dx4 = s*(-3*dy1 + dx1*s*s);
      var dy4 = s*(-dy1*s*s - 3*dx1);
      
      x += dx1*ds + 0.5*dx2*ds*ds + (1/6)*dx3*ds*ds*ds + (1/24)*dx4*ds*ds*ds*ds;
      y += dy1*ds + 0.5*dy2*ds*ds + (1/6)*dy3*ds*ds*ds + (1/24)*dy4*ds*ds*ds*ds;
    }
    
    ret[0] = x;
    ret[1] = y;
    
    return ret;
  }
  window.isincos = isincos;
  
  var GrateGen = exports.GrateGen = Class(aa_types.AAGenerator, [
    function _sample_intern(ix, iy, params) {
      return cos1(ix*params[0] - iy*params[1]);
    },
    
    function sample(ix, iy, params) {      
      var dsize = 15;
      var f = this._sample_intern(ix, iy, params);
      
      var ret = gen_rets.next();

      ret.co[0] = ix;
      ret.co[1] = iy;
      
      ret.f = f;
      ret.id = ~~(f*(1<<17));
      //ret.id = this._compute_id(ix, iy, params);
      
      return ret;
    }
  ])
  
  var GridGen = exports.GridGen = Class(aa_types.AAGenerator, [
    function sample(ix, iy, params) {      
      var dsize = 15;
      
      var ret = gen_rets.next();

      ret.co[0] = ix;
      ret.co[1] = iy;

      ix = ix % dsize;
      iy = iy % dsize;
      
      var f = (iy*dsize+ix)/(dsize*dsize);
      ret.id = ~~(f*(1<<30));

      f = Math.fract(f*200.0);
      ret.f = f;
      
      return ret;
    }
  ])
  
  var transform_ret = [0, 0];
  
  function transform(ix, iy, th, is_rev) {
      //*
      if (is_rev) {
        th = 1.0 / th;
      }
      
      var ix2 = ix*th - iy/th;
      var iy2 = iy*th + ix/th;
      //*/
      
      /*
      th *= is_rev ? -Math.PI*0.5 : Math.PI;
      var ix2 = Math.cos(th)*ix - Math.sin(th)*iy;
      var iy2 = Math.cos(th)*iy + Math.sin(th)*ix;
      //*/
      
      transform_ret[0] = ix2;
      transform_ret[1] = iy2;
      
      return transform_ret;
  }
  
/*

on factor;
off period;

procedure fract(x);
  x - floor(x);

procedure wave(x);
  cos(x)*0.5+0.5;
  
procedure sample(x, y);
  wave(x*seed + 3*y/seed);

f := sample(x, y);

*/
  
  var _id_out = [undefined];
  
  function fract_df_tester(ix, iy, id_out) {
      function wave(f1, mul) {
        var f = Math.fract(f1*mul);
        f *= f*f;
        
        return f;
      }
      
       
      function wave_dv(f1, mul) {
        var f = Math.fract(f1*mul);
        return 3*f*f*mul;
      }
      
      function wave_dv2(f1, mul) {
        var f = Math.fract(f1*mul);
        return 6*f*f*f*mul;
      }
      
      /*
      on factor;
      off period;
      
      operator wave;
      operator greaterthan;
      
      forall r,s,x let df(greaterthan(r, s), x) = 0;
      
      forall r,s,x let df(min(r, s), x) = greaterthan(r, s)*df(r, x) + greaterthan(s, r)*df(s, x);
      forall r,s,x let df(max(r, s), x) = greaterthan(s, r)*df(r, x) + greaterthan(r, s)*df(s, x);
      
      fx := max(wave(ix/2), wave(iy/2));
      fy := max(wave(ix/4), wave(iy/4));
      f := min(fx, fy);
      
      */
      
      function sample(ix, iy) {
        var a = Math.max(wave(ix, 0.5) , wave(iy, 0.5));
        var b = Math.max(wave(ix, 0.25) , wave(iy, 0.25));
        
        return Math.min(a, b);
      }
      
      function gt(a, b) {
        return a >= b ? 1 : 0;
      }
      
      function getdf(ix, iy) {
        var min = Math.min, max = Math.max;
        /*
        return wave_dv(ix, 1/4)*gt(max(wave(ix, 1/4), wave(iy, 1/4)), max(wave(ix, 1/2), wave(iy, 1/2)))
                                  * gt(wave(iy, 1/4), wave(ix, 1/4)) + 
               wave_dv(ix, 1/2)*gt(max(wave(ix, 1/2), wave(iy, 1/2)), max(wave(ix, 1/4), wave(iy, 1/4)))
                                  * gt(wave(iy, 1/2), wave(ix, 1/2))
        //*/     
        var a1 = Math.max(wave(ix, 0.5) , wave(iy, 0.5));
        var b1 = Math.max(wave(ix, 0.25) , wave(iy, 0.25));
        
        var a = wave(ix, 0.5) > wave(iy, 0.5) ? wave_dv(ix, 0.5) : 0.0;
        var b = wave(ix, 0.25) > wave(iy, 0.25) ? wave_dv(ix, 0.25) : 0.0;
        
        return a1 < b1 ? b : a;
      }
      
      function getdf2(ix, iy) {
        var min = Math.min, max = Math.max;
        /*
        return wave_dv(ix, 1/4)*gt(max(wave(ix, 1/4), wave(iy, 1/4)), max(wave(ix, 1/2), wave(iy, 1/2)))
                                  * gt(wave(iy, 1/4), wave(ix, 1/4)) + 
               wave_dv(ix, 1/2)*gt(max(wave(ix, 1/2), wave(iy, 1/2)), max(wave(ix, 1/4), wave(iy, 1/4)))
                                  * gt(wave(iy, 1/2), wave(ix, 1/2))
        //*/     
        var a1 = Math.max(wave_dv(ix, 0.5) , wave_dv(iy, 0.5));
        var b1 = Math.max(wave_dv(ix, 0.25) , wave_dv(iy, 0.25));
        
        var a = wave_dv(ix, 0.5) > wave_dv(iy, 0.5) ? wave_dv2(ix, 0.5) : 0.0;
        var b = wave_dv(ix, 0.25) > wave_dv(iy, 0.25) ? wave_dv2(ix, 0.25) : 0.0;
        
        return a1 < b1 ? b : a;
      }
      
      var dx = getdf2(ix, iy);
      var dy = getdf2(iy, ix);
      
      var dx2 = getdf(ix, iy);
      var dy2 = getdf(iy, ix);
      
      var df = 0.00001;
      var a = sample(ix-df, iy);
      var b = sample(ix+df, iy);
      //var dx = (b-a) / (2*df);
      
      if (_id_out != undefined) {
      //  _id_out[0] = dx;
      }
      var dot = Math.sqrt(dx*dx+dy*dy);
      
      var f = sample(ix, iy);
      var dv = Math.max(dx, dy);
      var dv2 = Math.max(dx2, dy2);
      
      dv = dx*0.7 + dy*0.3;
      dv2 = dx*0.3 + dy*0.7;
      
      dv = dv*0.2 + dv2*0.7 + (1.0-f)*(1.0-f)*0.1;
      
      /*
      //dv = dx*0.5+0.25*dy;
      var s = 16;
      dx = ~~(dx*s+0.5);
      dy = ~~(dy*s+0.5);
      dv = (dy*s+dx) / (s*s);
      //*/
      
      //dv = dx*0.25 + dy*2.0;
      
      //dv *= 0.125;
      
      if (_id_out != undefined) {
        _id_out[0] = dv;
      }
      return Math.pow(f, 1.0/3.0)
      
      var df = 0.000000001;
      var a = sample(ix-df, iy);
      var b = sample(ix+df, iy);
      var dx = (b-a) / (2*df);
      
      var a = sample(ix, iy-df);
      var b = sample(ix, iy+df);
      var dy = (b-a) / (2*df);
      
      var dot = dx*dx// + dy*dy;
      dot *= 0.5;
      
      var f = sample(ix, iy);
      return f//dot*0.5+0.5;
  }
  
  var SimpleGen = exports.SimpleGen = Class(aa_types.AAGenerator, [
    function _sample_intern(ix, iy, params, id_out) {
      var seed = params[0];
      
      
      var cos = Math.cos, sin = Math.sin;
      
      var x=ix, y=iy;
      var th = ix*seed + 3*iy/seed;
      var f = (cos(th)+1)/2;
      var dx = (-sin(th)*seed)/2;
      var dy = (-3*sin(th))/(2*seed);
      
      var f = cos1(ix*seed + 3*iy/seed);
      var dot = dx*dx+dy*dy;
      //return dot*0.15
      if (id_out != undefined) {
        id_out[0] = dot;
      }
      
      return f;
      //var dx = cos1(ix*seed - iy/seed);
      //var dy = cos1(iy*seed + ix/seed);
      
      //*
      var th = seed;

      var ret = transform(ix, iy, th, true);
      var ix2 = ret[0], iy2 = ret[1];
      
      ix2 = Math.floor(ix2);
      iy2 = Math.floor(iy2);

      ret = transform(ix2, iy2, th, false);
      var dx = ret[0], dy = ret[1];
      
      dx = Math.fract(dx*1.0000000000001);
      dy = Math.fract(dy*1.0000000000001);
      //*/
      
      var f = Math.min(dx, dy);
      
      if (cconst.BRUTE_FORCE_IDS && cconst.LIMIT_INTENSITY) {
        f = (~~(f*cconst.INTENSITY_STEPS))/cconst.INTENSITY_STEPS;
      }
      
      return f;
    },
    
    function sample(ix, iy, params) {
      _id_out[0] = undefined;
      
      var f = this._sample_intern(ix, iy, params, _id_out);
      
      if (_id_out[0] == undefined) {
        _id_out[0] = f;
      }
      
      var ret = gen_rets.next();
      var d1 = params[1]*1000, d2 = params[2]*1000;
      
      var fd = f;
      //var fd = f*f*(3.0 - 2.0*f);
      //fd = 1.0-Math.pow(1.0-fd, 4.0);
      
      fd = Math.exp(-fd*1);
      
      if (cconst.OFFSET_FUNCTIONS) {
        var addx, addy;
        var rnd1 = Math.fract(1.0 / (0.000001*(ix*ix+iy*iy) + 0.00001))*2-1;
        var rnd2 = Math.fract(1.0 / (0.000001*(ix*iy-ix) + 0.00001))*2-1;
        
        //rnd1 = rnd1*0.5 + 0.5;
        //rnd2 = rnd2*0.5 + 0.5;
        
        addx = 1.5*(2.45-f*f)*Math.cos(fd*d1+params[3]*Math.PI)*0.5 + 0.5*Math.cos(fd*d2+params[3]*Math.PI);
        addy = 1.5*(2.45-f*f)*Math.cos(fd*d1+params[4]*Math.PI)*0.5 + 0.5*Math.cos(fd*d2 + params[4]*Math.PI);
        
        if (Math.fract((fd*d1+params[3]*Math.PI)/Math.PI-0.25) > 0.5) {
          addx += rnd1*0.2;
        }
        if (Math.fract((fd*d1+params[4]*Math.PI)/Math.PI-0.25) > 0.5) {
          addy += rnd2*0.2;
        }
        
        //var f2 = 1.0 - f;
        //var r = isincos(f2*10.0*(params[1]*5.0));
        //addx = r[0];
        //addy = r[1];
        
        ret.co[0] = ix + addx; 
        ret.co[1] = iy + addy;
      } else {
        ret.co[0] = ix;
        ret.co[1] = iy;
      }
      
      var df = 0.5;
      
      var k = params[0];  params[0] -= df;
      var a = this._sample_intern(ix, iy, params);
      params[0] = k + df;
      var b = this._sample_intern(ix, iy, params);
      params[0] = k;
      
      var df = (b-a)/(2*df);
      
      df *= 0.015;
      if (df > 1.0 || df < -1.0)
        df *= 0.5;
      
      df = df*0.5 + 0.5;
      
      df = Math.floor(df/0.0001)*0.0001;
      
      //var fres = (1<<14);
      //f = (~~(f*fres))/fres;
      
      var id = _id_out[0];
      
      if (cconst.LIMIT_INTENSITY) {
        var isteps = cconst.ID_INTENSITY_STEPS;
        id = (~~(id*isteps))/isteps;
        f = (~~(f*cconst.INTENSITY_STEPS))/cconst.INTENSITY_STEPS;
     }
      ret.f = f;
      
      ret.id = ~~(id*(1<<7) + 0.5) + 3;
      if (cconst.BRUTE_FORCE_IDS) {
        ret.id = this._compute_id(ix, iy, params)+3;
      }
      
      return ret;
    }
  ]);
  
  
  var BetterGen = exports.BetterGen = Class(aa_types.AAGenerator, [
    function _sample_intern(ix, iy, params) {
      var seed = params[0];
      var k = params[1];
      
      return Math.fract(ix*seed + iy*(seed*0.5-k));
      return Math.fract(ix*seed + iy/seed);
    },
    
    function sample(ix, iy, params) {
      var seed = params[0];
      var k = params[1];
      
      var ret = gen_rets.next();
      
      ret.f = this._sample_intern(ix, iy, params);
      
      ret.co[0] = ix;
      ret.co[1] = iy;
      

      //for generator equation ix*seed + iy/seed
     // ret.id =  Math.fract(120.5*(ix*iy*seed + 0.183609958506224066390041*ix*seed
     //                      + 0.993775933609958506224066*iy*seed
     //                      + 0.0829875518672199170124479*seed + 0.337136929460580912863071));
     // ret.id = (120.5*(ix*seed  + iy + 0.99377593361*seed  + 0.337136929461*seed+ 0.183609958506))/seed;
      
      //ret.id = (9.75*(ix*seed  + iy + 0.551282051282*seed  + 0.576923076923*seed+ 0.179487179487))/seed;
      ret.id = 9.75*(ix*seed + 0.5*iy*seed - 1.11235*iy + 0.641025641026*seed + 0.377270512821);
      ret.id = 9.75*(ix*seed - iy*k + 0.5*iy*seed - 0.179487179487*k + 0.641025641026*seed+ 0.576923076923);

      ret.id = Math.fract(ret.id);
      
      //ret.id = Math.fract((964*ix*iy + 177*ix + 958*iy + 80)*seed);
      //ret.id = Math.fract((3.06371527978*ix*iy - 1.9623806683*ix -
      //                    3.4497321402*iy + 7.68931316064)*seed);
      
      if (0) {
        /*
        ret.id = -(1.43725223068*(iy*seed-0.475793087964*seed -9.6452089285) - 
                   11.4747696325*(iy - 0.0726803870627)*ix*seed);
        
        ret.id =  9.75*(ix*iy*seed + 0.179487179487179487179488*ix*seed
                + 0.551282051282051282051282*iy*seed
                + 0.0512820512820512820512823*seed + 0.576923076923076923076923);
        */
        //ret.id=(11822993527724*ix*iy*seed-859299745835*ix*seed-1480868406539
        //    *iy*seed+704586952015*seed+14283285176657)/1030346918185;
        
        //ret.id = Math.fract(ret.id);
        //ret.id = Math.fract(1.0 / (0.000000001*ret.id*ret.id + 0.000001));
        
        //radius 10 filter
        ret.id = 78026.5*(ix*iy*seed + 0.183618706466*ix*seed + 3.90346228525*iy*seed
                       + 0.154783951612*seed + 0.15613445432)
        
        //radius 4 filter
        ret.id = 1837.25*(ix*iy*seed + 0.186896176350523880800109*ix*seed
                 + 1.74540753844060416383181*iy*seed
                 + 0.084637365627976595455161*seed + 0.225949108722275139474758);
            
        ret.id = Math.fract(ret.id);
        
        
        //ret.id = ~~ret.id;
      }
      
      ret.id = Math.floor(ret.id*((1<<19)-1));
      
      if (cconst.BRUTE_FORCE_IDS) {
        ret.id = this._compute_id(ix, iy, params)+3;
      }
      
      return ret;
    }
  ]);
 
  return exports;
});
