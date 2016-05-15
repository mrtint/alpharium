'use strict';

/**
 * @ngdoc function
 * @name alphariumApp.controller:VideoController
 * @description
 * # VideoController
 * Controller of the alphariumApp
 */
var mainApp = angular.module('alphariumApp');

mainApp.controller('VideoController',
  ['$log', '$scope', '$location', 'configuration', '$compile', '$http', 'VideoService',
    function ($log, $scope, $location, configuration, $compile, $http, VideoService) {
      $scope.videoCount = 0;
      $scope.video = null;

      /**
       * Confirm Video URL and set video data.
       */
      $scope.confirmUrl = function () {
        if ($scope.video !== null) {
          VideoService.setVideoData($scope.video.url);
        }
      };

      /**
       * Video 데이터 생성
       */
      $scope.add = function () {
        $log.debug($scope.video);
        $http({
          method: 'POST',
          url: configuration.sourceUrl + '/api/videos',
          data: $scope.video
        }).then(function successCallback(response) {
          $log.debug(response);
          $scope.cancel();
        });
      };

      /**
       * Reset a creating video data.
       */
      $scope.cancel = function () {
        $scope.video = null;
      };
    }
  ]
);
