/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

// FUTURE TODO replace in test(s):
function ok(test, desc) { expect(test).toBe(true); }
function equal(a, b, desc) { expect(a).toEqual(b); } // '=='
function strictEqual(a, b, desc) { expect(a).toBe(b); } // '==='

// XXX TODO REFACTOR OUT OF OLD TESTS:
var wait = 0;
var test_it_done = null;
function xtest_it(desc, fun) { xit(desc, fun); }
function test_it(desc, fun) {
  wait = 0;
  it(desc, function(done) {
    test_it_done = done;
    fun();
  }, MYTIMEOUT);
}
function stop(n) {
  if (!!n) wait += n
  else ++wait;
}
function start(n) {
  if (!!n) wait -= n;
  else --wait;
  if (wait == 0) test_it_done();
}

var isAndroid = /Android/.test(navigator.userAgent);
var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
//var isWindows = /Windows NT/.test(navigator.userAgent); // Windows [NT] (8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows (8.1)
//var isWindowsPC = /Windows NT/.test(navigator.userAgent); // Windows [NT] (8.1)
//var isWindowsPhone_8_1 = /Windows Phone 8.1/.test(navigator.userAgent); // Windows Phone 8.1
//var isIE = isWindows || isWP8 || isWindowsPhone_8_1;
var isIE = isWindows || isWP8;
var isWebKit = !isIE; // TBD [Android or iOS]

// NOTE: In the core-master branch there is no difference between the default
// implementation and implementation #2. But the test will also apply
// the androidLockWorkaround: 1 option in the case of implementation #2.
var pluginScenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'Plugin-implementation-2'
];

var pluginScenarioCount = isAndroid ? 2 : 1;

var mytests = function() {

  describe('Plugin: repeated db test(s)', function() {

    describe('repeated open/close/delete test(s)', function() {
      var scenarioName = isAndroid ? 'Plugin-implementation-default' : 'Plugin';
      var suiteName = scenarioName + ': ';

        // NOTE: MUST be defined in function scope, NOT outer scope:
        var openDatabase = function(first, second, third) {
          return window.sqlitePlugin.openDatabase(first, second, third);
        }

        var deleteDatabase = function(first, second, third) {
          window.sqlitePlugin.deleteDatabase(first, second, third);
        }

        // Needed to support some large-scale applications:
        test_it(suiteName + ' open same database twice in [same] specified location works', function () {
          // XXX TODO [BROKEN]: same db name, different location should be different db!
          var dbName = 'open-twice-same-location.db';

          stop(2);

          var db1 = openDatabase({name: dbName, location: 2}, function () {
            var db2 = openDatabase({name: dbName, location: 2}, function () {
              db1.readTransaction(function(tx1) {
                tx1.executeSql('SELECT 1', [], function(tx1d, results) {
                  ok(true, 'db1 transaction working');
                  start(1);
                }, function(error) {
                  ok(false, error);
                });
              }, function(error) {
                ok(false, error);
              });
              db2.readTransaction(function(tx2) {
                tx2.executeSql('SELECT 1', [], function(tx2d, results) {
                  ok(true, 'db2 transaction working');
                  start(1);
                }, function(error) {
                  ok(false, error);
                });
              }, function(error) {
                ok(false, error);
              });
            }, function (error) {
              ok(false, error);
            });
          }, function (error) {
            ok(false, error);
          });
        });

        // Needed to support some large-scale applications:
        test_it(suiteName + ' close then re-open (2x) allows subsequent queries to run', function () {
          // asynch test coming up
          stop(1);
        
          var dbName = "Database-Close-and-Reopen";

          openDatabase({name: dbName, location: 0}, function (db) {
            db.close(function () {
              openDatabase({name: dbName, location: 0}, function (db) {
                db.close(function () {
                  openDatabase({name: dbName, location: 0}, function (db) {
                    db.readTransaction(function (tx) {
                      tx.executeSql('SELECT 1', [], function (tx, results) {
                        ok(true, 'database re-opened succesfully');
                        start(1);
                      }, function (error) {
                        ok(false, error.message);
                        start(1);
                      });
                    }, function (error) {
                      ok(false, error.message);
                      start(1);
                    }, function(tx) {
                      // close on transaction success not while executing
                      // or commit will fail
                      db.close(); 
                    });
                  }, function (error) {
                    ok(false, error.message);
                    start(1);
                  });
                }, function (error) {
                  ok(false, error.message);
                  start(1);
                });
              }, function (error) {
                ok(false, error.message);
                start(1);
              });
            }, function (error) {
              ok(false, error.message);
              start(1);
            });
          }, function (error) {
            ok(false, error.message);
            start(1);
          });
        });

        // Needed to support some large-scale applications:
        test_it(suiteName + " delete then re-open (location: 'default') allows subsequent queries to run", function () {
          var dbName = "Database-delete-and-Reopen.db";

          // async test coming up
          stop(1);

          var db = openDatabase({name: dbName, location: 'default'}, function () {
            // success CB
            deleteDatabase({name: dbName, location: 'default'}, function () {
              db = openDatabase({name: dbName, location: 'default'}, function () {
                db.readTransaction(function (tx) {
                  tx.executeSql('SELECT 1', [], function (tx, results) {
                    ok(true, 'database re-opened succesfully');
                    start(1);
                  }, function (error) {
                    ok(false, error);
                    start(1);
                  }, function (error) {
                    ok(false, error);
                    start(1);
                  });
                }, function (error) {
                  ok(false, error);
                  start(1);
                });
              }, function (error) {
                ok(false, error);
                start(1);
              });
            }, function (error) {
              ok(false, error);
              start(1);
            });
          }, function (error) {
            ok(false, error);
            start(1);
          });
        });

        // XXX SEE BELOW: repeat scenario but wait for open callback before close/delete/reopen
        // Needed to support some large-scale applications:
        test_it(suiteName + ' immediate close, then delete then re-open allows subsequent queries to run', function () {

          // XXX POSSIBLY BROKEN on iOS due to current background processing implementation
          if (!(isAndroid || isIE)) pending('POSSIBLY BROKEN on iOS (background processing implementation)');

          var dbName = "Immediate-close-delete-Reopen.db";

          // asynch test coming up
          stop(1);

          var db1 = openDatabase({name: dbName, iosDatabaseLocation: 'Documents'});

          db1.close(function () {
            deleteDatabase({name: dbName, iosDatabaseLocation: 'Documents'}, function () {
              openDatabase({name: dbName, iosDatabaseLocation: 'Documents'}, function(db) {
                db.readTransaction(function (tx) {
                  tx.executeSql('SELECT 1', [], function (tx, results) {
                    ok(true, 'database re-opened succesfully');
                    start(1);
                  }, function (e) {
                    ok(false, 'error: ' + e);
                    start(1);
                  });
                }, function (e) {
                  ok(false, 'error: ' + e);
                  start(1);
                });
              }, function (e) {
                ok(false, 'error: ' + e);
                start(1);
              });
            }, function (e) {
              ok(false, 'error: ' + e);
              start(1);
            });
          }, function (e) {
            ok(false, 'error: ' + e);
            start(1);
          });
        });

        test_it(suiteName + ' close (after open cb), then delete then re-open allows subsequent queries to run', function () {

          var dbName = "Close-after-opencb-delete-reopen.db";

          // asynch test coming up
          stop(1);

          openDatabase({name: dbName, iosDatabaseLocation: 'Library'}, function(db1) {

            db1.close(function () {
              deleteDatabase({name: dbName, iosDatabaseLocation: 'Library'}, function () {
                openDatabase({name: dbName, iosDatabaseLocation: 'Library'}, function(db) {
                  db.readTransaction(function (tx) {
                    tx.executeSql('SELECT 1', [], function (tx, results) {
                      ok(true, 'database re-opened succesfully');
                      start(1);
                    }, function (e) {
                      ok(false, 'error: ' + e);
                      start(1);
                    });
                  }, function (e) {
                    ok(false, 'error: ' + e);
                    start(1);
                  });
                }, function (e) {
                  ok(false, 'error: ' + e);
                  start(1);
                });
              }, function (e) {
                ok(false, 'error: ' + e);
                start(1);
              });
            }, function (e) {
              ok(false, 'error: ' + e);
              start(1);
            });

          }, function (e) {
            ok(false, 'open error: ' + e);
            start(1);
          });

        });

        test_it(suiteName + ' repeatedly open and close database (4x)', function () {
          var dbName = "repeatedly-open-and-close-db-4x.db";

          // async test coming up
          stop(1);

          openDatabase({name: dbName, location: 0}, function(db) {
            ok(!!db, 'valid db object 1/4');
            db.close(function () {
              ok(true, 'success 1/4');

              openDatabase({name: dbName, location: 0}, function(db) {
                ok(!!db, 'valid db object 2/4');
                db.close(function () {
                  ok(true, 'success 2/4');

                  openDatabase({name: dbName, location: 0}, function(db) {
                    ok(!!db, 'valid db object 3/4');
                    db.close(function () {
                      ok(true, 'success 3/4');

                      openDatabase({name: dbName, location: 0}, function(db) {
                        ok(!!db, 'valid db object 4/4');
                        db.close(function () {
                          ok(true, 'success 4/4');

                          start(1);
                        }, function (error) {
                          ok(false, 'close 4/4: unexpected close error callback: ' + error);
                          start(1);
                        });
                      }, function (error) {
                        ok(false, 'open 4/4: unexpected open error callback: ' + error);
                        start(1);
                      });
                    }, function (error) {
                      ok(false, 'close 3/4: unexpected close error callback: ' + error);
                      start(1);
                    });
                  }, function (error) {
                    ok(false, 'open 3/4: unexpected open error callback: ' + error);
                    start(1);
                  });
                }, function (error) {
                  ok(false, 'close 2/4: unexpected delete close callback: ' + error);
                  start(1);
                });
              }, function (error) {
                ok(false, 'close 2/4: unexpected open close callback: ' + error);
                start(1);
              });
            }, function (error) {
              ok(false, 'close 1/4: unexpected delete close callback: ' + error);
              start(1);
            });
          }, function (error) {
            ok(false, 'open 1/4: unexpected open error callback: ' + error);
            start(1);
          });
        });

        test_it(suiteName + ' repeatedly open and close database faster (5x)', function () {
          // XXX CURRENTLY BROKEN on iOS due to current background processing implementation
          if (!(isAndroid || isIE)) pending('CURRENTLY BROKEN on iOS (background processing implementation)');

          var dbName = "repeatedly-open-and-close-faster-5x.db";

          // async test coming up
          stop(1);

          var db = openDatabase({name: dbName, location: 0});
          ok(!!db, 'valid db object 1/5');
          db.close(function () {
            ok(true, 'success 1/5');

            db = openDatabase({name: dbName, location: 0});
            ok(!!db, 'valid db object 2/5');
            db.close(function () {
              ok(true, 'success 2/5');

              db = openDatabase({name: dbName, location: 0});
              ok(!!db, 'valid db object 3/5');
              db.close(function () {
                ok(true, 'success 3/5');

                db = openDatabase({name: dbName, location: 0});
                ok(!!db, 'valid db object 4/5');
                db.close(function () {
                  ok(true, 'success 4/5');

                  db = openDatabase({name: dbName, location: 0});
                  ok(!!db, 'valid db object 5/5');
                  db.close(function () {
                    ok(true, 'success 5/5');

                    start(1);
                  }, function (error) {
                    ok(false, 'close 5/5: unexpected close error callback: ' + error);
                    start(1);
                  });
                }, function (error) {
                  ok(false, 'close 4/5: unexpected close error callback: ' + error);
                  start(1);
                });
              }, function (error) {
                ok(false, 'close 3/5: unexpected close error callback: ' + error);
                start(1);
              });
            }, function (error) {
              ok(false, 'close 2/5: unexpected close error callback: ' + error);
              start(1);
            });
          }, function (error) {
            ok(false, 'close 1/5: unexpected close error callback: ' + error);
            start(1);
          });
        });

        // Needed to support some large-scale applications:
        test_it(suiteName + ' repeatedly open and delete database (4x)', function () {
          var dbName = "repeatedly-open-and-delete-4x.db";
          var dbargs = {name: dbName, iosDatabaseLocation: 'Documents'};

          // async test coming up
          stop(1);

          openDatabase(dbargs, function(db) {
            ok(true, 'valid db object 1/4');
            deleteDatabase(dbargs, function () {
              ok(true, 'success 1/4');

              openDatabase(dbargs, function(db) {
                ok(true, 'valid db object 2/4');
                deleteDatabase(dbargs, function () {
                  ok(true, 'success 2/4');

                  openDatabase(dbargs, function(db) {
                    ok(true, 'valid db object 3/4');
                    deleteDatabase(dbargs, function () {
                      ok(true, 'success 3/4');

                      openDatabase(dbargs, function(db) {
                        ok(true, 'valid db object 4/4');
                        deleteDatabase(dbargs, function () {
                          ok(true, 'success 4/4');

                          start(1);
                        }, function (error) {
                          ok(false, 'delete 4/4: unexpected delete error callback: ' + error);
                          start(1);
                        });
                      }, function (error) {
                        ok(false, 'open 4/4: unexpected open error callback: ' + error);
                        start(1);
                      });
                    }, function (error) {
                      ok(false, 'delete 3/4: unexpected delete error callback: ' + error);
                      start(1);
                    });
                  }, function (error) {
                    ok(false, 'open 3/4: unexpected open error callback: ' + error);
                    start(1);
                  });
                }, function (error) {
                  ok(false, 'delete 2/4: unexpected delete error callback: ' + error);
                  start(1);
                });
              }, function (error) {
                ok(false, 'open 2/4: unexpected open error callback: ' + error);
                start(1);
              });
            }, function (error) {
              ok(false, 'delete 1/4: unexpected delete error callback: ' + error);
              start(1);
            });
          }, function (error) {
            ok(false, 'open 1/4: unexpected open error callback: ' + error);
            start(1);
          });
        });

        // Needed to support some large-scale applications:
        test_it(suiteName + ' repeatedly open and delete database faster (5x)', function () {
          // XXX CURRENTLY BROKEN on iOS due to current background processing implementation
          if (!(isAndroid || isIE)) pending('CURRENTLY BROKEN on iOS (background processing implementation)');

          var dbName = "repeatedly-open-and-delete-faster-5x.db";

          // async test coming up
          stop(1);

          var db = openDatabase({name: dbName, location: 0});
          ok(!!db, 'valid db object 1/5');
          sqlitePlugin.deleteDatabase({name: dbName, location: 0}, function () {
            ok(true, 'success 1/5');

            db = openDatabase({name: dbName, location: 0});
            ok(!!db, 'valid db object 2/5');
            sqlitePlugin.deleteDatabase({name: dbName, location: 0}, function () {
              ok(true, 'success 2/5');

              db = openDatabase({name: dbName, location: 0});
              ok(!!db, 'valid db object 3/5');
              sqlitePlugin.deleteDatabase({name: dbName, location: 0}, function () {
                ok(true, 'success 3/5');

                db = openDatabase({name: dbName, location: 0});
                ok(!!db, 'valid db object 4/5');
                sqlitePlugin.deleteDatabase({name: dbName, location: 0}, function () {
                  ok(true, 'success 4/5');

                  db = openDatabase({name: dbName, location: 0});
                  ok(!!db, 'valid db object 5/5');
                  sqlitePlugin.deleteDatabase({name: dbName, location: 0}, function () {
                    ok(true, 'success 5/5');

                    start(1);
                  }, function (error) {
                    ok(false, 'expected delete 5/5 error callback not to be called for an open database' + error);
                    start(1);
                  });
                }, function (error) {
                  ok(false, 'expected delete 4/5 error callback not to be called for an open database' + error);
                  start(1);
                });
              }, function (error) {
                ok(false, 'expected delete 3/5 error callback not to be called for an open database' + error);
                start(1);
              });
            }, function (error) {
              ok(false, 'expected delete 2/5 error callback not to be called for an open database' + error);
              start(1);
            });
          }, function (error) {
            ok(false, 'expected delete 1/5 error callback not to be called for an open database' + error);
            start(1);
          });
        });

    });

  });

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
