import _Object$keys from 'babel-runtime/core-js/object/keys';
import { bindActionCreators, createStore, applyMiddleware, compose, combineReducers } from 'redux';
import _Object$assign from 'babel-runtime/core-js/object/assign';
import invariant from 'invariant';
import isPlainObject from 'lodash.isplainobject';
import isFunction from 'lodash.isfunction';
import isObject from 'lodash.isobject';
import _defineProperty from 'babel-runtime/helpers/defineProperty';
import _toConsumableArray from 'babel-runtime/helpers/toConsumableArray';
import _typeof from 'babel-runtime/helpers/typeof';
import curry from 'lodash.curry';
import map from 'lodash.map';

function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  /* $$hashKey is added by angular when using ng-repeat, we ignore that*/
  var keysA = _Object$keys(objA).filter(function (k) {
    return k !== '$$hashKey';
  });
  var keysB = _Object$keys(objB).filter(function (k) {
    return k !== '$$hashKey';
  });

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  var hasOwn = Object.prototype.hasOwnProperty;
  for (var i = 0; i < keysA.length; i++) {
    if (!hasOwn.call(objB, keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
      return false;
    }
  }

  return true;
}

function wrapActionCreators(actionCreators) {
  return function (dispatch) {
    return bindActionCreators(actionCreators, dispatch);
  };
}

var assign = _Object$assign;
var defaultMapStateToTarget = function defaultMapStateToTarget() {
  return {};
};
var defaultMapDispatchToTarget = function defaultMapDispatchToTarget(dispatch) {
  return { dispatch: dispatch };
};

function Connector(store) {
  return function (mapStateToTarget, mapDispatchToTarget) {

    var finalMapStateToTarget = mapStateToTarget || defaultMapStateToTarget;

    var finalMapDispatchToTarget = isPlainObject(mapDispatchToTarget) ? wrapActionCreators(mapDispatchToTarget) : mapDispatchToTarget || defaultMapDispatchToTarget;

    invariant(isFunction(finalMapStateToTarget), 'mapStateToTarget must be a Function. Instead received %s.', finalMapStateToTarget);

    invariant(isPlainObject(finalMapDispatchToTarget) || isFunction(finalMapDispatchToTarget), 'mapDispatchToTarget must be a plain Object or a Function. Instead received %s.', finalMapDispatchToTarget);

    var slice = getStateSlice(store.getState(), finalMapStateToTarget, false);
    var isFactory = isFunction(slice);

    if (isFactory) {
      finalMapStateToTarget = slice;
      slice = getStateSlice(store.getState(), finalMapStateToTarget);
    }

    var boundActionCreators = finalMapDispatchToTarget(store.dispatch);

    return function (target) {

      invariant(isFunction(target) || isObject(target), 'The target parameter passed to connect must be a Function or a object.');

      //Initial update
      updateTarget(target, slice, boundActionCreators);

      var unsubscribe = store.subscribe(function () {
        var nextSlice = getStateSlice(store.getState(), finalMapStateToTarget);
        if (!shallowEqual(slice, nextSlice)) {
          updateTarget(target, nextSlice, boundActionCreators, slice);
          slice = nextSlice;
        }
      });
      return unsubscribe;
    };
  };
}

function updateTarget(target, StateSlice, dispatch, prevStateSlice) {
  if (isFunction(target)) {
    target(StateSlice, dispatch, prevStateSlice);
  } else {
    assign(target, StateSlice, dispatch);
  }
}

function getStateSlice(state, mapStateToScope) {
  var shouldReturnObject = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  var slice = mapStateToScope(state);

  if (shouldReturnObject) {
    invariant(isPlainObject(slice), '`mapStateToScope` must return an object. Instead received %s.', slice);
  } else {
    invariant(isPlainObject(slice) || isFunction(slice), '`mapStateToScope` must return an object or a function. Instead received %s.', slice);
  }

  return slice;
}

function digestMiddleware($rootScope) {
    return function (store) {
        return function (next) {
            return function (action) {
                var res = next(action);
                $rootScope.$evalAsync(res);
                return res;
            };
        };
    };
}

/**
 * middleware for the empty store that ng-redux uses when a external store is provided
 * Provides two cases:
 * 1. NGREDUX_PASSTHROUGH, where data is coming IN to the "fake" store
 * 2. all other, where actions are dispatched out, and proxied to the true store
 */
var providedStoreMiddleware = (function (_providedStore) {
  return function (store) {
    return function (next) {
      return function (action) {
        return action.type === '@@NGREDUX_PASSTHROUGH' ? next(action) : _providedStore.dispatch(action);
      };
    };
  };
});

function wrapStore(providedStore, ngReduxStore) {
  providedStore.subscribe(function () {
    var newState = providedStore.getState();
    ngReduxStore.dispatch({
      type: '@@NGREDUX_PASSTHROUGH',
      payload: newState
    });
  });
  providedStore.dispatch({ type: '@@NGREDUX_PASSTHROUGH_INIT' });
}

var isArray = Array.isArray;

var typeIs = curry(function (type, val) {
  return (typeof val === 'undefined' ? 'undefined' : _typeof(val)) === type;
});
var isObject$$1 = typeIs('object');
var isString = typeIs('string');
var assign$1 = _Object$assign;

function ngReduxProvider() {
  var _reducer = undefined;
  var _middlewares = undefined;
  var _storeEnhancers = undefined;
  var _initialState = undefined;
  var _reducerIsObject = undefined;
  var _providedStore = undefined;
  var _compose = undefined;

  this.provideStore = function (store) {
    var middlewares = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var storeEnhancers = arguments[2];

    _providedStore = store;
    _reducer = function _reducer(state, action) {
      return action.payload;
    };
    _storeEnhancers = storeEnhancers;
    _middlewares = [].concat(_toConsumableArray(middlewares), [providedStoreMiddleware(store)]);
  };

  this.createStoreWith = function (reducer, middlewares, storeEnhancers, initialState, customCompose) {
    invariant(isFunction(reducer) || isObject$$1(reducer), 'The reducer parameter passed to createStoreWith must be a Function or an Object. Instead received %s.', typeof reducer === 'undefined' ? 'undefined' : _typeof(reducer));

    invariant(!storeEnhancers || isArray(storeEnhancers), 'The storeEnhancers parameter passed to createStoreWith must be an Array. Instead received %s.', typeof storeEnhancers === 'undefined' ? 'undefined' : _typeof(storeEnhancers));

    _reducer = reducer;
    _reducerIsObject = isObject$$1(reducer);
    _storeEnhancers = storeEnhancers || [];
    _middlewares = middlewares || [];
    _initialState = initialState || {};
    _compose = customCompose && typeof customCompose === 'function' ? customCompose : compose;
  };

  this.$get = function ($injector) {
    var resolveMiddleware = function resolveMiddleware(middleware) {
      return isString(middleware) ? $injector.get(middleware) : middleware;
    };

    var resolvedMiddleware = map(_middlewares, resolveMiddleware);

    var resolveStoreEnhancer = function resolveStoreEnhancer(storeEnhancer) {
      return isString(storeEnhancer) ? $injector.get(storeEnhancer) : storeEnhancer;
    };

    var resolvedStoreEnhancer = map(_storeEnhancers, resolveStoreEnhancer);

    if (_reducerIsObject) {
      var getReducerKey = function getReducerKey(key) {
        return isString(_reducer[key]) ? $injector.get(_reducer[key]) : _reducer[key];
      };

      var resolveReducerKey = function resolveReducerKey(result, key) {
        return assign$1({}, result, _defineProperty({}, key, getReducerKey(key)));
      };

      var reducersObj = _Object$keys(_reducer).reduce(resolveReducerKey, {});

      _reducer = combineReducers(reducersObj);
    }

    // digestMiddleware needs to be the last one.
    resolvedMiddleware.push(digestMiddleware($injector.get('$rootScope')));

    // combine middleware into a store enhancer.
    var middlewares = applyMiddleware.apply(undefined, _toConsumableArray(resolvedMiddleware));

    // compose enhancers with middleware and create store.
    var store = createStore(_reducer, _initialState, _compose.apply(undefined, _toConsumableArray(resolvedStoreEnhancer).concat([middlewares])));

    var mergedStore = assign$1({}, store, { connect: Connector(store) });

    if (_providedStore) wrapStore(_providedStore, mergedStore);

    return mergedStore;
  };

  this.$get.$inject = ['$injector'];
}

var index = angular.module('ngRedux', []).provider('$ngRedux', ngReduxProvider).name;

export default index;
//# sourceMappingURL=ng-redux.js.map
