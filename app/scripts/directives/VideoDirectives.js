'use strict';
/**
 * Created by Hansan on 2016-04-20.
 */
var mainApp = angular.module('alphariumApp');

mainApp.directive('youtubeVideo', function () {
  return {
    restrict: 'E',
    templateUrl: '/views/partials/youtube-video.html'
  };
});
