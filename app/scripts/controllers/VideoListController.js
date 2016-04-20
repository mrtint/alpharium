/**
 * Created by Hansan on 2016-04-20.
 */
'use strict';

/**
 * @ngdoc function
 * @name alphariumApp.controller:VideoController
 * @description
 * # VideoController
 * Controller of the alphariumApp
 */
var mainApp = angular.module('alphariumApp');

mainApp.controller('VideoListController',
  ['$log', '$scope', 'configuration', '$http',
    function ($log, $scope, configuration, $http) {
      $scope.videos = [];

      $scope.getList = function () {
        $http({
          method: 'GET',
          url: configuration.sourceUrl + '/video/list',
          data: $scope.video
        }).then(function successCallback(response) {
          $log.debug(response);
          $scope.videos = response.data;
        });
      }

      $scope.getList();
    }
  ]
);
