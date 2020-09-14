/**
 * 劫持监听所有属性
 * @param data
 */
function Observer(data) {
	this.data = data;
	this.walk(data);
}

Observer.prototype = {
	walk: function(data) {
		var me = this;
		Object.keys(data).forEach(function(key) {
			me.convert(key, data[key]);
		});
	},
	convert: function(key, val) {
		this.defineReactive(this.data, key, val);
	},

	defineReactive: function(data, key, val) {
		// 为每个属性添加一个Dep对象，用来构建依赖关系
		var dep = new Dep(); 
		// 递归劫持子属性，最终是一个{}区域使用一个Observer对象管理
		var childObj = observe(val); 

		Object.defineProperty(data, key, {
			enumerable: true, // 可枚举
			configurable: false, // 不能再define
			get: function() {
				if (Dep.target) {
					dep.depend(); // 属性值通过Dep建立和Watcher的关系
				}
				return val;
			},
			set: function(newVal) {
				if (newVal === val) {
					return;
				}

				/**
				 * 持有闭包变量 val
				 * 在 get 的时候 还是返回该 val
				 * 所以无需全局缓存
				 */
				val = newVal;
				// 新的值是object的话，进行监听
				childObj = observe(newVal);
				// 通知订阅者
				dep.notify();
			}
		});
	}
};

function observe(value, vm) {
	if (!value || typeof value !== 'object') {
		return;
	}

	return new Observer(value);
};


var uid = 0;

/**
 * watcher管理器，observer是使用法
 */
function Dep() {
	this.id = uid++;
	this.subs = [];
}

Dep.prototype = {
  /**
   * 添加一个 watcher 实例
   * @param sub
   */
	addSub: function(sub) {
		this.subs.push(sub);
	},

	// 依赖收集
	depend: function() {
		Dep.target.addDep(this); // Dep.target = watcher实例
	},

	removeSub: function(sub) {
		var index = this.subs.indexOf(sub);
		if (index != -1) {
			this.subs.splice(index, 1);
		}
	},

	notify: function() {
		this.subs.forEach(function(sub) {
			sub.update();
		});
	}
};

// 记录当前活跃/激活的Watcher实例
Dep.target = null;