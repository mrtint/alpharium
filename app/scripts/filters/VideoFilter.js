/**
 * Created by Hansan on 2016-04-20.
 */
'use strict';

var mainApp = angular.module('alphariumApp');

mainApp.filter('thumbnail', function () {
  return function (video) {
    var url = '';
    switch (video.type) {
      case "YOUTUBE" :
        url = 'https://i.ytimg.com/vi/' + video.resourceId + '/hqdefault.jpg';
        break;
      case "VIMEO" :
        url = 'https://i.vimeocdn.com/video/' + video.resourceId + '_640.jpg';
        break;
      case "DAILYMOTION" :
        url = "http://www.dailymotion.com/thumbnail/video/" + video.resourceId;
        break;
      default :
        break;
    }
    video.thumnail = url;
    return url;
  };
});
