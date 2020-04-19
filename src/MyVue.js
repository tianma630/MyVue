// 匹配 book in books
const forReg1 = /^\s*(\S+)\s*in\s*(\S+)\s*$/g;
// 匹配 (book, i) in books
const forReg2 = /^\s*\((\S+),\s*(\S+)\)\s*in\s*(\S+)\s*$/g;
// 匹配 {{name}} - {{age}}
const exprReg1 = /{{([^{{}}]+)}}/g;
// 匹配 'hello' + name + ':' + age
const exprReg2 = /[\s|\+|-|\*|/]([^\s|\+|-|\*|/|'|"]+)[\s|\+|-|\*|/]/g;

/**
 * 是否是dom节点
 * @param {HTMLElement} el 
 */
function isElement(el) {
  return el.nodeType === 1;
}

/**
 * 是否是text节点
 * @param {HTMLElement} el 
 */
function isText(el) {
  return el.nodeType === 3;
}

/**
 * 解析复杂表达式 {{'hello' + name + ':' + age}} => {{'hello' + data.name + ':' + data.age}}
 */ 
function createRenderExpr() {
  function _renderParam(expr, renderParamCb) {
    return expr.replace(exprReg2, (r, $1) => {
      if (/^[a-zA-Z\$].*/.test($1)) {
        if (renderParamCb) {
          renderParamCb($1);
        }
        return 'data.' + $1
      }
      return $1;
    })
  }

  return function renderExpr(expr, data, renderParamCb) {
    let isExpr = false;
    return [expr.replace(exprReg1, (r, $1) => {
      isExpr = true;
      return eval(_renderParam(' ' + $1 + ' ', renderParamCb));
    }), isExpr]
  }
}

const renderExpr = createRenderExpr();

function getValue(expr, vm) {
  return vm.$data[expr];
}

// 指令处理
const directiveHander = {
  text(el, expr, vm) {
    new Watcher(vm, expr, newValue => {
      el.textContent = newValue;
    });
    el.textContent = getValue(expr, vm);
  },
  html(el, expr, vm) {
    new Watcher(vm, expr, newValue => {
      el.innerHTML = newValue;
    });
    el.innerHTML = getValue(expr, vm);
  },
  model(el, expr, vm) {
    new Watcher(vm, expr, newValue => {
      el.value = newValue;
    });
    el.value = getValue(expr, vm);
  },
  for(el, expr, vm) {
    const parentEl = el.parentElement;
    // 缓存第一个节点
    // const cacheEl = el.cloneNode(true);
    parentEl.removeChild(el);
    el.removeAttribute('v-for');

    let forKey = null;
    let forIndex = null;
    let forValue = null;

    let forRegRet = forReg1.exec(expr);
    if (forRegRet) {
      forKey = forRegRet[1];
      forValue = forRegRet[2];
    } else {
      forRegRet = forReg2.exec(expr);
      if (forRegRet) {
        forKey = forRegRet[1];
        forIndex = forRegRet[2];
        forValue = forRegRet[3];
      }
    }

    if (forKey && forValue) {
      let list = vm.$data[forValue];

      list.__ob__.addSub({
        update: () => {
          const childs = parentEl.childNodes; 
          for(let i = childs .length - 1; i >= 0; i--) {
            parentEl.removeChild(childs[i]);
          }

          _render();
        }
      });

      function _render() {
        list = vm.$data[forValue];
        let index = 0;
        list.forEach(item => {
          let cloneEl = el.cloneNode(true);
          parentEl.appendChild(cloneEl);

          const forData = {};
          forData[forKey] = item;
          if (forIndex) {
            forData[forIndex] = index;
          }
          mapCompile([cloneEl], forData, vm.methods, vm, true);
          
          index ++;
        });
      }

      _render();
    }
  }
};

// 文本处理
function textHandle(el, vm, data, inFor) {
  if(!el.nodeValue.trim()) {
    return;
  }

  const expr = el.nodeValue;
  const [exprValue, isExpr] = renderExpr(expr, data, inFor ? () => {} : $1 => {
    new Watcher(vm, expr, newValue => {
      el.nodeValue = newValue;
    });
  });

  if (isExpr) {
    el.nodeValue = exprValue;
  }
}

// 递归遍历节点
function mapCompile(childNodes, data, methods, vm, inFor) {
  function mapChildNodes(childNodes) {
    childNodes.forEach(child => {
      if (isElement(child)) {
        let isFor = false;
        [...child.attributes].forEach(attr => {
          if (attr.name.startsWith('v-')) {
            let directive, eventName;
            [, directive] = attr.name.split('-');
            [directive, eventName] = directive.split(':');
            if (eventName) {
              child.addEventListener(eventName, e => {
                (methods[attr.value] && methods[attr.value].bind(vm))();
              });
            } else if (directive) {
              if (directive === 'for') {
                isFor = true;
              }
              directiveHander[directive](child, attr.value, vm);
            }
          }
        })
  
        if (isElement(child) && child.childNodes.length && !isFor) {
          mapChildNodes([...child.childNodes]);
        }
      } else if (isText(child)) {
        textHandle(child, vm, data, inFor);
      }
    })
  }
  mapChildNodes(childNodes);
}

class MyVue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data || {};

    this.$methods = options.methods || {};

    if (this.$el) {
      this.proxyData(this.$data);

      new Observer(this.$data);

      this.compile(this.$el, this.$data, this.$methods);
    } else {
      throw new Error('el must be set !');
    }
  }

  proxyData(data) {
    Object.keys(data).forEach(key => {
      Object.defineProperty(this, key, {
        get() {
          return data[key];
        },
        set(newValue) {
          data[key] = newValue;
        }
      });
    })
  }

  compile(el, data, methods) {
    el = isElement(el) ? el : document.querySelector(el);

    const fragment = document.createDocumentFragment();

    let child;
    while(child = el.firstChild) {
      fragment.appendChild(child);
    }

    mapCompile([...fragment.childNodes], data, methods, this);

    el.appendChild(fragment);
  }
}

class Observer {
  constructor(data) {
    this.observe(data);
  }

  observe(data) {
    if (data && typeof data == 'object') {
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'object' && data[key].length) {
          this.observeArray(data[key]);
        } else {
          this.defineDirective(data, key, data[key]);
        }
      });
    }
  }

  defineDirective(data, key, value) {
    this.observe(value);
    const dep = new Dep();
    Object.defineProperty(data, key, {
      get() {
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      set: (newValue) => {
        if (value !== newValue) {
          this.observe(newValue);
          value = newValue;
          dep.notify();
        }
      }
    })
  }

  observeArray(array) {
    arrayMethods.__ob__ = new Dep();
    array.__proto__ = arrayMethods;
  }
}

class Dep {
  constructor() {
    this.subs = [];
  }

  addSub(watcher) {
    this.subs.push(watcher);
  }

  notify() {
    this.subs.forEach(watcher => watcher.update())
  }
}

class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;

    this.oldValue = this.get(expr, vm);
  }

  get(expr, vm) {
    Dep.target = this;
    let [value, isExpr] = renderExpr(expr, vm.$data);
    if (!isExpr) {
      value = getValue(expr, vm);
    }
    Dep.target = null;
    return value;
  }

  update() {
    const newValue = this.get(this.expr, this.vm);
    if (newValue !== this.oldValue) {
      this.cb.call(this.vm, newValue);
    }
  }
}

function def (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  });
}

// **** 劫持数组方法，直接复用vue的源码(https://github.com/vuejs/vue/blob/dev/src/core/observer/array.js) ****

const arrayProto = Array.prototype
var arrayMethods = Object.create(arrayProto);

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function (...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    ob && ob.notify();
    return result
  })
})