'use strict';

/**
 * @ngdoc function
 * @name alphariumApp.controller:MainController
 * @description
 * # MainController
 * Controller of the alphariumApp
 */
var mainApp = angular.module('alphariumApp');

mainApp.controller('MainController',
  ['$log', '$rootScope', '$scope', '$translate',
    function ($log, $rootScope, $scope, $translate) {
      $rootScope.setLang = function (lang) {
        $log.debug("Change language to " + lang);
        $translate.use(lang);
      }
    }
  ]
);
