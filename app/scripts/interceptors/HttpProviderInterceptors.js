'use strict';
/**
 * @ngdoc function
 * @name alphariumApp.interceptors
 * @description
 * # http request, response interceptors
 */

angular.module('alphariumApp.interceptors', ['alphariumApp.interceptors.request', 'alphariumApp.interceptors.response']);

angular.module('alphariumApp.interceptors.request', []).factory('RequestInterceptor',
  ['$log', '$httpParamSerializerJQLike', function ($log, $httpParamSerializerJQLike) {
    return {
      request: function (config) {
        //params에 넣어을 경우 data에 serialize 하여 넣어줌
        //params -> data
        //data = serialize
        if (config.method.toUpperCase() === 'POST') {
          if (_.has(config, 'params')) {
            config.data = config.params;
            delete config.params;
          }
          if (_.has(config, 'data')) {
            if (!_.has(config.data, 'image')) {
              config.data = $httpParamSerializerJQLike(config.data);
            }
          }
        }
        return config;
      } //end of request
    };  //end of return
  }]
);

angular.module('alphariumApp.interceptors.response', []).factory('ResponseErrorInterceptor',
  ['$q', '$log', function ($q, $log) {
    return {
      responseError: function (response) {
        var log = {
          status: response.status,
          statusText: response.statusText,
          'config.method': response.config.method,
          'config.withCredentials': response.config.withCredentials,
          'config.data': response.config.data,
          'config.url': response.config.url,
          'config.headers': response.config.headers,
          result: response.data.result,
          message: response.data.message
        };

        $log.debug('ResponseErrorInterceptor: ', log);
        return $q.reject(response);
      }
    };
  }]
);
