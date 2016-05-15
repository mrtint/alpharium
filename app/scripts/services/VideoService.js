/**
 * Created by Hansan on 2016-05-15.
 */
'use strict';

var mainApp = angular.module('alphariumApp');

mainApp.service('VideoService',
  ['$log', '$http', 'configuration',
    function ($log, $http, configuration) {
      this.setVideoData = function (url) {
        $http({
          method: 'GET',
          url: configuration.oembedUrl,
          withCredentials: false, // no credentials
          params: {
            url: url
          }
        }).then(function successCallback(response) {
          $log.debug(response);
        });
      };
    }
  ]
);
