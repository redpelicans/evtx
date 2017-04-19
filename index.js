'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Service = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var isFunction = function isFunction(obj) {
  return typeof obj === 'function';
};
var reduceHooks = function reduceHooks(ctx, hooks) {
  return hooks.reduce(function (acc, hook) {
    return acc.then(hook);
  }, Promise.resolve(ctx));
};

var Service = exports.Service = function (_EventEmitter) {
  _inherits(Service, _EventEmitter);

  function Service(definition, path, evtx) {
    _classCallCheck(this, Service);

    var _this = _possibleConstructorReturn(this, (Service.__proto__ || Object.getPrototypeOf(Service)).call(this));

    _this.path = path;
    _this.evtx = evtx;
    _this.beforeHooks = {};
    _this.afterHooks = {};
    _this.definition = definition;
    _this.setup(definition);
    return _this;
  }

  _createClass(Service, [{
    key: 'setup',
    value: function setup(definition) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(definition)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          var value = definition[key];
          if (isFunction(value)) this.addMethod(key);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'getBeforeHooks',
    value: function getBeforeHooks() {
      var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'all';

      return this.beforeHooks[key] || [];
    }
  }, {
    key: 'getAfterHooks',
    value: function getAfterHooks() {
      var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'all';

      return this.afterHooks[key] || [];
    }
  }, {
    key: 'addMethod',
    value: function addMethod(key) {
      var _this2 = this;

      this[key] = function (input, globalContext) {
        var message = { service: _this2.path, method: key, input: input };
        return _this2.evtx.run(message, globalContext);
      };
    }
  }, {
    key: 'run',
    value: function run(key, ctx) {
      var _this3 = this;

      var baseMethod = function baseMethod(ctx) {
        // eslint-disable-line no-shadow
        var method = ctx.method,
            service = ctx.service;

        var methodObj = _this3.definition[method];
        if (!methodObj || !isFunction(methodObj)) throw new Error('Unknown method: ' + method + ' for service: ' + service);
        return methodObj.bind(ctx)(ctx.input).then(function (data) {
          return _extends({}, ctx, { output: data });
        });
      };

      var execMethodMiddlewares = function execMethodMiddlewares(ctx) {
        // eslint-disable-line no-shadow
        var method = ctx.method;

        var hooks = [].concat(_toConsumableArray(_this3.getBeforeHooks(method)), [baseMethod], _toConsumableArray(_this3.getAfterHooks(method)));
        return reduceHooks(ctx, hooks);
      };

      var hooks = [].concat(_toConsumableArray(this.getBeforeHooks()), [execMethodMiddlewares], _toConsumableArray(this.getAfterHooks()));
      return reduceHooks(ctx, hooks);
    }
  }, {
    key: 'before',
    value: function before(hooks) {
      this.beforeHooks = hooks;
      return this;
    }
  }, {
    key: 'after',
    value: function after(hooks) {
      this.afterHooks = hooks;
      return this;
    }
  }]);

  return Service;
}(_events2.default);

var EvtX = function () {
  function EvtX(config) {
    _classCallCheck(this, EvtX);

    this.services = {};
    this.config = config;
  }

  _createClass(EvtX, [{
    key: 'configure',
    value: function configure(fct) {
      fct(this);
      return this;
    }
  }, {
    key: 'service',
    value: function service(path) {
      return this.services[path];
    }
  }, {
    key: 'use',
    value: function use(path, service) {
      this.services[path] = new Service(service, path, this);
      return this;
    }
  }, {
    key: 'before',
    value: function before() {
      for (var _len = arguments.length, hooks = Array(_len), _key = 0; _key < _len; _key++) {
        hooks[_key] = arguments[_key];
      }

      this.beforeHooks = hooks;
      return this;
    }
  }, {
    key: 'pushBefore',
    value: function pushBefore(hook) {
      this.beforeHooks = [].concat(_toConsumableArray(this.getBeforeHooks()), [hook]);
      return this;
    }
  }, {
    key: 'unshiftBefore',
    value: function unshiftBefore(hook) {
      this.beforeHooks = [hook].concat(_toConsumableArray(this.getBeforeHooks()));
      return this;
    }
  }, {
    key: 'pushAfter',
    value: function pushAfter(hook) {
      this.afterHooks = [].concat(_toConsumableArray(this.getAfterHooks()), [hook]);
      return this;
    }
  }, {
    key: 'unshiftAfter',
    value: function unshiftAfter(hook) {
      this.afterHooks = [hook].concat(_toConsumableArray(this.getAfterHooks()));
      return this;
    }
  }, {
    key: 'after',
    value: function after() {
      for (var _len2 = arguments.length, hooks = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        hooks[_key2] = arguments[_key2];
      }

      this.afterHooks = hooks;
      return this;
    }
  }, {
    key: 'getBeforeHooks',
    value: function getBeforeHooks() {
      return this.beforeHooks || [];
    }
  }, {
    key: 'getAfterHooks',
    value: function getAfterHooks() {
      return this.afterHooks || [];
    }
  }, {
    key: 'run',
    value: function run(message, globalContext) {
      var _this4 = this;

      var execMethod = function execMethod(ctx) {
        var service = ctx.service,
            method = ctx.method;

        var evtXService = _this4.service(service);
        if (!evtXService) throw new Error('Unknown service: ' + service);
        var evtXMethod = evtXService[method];
        if (!evtXMethod || !isFunction(evtXMethod)) throw new Error('Unknown method: ' + method + ' for service: ' + service);
        return evtXService.run(method, ctx);
      };
      var service = message.service,
          method = message.method,
          input = message.input;

      var ctx = _extends({}, globalContext, {
        message: message,
        service: service,
        method: method,
        input: input,
        output: {},
        evtx: this,
        emit: function emit() {
          var _evtx$service;

          return (_evtx$service = this.evtx.service(this.service)).emit.apply(_evtx$service, arguments);
        }
      });

      var hooks = [].concat(_toConsumableArray(this.getBeforeHooks()), [execMethod], _toConsumableArray(this.getAfterHooks()));
      return reduceHooks(ctx, hooks).then(function (ctx) {
        return ctx.output;
      }); // eslint-disable-line no-shadow
    }
  }]);

  return EvtX;
}();

exports.default = function (config) {
  return new EvtX(config);
};
