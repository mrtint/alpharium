/**
 * Created by hsnam on 2016-02-18.
 */
'use strict';

angular.module('alphariumApp.configuration', [])
  .constant('configuration', {
    test: '@@test',
    sourceUrl: '@@sourceUrl',
    logEnabled: '@@logEnabled'
  });
