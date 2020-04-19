var arrayProto = Array.prototype;
var arrayMethods = Object.create(arrayProto);

var methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
];

function def (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  });
}

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  var original = arrayProto[method];
  def(arrayMethods, method, function mutator () {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

    var result = original.apply(this, args);

    console.log('result', result, arguments, args)
    // var ob = this.__ob__;
    // var inserted;
    // switch (method) {
    //   case 'push':
    //   case 'unshift':
    //     inserted = args;
    //     break
    //   case 'splice':
    //     inserted = args.slice(2);
    //     break
    // }
    // if (inserted) { ob.observeArray(inserted); }
    // // notify change
    // ob.dep.notify();
    return result
  });
});

let l = [];
l.__proto__ = arrayMethods
l.push(1);

// console.log(l);

let data = {
  abc: 2,
  efg: 3
}

const exprReg1 = /{{([^{{}}]+)}}/g;
const exprReg2 = /[\s|\+|-|\*|/]?([^\s|\+|-|\*|/]+)[\s|\+|-|\*|/]?/g;

function createRenderExpr() {
  function renderParam(expr, prefix) {
    return expr.replace(exprReg2, (r, $1) => {
      if (/^[a-zA-Z\$].*/.test($1)) {
        return prefix + $1
      }
      return $1;
    })
  }

  return function renderExpr(expr, prefix) {
    return expr.replace(exprReg1, (r, $1) => {
      return renderParam($1, prefix)
    })
  }
}

function renderExpr(expr) {
  function renderParam(expr) {
    return expr.replace(exprReg2, (r, $1) => {
      if (/^[a-zA-Z\$].*/.test($1)) {
        return 'data.' + $1
      }
      return $1;
    })
  } 

  return expr.replace(exprReg1, (r, $1) => {
    return renderParam($1)
  })
}

let expr = '{{ 1 + abc / 2}} - {{efg * 2 }} + \'abc\'';
expr = "{{'hello' + name + ':' + age}}"

console.log(createRenderExpr()(expr, 'data.books[0].'))

// let reg = /{{([^{{}}]+)}}/g;

// expr.replace(reg, (r, $1) => {
//   console.log($1)
// })

// let r1 = ' 1 + abc / 2 - abc/2 + efg';

// let reg1 = /[\s|\+|-|\*|/]?([^\s|\+|-|\*|/]+)[\s|\+|-|\*|/]?/g

// r1 = r1.replace(reg1, (r, $1) => {
//   if (/^[a-zA-Z\$].*/.test($1)) {
//     console.log($1)

//     return 'data.' + $1
//   }
//   return $1;
// })

// console.log(r1)

// console.log('1/1'.split(/[/]/));

expr.replace(exprReg2, (r, $1) => {
  if (/^[a-zA-Z\$].*/.test($1)) {
    return 'data.' + $1
  }
  return $1;
})