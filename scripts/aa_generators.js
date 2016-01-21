var _aa_generators = undefined;
define([
  "util", "const", "aa_types"
], function aa_generators(util, cconst, aa_types) {
  'use strict';
  
  console.log(aa_types);
  
  var exports = _aa_generators = {};
  
  var fract = Math.fract, tent=Math.tent, cos=Math.cos;
  
  function cos1(f) {
      return Math.cos(f*Math.PI)*0.5 + 0.5;
  }
  
  function sfract(f) {
    return Math.fract(f)*2.0 - 1.0;
  }
  
  function stent(f) {
    return Math.tent(f)*2.0 - 1.0;
  }
  
  function spifract(f) {
    return Math.fract(f/Math.PI)*2.0 - 1.0;
  }
  
  function spitent(f) {
    return Math.tent(f/Math.PI)*2.0 - 1.0;
  }
  
  var Class = util.Class;
  var cachering = util.cachering;
  
  var FuncIxIySeed = exports.FuncIxIySeed = aa_types.AAFunc.create({
      f  : "(ix*ix + iy*iy)*this.get_seed(params)",
      id : [
         "817.875*(ix*ix*this.get_seed(params)+2.14030261348005502063274*ix*this.get_seed(params)+iy*iy*",
         "      this.get_seed(params)+0.319119669876203576341128*iy*this.get_seed(params)+8.085893321106526058383*",
         "      this.get_seed(params)+0.712517193947730398899587)"
      ].join("\n")
  }, "fract");
  
  FuncIxIySeed.prototype.get_seed = function(params) {
    return params[0];
    
    //var base = ~~(32*params[1]);
    //var seed = (~~(params[0]*base))/base;
    
    //return seed;
  }
  /*
  f(f(x1)*f(x2) + f(y1)*f(y2)) = f((x1*x2*xk1+xk2) + (y1*y2*yk1+yk2));
  
  procedure step(n);
    (-1)**(n);
  
  operator wave, fract;
  
  forall s let df(wave(s), s) = e**x;
  
  
  fa := wave(x1)*wave(x2) + wave(y1)*wave(y2);
  
  fb := wave(x1*x2*xk1+xk2) + wave(y1*y2*yk1+yk2);
  
  f1 := fa - fb;
  f2 := df(fa, x1) - df(fb, x1);
  f3 := df(fa, y1) - df(fb, y1);
  f4 := df(fa, x1, 2) - df(fb, x1, 2); comment: df(fa, x1), y1) - df(df(fb, x1), y1);
  
  solve({f1, f2, f3, f4}, {xk1, xk2, yk1, yk2});
  
  */
  var FuncIxIySeed3 = exports.FuncIxIySeed3 = aa_types.AAFunc.create({
    id : "9.75*(ix*this.get_seed(params) + iy*this.get_seed(params)*params[1] + iy*params[2] + 0.179487179487179487179487*\
          this.get_seed(params)*params[1] + 0.551282051282051282051282*this.get_seed(params) + 0.179487179487179487179487*params[2] + 1)"
    
    , f: "ix*this.get_seed(params) + iy*(this.get_seed(params)*params[1]+params[2])"
  }, "fract");
  
  var frand = aa_types.frand;
  
  function offwave(f) {
    var f = Math.tent(f*cconst.OFFSET_MUL*0.2);
    
    if (cconst.OFFSET_FUNC != undefined) {
      f = cconst.OFFSET_FUNC.evaluate(f);
    }
    
    f = (f*2-1)*cconst.OFFSET_AMPLITUDE;
    f += (cconst.OFFSET_MIDLEVEL-0.5)*cconst.OFFSET_AMPLITUDE;
    
    return f;
  }
  
  FuncIxIySeed3.prototype.offset_x = function(f, params) {
    f = cconst.OFFSET_FREQ_FUNC.evaluate(f);
    
    return offwave(f+cconst.OFFSET_PHASEX/cconst.OFFSET_MUL + cconst.OFFSET_PHASE/cconst.OFFSET_MUL);
  }
  
  FuncIxIySeed3.prototype.offset_y = function(f, params) {
    f = cconst.OFFSET_FREQ_FUNC.evaluate(f);
    
    return offwave(f+cconst.OFFSET_PHASEY/cconst.OFFSET_MUL + cconst.OFFSET_PHASE/cconst.OFFSET_MUL);
  }
  
  FuncIxIySeed3.prototype.get_seed = function(params) {
    return params[0];
    
    //var base = ~~(32*params[3]);
    //var seed = (~~(params[0]*base))/base;
    //return seed;
  }
  
  /*
  ans=(7*ssx*siy+78+17*six1s*siy+2*
 sin((ix-1)*seed)*siy+4*(4*(2*six1s+ssx
 )+sin((ix-1)*seed))*COSONE*siy+2*(3*(six1s+sin(ix*seed))+sin((ix-1)*seed))*ciy*SINONE
 +((16*COSONE+7)*ciy-6*siy*SINONE)*cos(ix*seed)+((32*COSONE+17)*ciy-6*
 siy*SINONE)*cos((ix+1)*seed)+2*((2*COSONE+1)*ciy-siy*SINONE)*cos((ix-1)*seed))/8

  var cs = cos(seed), ss = sin(seed), csx = cos(seed*ix), csy = cos(seed*iy),
      ssx = sin(seed*ix), ssy = sin(seed*iy), cix = cos(ix), ciy=cos(iy),
      six = sin(ix), siy = sin(iy); 
  var six1s = sin((ix+1)*seed);
  
  ans=9.64623856568467414985216e-127*(
 . 2.52052689745399715524746e+126*(cs*ssx*siy
 . +0.102823095426718089883986*sin(ix*seed-seed)*siy+
 . 0.873996311127103764013883*sin(ix*seed+seed)*siy+
 . 0.173045302739433581167442*ssx*siy*ss+
 . 0.804325278437957759038397*ssx*siy+
 . 4.01010072164200550547547)+8.72330680065624398100415e+125*(cos
 . (seed)-2.24732415577015746052247*ss+0.75)*ciy*sin(
 . ix*seed)+(2.52052689745399715524746e+126*(cs+
 . 0.173045302739433581167442*ss+
 . 0.804325278437957759038397)*ciy-
 . 8.72330680065624398100415e+125*(cs-
 . 2.24732415577015746052247*ss+0.75)*siy)*cos(ix*seed
 . )+
 . 220293121047143726185541100572385478964328643518692292944512249
741319195645998578209544654668181220416063515474890961453056
 . *cos((ix+1)*seed)*ciy)+0.25*cos((ix-1)*seed)*ciy

  */
  var ComplexFunc = exports.ComplexFunc = util.Class(aa_types.AAFunc, [
    function f(ix, iy, params) {
      var seed = params[0];
      var cos = Math.cos;
      
      var base = ~~(32*params[1]);
      seed = (~~(seed*base))/base;
      
      //var ix2 = ix/seed1 + iy*seed1;
      //var iy2 = iy/seed1 - ix*seed1;
      //ix=~~ix2, iy=~~iy2;
      
      var dx = Math.fract(ix*seed - iy/seed)*2-1;
      var dy = Math.fract(iy*seed + ix/seed)*2-1;
      var f = Math.sqrt(dx*dx + dy*dy) / Math.sqrt(2);

      return f;
      
      //return (cos(ix*seed1 - iy/seed1)*0.5+0.5) * (cos(ix/seed1 + iy*seed1)*0.5+0.5);
    },
    
    function id(ix, iy, params) {
      return Math.fract(this.f(ix, iy, params)*139);
      
      //139
      //227
      //3559
      
      /*
      var seed1 = params[0], seed2 = 1/seed1;
      var cos = Math.cos;
      
      //var ix2 = ix/seed1 + iy*seed1;
      //var iy2 = iy/seed1 - ix*seed1;
      //ix=~~ix2, iy=~~iy2;
      
      //filter width 1
      //var id = 2.4375*(cos((ix*seed1*seed1-iy)/seed1)*cos((ix+iy*seed1*seed1)/
      //seed1)+cos((ix*seed1*seed1-iy)/seed1)+cos((ix+iy*seed1*seed1)/seed1)
      //    +3.30769230769);
      
      //filter width 2
      var id = 30.125*(cos((ix*seed1*seed1-iy)/seed1)*cos((ix+iy*seed1*seed1)/
       seed1)+cos((ix*seed1*seed1-iy)/seed1)+cos((ix+iy*seed1*seed1)/seed1)
       +2.34854771784232365145228);

      id = Math.fract(id);
      return id;
      id = cos(id)*0.5+0.5;
      
      return id;//*/
    },
    
    function mask_transform(f) {
       return f*f;
    }
  ]);
  
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
  
  function get_reduce_id(filter_size) {
    var d = filter_size==undefined ? 1 : filter_size;

    var p = 1;
    var reduce_code = "on factor;\n";
    reduce_code += "precision 24;\n";
    reduce_code += "off period;\non rounded;\n";
    reduce_code += "procedure sample(ix, iy);\n";
    reduce_code += "    " + CODE + ";\n"
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

  return exports;
});
