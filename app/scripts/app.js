'use strict';

/**
 * @ngdoc overview
 * @name alphariumApp
 * @description
 * # alphariumApp
 *
 * Main module of the application.
 */
var app = angular
  .module('alphariumApp', [
    'ngCookies',
    'ngSanitize',
    'ui.router',
    'pascalprecht.translate',
    'alphariumApp.configuration',
    'alphariumApp.interceptors'
  ]);
app.config(['configuration', '$translateProvider', '$stateProvider', '$urlRouterProvider',
  '$locationProvider', '$httpProvider', '$sceDelegateProvider', '$logProvider',
  function (configuration, $translateProvider, $stateProvider, $urlRouterProvider,
            $locationProvider, $httpProvider, $sceDelegateProvider, $logProvider) {
    // httpProvider 의 설정
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.interceptors.push('RequestInterceptor', 'ResponseErrorInterceptor');

    // javascript console logging 기능 여부 설정
    $logProvider.debugEnabled(configuration.logEnabled === "true");
    if (configuration.logEnabled === "true") {
      console.log("logging is enabled.")
    }

    // 로컬라이제이션 관련 경로
    $translateProvider.useStaticFilesLoader({
      prefix: 'scripts/localization/',
      suffix: '.json'
    }).preferredLanguage('en').useCookieStorage();

    // URL 리소스 사용을 위한 신뢰 출처, 비신뢰 출처 등록
    $sceDelegateProvider.resourceUrlWhitelist([
      'self',
      'https://www.youtube.com/**',
      'https://youtu.be/**'
    ]);
    $sceDelegateProvider.resourceUrlBlacklist([
      'http://myapp.example.com/clickThru**'
    ]);

    // URL 라우팅 설정
    $urlRouterProvider.otherwise("/");
    $stateProvider
      .state('main', {
        url: "/",
        templateUrl: '/views/main.html'
      })
      .state('video', {
        url: "/video",
        templateUrl: '/views/video.html',
        controller: 'VideoController'
      })
      .state('about', {
        url: "/about",
        templateUrl: '/views/about.html'
      });
  }
]);
