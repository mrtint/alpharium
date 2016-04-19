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

      $scope.confirmUrl = function () {
        var videoArea = angular.element('#video-area');
        if ($scope.video !== null) {
          $scope.parser = document.createElement('a');
          $scope.parser.href = $scope.video.url;
          $scope.video.resource_id = $scope.parser.pathname.replace("/", "");
          $scope.video.embed = "https://www.youtube.com/embed/" + $scope.video.resource_id;
          $log.debug($scope.video);
          videoArea.empty();
          videoArea.append($compile('<youtube-video></youtube-video>')($scope));
        }
      };

      $scope.add = function () {
        $http({
          method: 'PUT',
          url: configuration.sourceUrl + '/video',
          data: $scope.video
        }).then(function successCallback(response) {
          $log.debug(response);
          // $scope.cancel();
        });
      };

      $scope.cancel = function () {
        $scope.video = null;
      };
    }
  ]
);
