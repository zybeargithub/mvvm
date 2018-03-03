/**
 * compile主要做的事情是
 * 1、解析模板指令，将模板中的变量替换成数据，
 * 2、初始化渲染页面视图，并将每个指令对应的节点绑定更新函数
 * 3、添加监听数据的订阅者，一旦数据有变动，收到通知，更新视图
 *
 * @param el
 * @param vm
 * @constructor
 */
function Compile(el, vm) {
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        // 获取虚拟DOM，并将模板内的所以节点加入到虚拟DOM中
        this.$fragment = this.node2Fragment(this.$el);
        this.init();
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {

  /**
   * 获取并创建虚拟 DOM
   * STEP:
   * 1、创建虚拟 DOM
   * 2、将 el 中所有的节点拷贝到 虚拟 DOM 中
   *
   * @param el
   * @returns {DocumentFragment}
   */
    node2Fragment: function(el) {
      // 虚拟DOM实现的关键
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    compileElement: function(el) {
        var childNodes = el.childNodes,
            me = this;

        // 遍历虚拟 节点
        [].slice.call(childNodes).forEach(function(node) {
            var text = node.textContent;
            var reg = /\{\{(.*)\}\}/;

            if (me.isElementNode(node)) {
                me.compile(node);
            }
            // 文本
            else if (me.isTextNode(node) && reg.test(text)) {
                me.compileText(node, RegExp.$1);
            }

            if (node.childNodes && node.childNodes.length) {
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        var nodeAttrs = node.attributes,
            me = this;

        // 遍历node节点中所有 属性
        [].slice.call(nodeAttrs).forEach(function(attr) {
            var attrName = attr.name;
            // 是否是‘-v’属性
            if (me.isDirective(attrName)) {
                var exp = attr.value;// 模型对象
                var dir = attrName.substring(2);// 脱掉 'v-' 得到 mode
                // 事件指令
                if (me.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                    // 普通指令
                } else {
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp); // 执行 Mode 方法
                }

                // 再删除 'v-model' 的标签
                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

  /**
   * 是否 v 字开头
   * @param attr
   * @returns {boolean}
   */
    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
  /**
   * {{getHelloWord}} 的调用
   * @param node
   * @param vm
   * @param exp
   */
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

  /**
   * v-html 的调用
   * @param node
   * @param vm
   * @param exp
   */
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

  /**
   * v-model 的调用
   * @param node
   * @param vm
   * @param exp
   */
    model: function(node, vm, exp) {
      // 更新视图
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        // 监听input事件，并执行 m->v 的过程
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

  /**
   *  添加 watcher 监听
   * @param node
   * @param vm
   * @param exp
   * @param dir
   */
    bind: function(node, vm, exp, dir) {
        var updaterFn = updater[dir + 'Updater'];

        // 获取 model 的值, 并给node复制
        // 完成从 mode -> view 的过程
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

      /**
       * 实例化 Watcher 用于检测属性变化
       */
       new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

  /**
   * 获取 VM 的值 (getter方式)
   * @param vm
   * @param exp
   * @returns {*}
   * @private
   */
    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];// 获取 vm 对应字段的值
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

/**
 * 更新 DOM 的值
 * @type {{textUpdater: updater.textUpdater, htmlUpdater: updater.htmlUpdater, classUpdater: updater.classUpdater, modelUpdater: updater.modelUpdater}}
 */
var updater = {
  /**
   * 更新文本视图
   * @param node
   * @param value
   */
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

  /**
   * 给值环节：
   *
   * 给 原始DOM赋 值
   * module updater
   * @param node
   * @param value
   * @param oldValue
   */
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};