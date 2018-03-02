function MVVM(options) {
    this.$options = options || {};
    var data = this._data = this.$options.data;
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx

  /**
   * VM 劫持阶段
   * 1、首先将 data 的每一个属性值挂接到 vm 上
   * 2、然后为 vm 添加这些属性值的 getter 和 setter 方法
   * 3、通过 vm 的 getter 和 setter 获取值时，代理 data
   * 的实际值
   */
    Object.keys(data).forEach(function(key) {
        me._proxyData(key);
    });

    // 挂接 computer 方法 (function类型)
    this._initComputed();

    // 劫持所有属性
    observe(data, this);

    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxyData: function(key, setter, getter) {
        var me = this;
        setter = setter || 
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};