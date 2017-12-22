import EventEmitter from 'events';
import debug from 'debug';

const loginfo = debug('evtx');

const isFunction = obj => typeof obj === 'function';
const reduceHooks = (ctx, hooks) => hooks.reduce((acc, hook) => acc.then(hook), Promise.resolve(ctx));

export function UnknownServiceError(service) {
    Error.captureStackTrace(this, UnknownServiceError);
    this.message = `Unknown service: ${service}`;
    this.name = 'UnknownServiceError';
    this.service = service;
}
UnknownServiceError.prototype = Object.create(Error.prototype);
UnknownServiceError.prototype.constructor = UnknownServiceError;

export function UnknownMethodError(service, method) {
    Error.captureStackTrace(this, UnknownMethodError);
    this.message = `Unknown method: ${method} for service: ${service}`;
    this.name = 'UnknownMethodError';
    this.service = service;
    this.method = method;
}
UnknownMethodError.prototype = Object.create(Error.prototype);
UnknownMethodError.prototype.constructor = UnknownMethodError;

export class Service extends EventEmitter {
  constructor(definition, path, evtx) {
    super();
    this.path = path;
    this.evtx = evtx;
    this.beforeHooks = {};
    this.afterHooks = {};
    this.definition = definition;
    this.setup(definition);
  }

  setup(definition) {
    Object.keys(definition).forEach(key => {
      const value = definition[key];
      if (isFunction(value)) this.addMethod(key);
    });
  }

  getBeforeHooks(key = 'all') {
    return this.beforeHooks[key] || [];
  }

  getAfterHooks(key = 'all') {
    return this.afterHooks[key] || [];
  }

  addMethod(key) {
    this[key] = (input, localContext) => {
      const message = { service: this.path, method: key, input };
      return this.evtx.run(message, localContext);
    };
  }

  run(key, ctx) {
    const baseMethod = ctx => { // eslint-disable-line no-shadow
      const { method, service } = ctx;
      const methodObj = this.definition[method];
      if (!methodObj || !isFunction(methodObj)) throw new UnknownMethodError(service, method);
      return (methodObj.bind(ctx)(ctx.input)).then(data => ({ ...ctx, output: data }));
    };

    const execMethodMiddlewares = ctx => { // eslint-disable-line no-shadow
      const { method } = ctx;
      const hooks = [...this.getBeforeHooks(method), baseMethod, ...this.getAfterHooks(method)];
      return reduceHooks(ctx, hooks);
    };

    const hooks = [...this.getBeforeHooks(), execMethodMiddlewares, ...this.getAfterHooks()];
    return reduceHooks(ctx, hooks);
  }

  before(hooks) {
    this.beforeHooks = hooks;
    return this;
  }

  after(hooks) {
    this.afterHooks = hooks;
    return this;
  }
}

class EvtX {
  constructor(globals) {
    this.services = {};
    this.globals = globals;
  }

  configure(fct) {
    fct(this);
    return this;
  }

  service(path) {
    return this.services[path];
  }

  use(path, service) {
    this.services[path] = new Service(service, path, this);
    loginfo(`${path} service registered`);
    return this;
  }

  before(...hooks) {
    this.beforeHooks = hooks;
    return this;
  }

  pushBefore(hook) {
    this.beforeHooks = [...this.getBeforeHooks(), hook];
    return this;
  }

  unshiftBefore(hook) {
    this.beforeHooks = [hook, ...this.getBeforeHooks()];
    return this;
  }

  pushAfter(hook) {
    this.afterHooks = [...this.getAfterHooks(), hook];
    return this;
  }

  unshiftAfter(hook) {
    this.afterHooks = [hook, ...this.getAfterHooks()];
    return this;
  }

  after(...hooks) {
    this.afterHooks = hooks;
    return this;
  }

  getBeforeHooks() {
    return this.beforeHooks || [];
  }

  getAfterHooks() {
    return this.afterHooks || [];
  }

  run(message, locals) {
    const execMethod = (ctx) => {
      const { service, method } = ctx;
      const evtXService = this.service(service);
      if (!evtXService) throw new UnknownServiceError(service);
      const evtXMethod = evtXService[method];
      if (!evtXMethod || !isFunction(evtXMethod)) throw new UnknownMethodError(service, method);
      return evtXService.run(method, ctx);
    };
    const { service, method, input } = message;
    const ctx = {
      locals,
      globals: this.globals,
      message,
      service,
      method,
      input,
      output: {},
      evtx: this,
      emit(...params) {
        return this.evtx.service(this.service).emit(...params);
      },
    };

    const hooks = [...this.getBeforeHooks(), execMethod, ...this.getAfterHooks()];
    return reduceHooks(ctx, hooks).then(ctx => ctx.output); // eslint-disable-line no-shadow
  }
}

export default (context) => new EvtX(context);
