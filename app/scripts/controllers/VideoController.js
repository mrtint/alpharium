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
  ['$log', '$scope', '$location', 'configuration', '$compile', '$http',
    function ($log, $scope, $location, configuration, $compile, $http) {
      $scope.videoCount = 0;
      $scope.video = null;

      /**
       * Confirm Video URL and set video data.
       */
      $scope.confirmUrl = function () {
        var videoArea = angular.element('#video-area');
        if ($scope.video !== null) {
          $scope.parser = document.createElement('a');
          $scope.parser.href = $scope.video.url;
          $scope.video.resourceId = $scope.parser.pathname.replace("/", "");
          $scope.video.thumnailUrl = "https://i.ytimg.com/vi/" + $scope.video.resourceId + "/sddefault.jpg";
          $log.debug($scope.video);
          videoArea.empty();
          videoArea.append($compile('<youtube-video></youtube-video>')($scope));
        }
      };
      /**
       * Add video data.
       */
      $scope.add = function () {
        $log.debug($scope.video);
        $http({
          method: 'PUT',
          url: configuration.sourceUrl + '/video',
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
