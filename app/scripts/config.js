/**
 * Created by hsnam on 2016-02-18.
 */
'use strict';

angular.module('alphariumApp.configuration', [])
  .constant('configuration', {
    test: 'Development',
    sourceUrl: 'http://localhost:8080',
    logEnabled: 'true'
  });
