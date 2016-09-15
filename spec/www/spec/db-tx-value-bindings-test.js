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

var isWP8X = /IEMobile/.test(navigator.userAgent); // WP8/Windows Phone 8.1
var isWindows = /Windows /.test(navigator.userAgent); // Windows 8.1/Windows Phone 8.1/Windows 10
var isAndroid = !isWindows && /Android/.test(navigator.userAgent);

// NOTE: In certain versions such as Cordova-sqlcipher-adapter there is
// no difference between the default implementation and implementation #2.
// But the test will also specify the androidLockWorkaround: 1 option
// in case of implementation #2 (also ignored by Cordova-sqlcipher-adapter).
var scenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'HTML5',
  'Plugin-implementation-2'
];

var scenarioCount = (!!window.hasBrowserWithWebSQL) ? (isAndroid ? 3 : 2) : 1;

var mytests = function() {

  for (var i=0; i<scenarioCount; ++i) {

    describe(scenarioList[i] + ': tx stored parameter value bindings test(s)', function() {
      var scenarioName = scenarioList[i];
      var suiteName = scenarioName + ': ';
      var isWebSql = (i === 1);
      var isImpl2 = (i === 2);

      // NOTE: MUST be defined in function scope, NOT outer scope:
      var openDatabase = function(name, ignored1, ignored2, ignored3) {
        if (isImpl2) {
          return window.sqlitePlugin.openDatabase({
            // prevent reuse of database from default db implementation:
            name: 'i2-'+name,
            androidDatabaseImplementation: 2,
            androidLockWorkaround: 1,
            location: 1
          });
        }
        if (isWebSql) {
          return window.openDatabase(name, "1.0", "Demo", DEFAULT_SIZE);
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 0});
        }
      }

      describe(suiteName + 'transaction column value bindings semantics test(s)', function() {

        it(suiteName + "all columns should be included in result set (including 'null' columns)", function(done) {

          var db = openDatabase('all-result-columns-including-null-columns.db', '1.0', 'Demo', DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');

          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("insert into test_table (data, data_num) VALUES (?,?)", ["test", null], function(tx, res) {

                expect(res).toBeDefined();
                expect(res.rowsAffected).toEqual(1);

                tx.executeSql("select * from test_table", [], function(tx, res) {
                  var row = res.rows.item(0);

                  //deepEqual(row, { id: 1, data: "test", data_num: null }, "all columns should be included in result set.");
                  expect(row.id).toBe(1);
                  expect(row.data).toEqual('test');
                  expect(row.data_num).toBeDefined();
                  expect(row.data_num).toBeNull();

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
              });
            });
          });
        });

      });

      describe(scenarioList[i] + ': tx column value insertion test(s)', function() {

        it(suiteName + "number values inserted using number bindings", function(done) {

          var db = openDatabase("Value-binding-test.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // create columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data_text1, data_text2, data_int, data_real)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {

              tx.executeSql("insert into test_table (data_text1, data_text2, data_int, data_real) VALUES (?,?,?,?)", ["314159", "3.14159", 314159, 3.14159], function(tx, res) {

                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql("select * from test_table", [], function(tx, res) {
                  var row = res.rows.item(0);

                  expect(row.id).toBe(1);
                  expect(row.data_text1).toBe("314159"); // (data_text1 should have inserted data as text)

                  if (!isWP8X) // JSON issue in WP8 version
                    expect(row.data_text2).toBe("3.14159"); // (data_text2 should have inserted data as text)

                  expect(row.data_int).toBe(314159); // (data_int should have inserted data as an integer)
                  expect(Math.abs(row.data_real - 3.14159) < 0.000001).toBe(true); // (data_real should have inserted data as a real)

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
              });
            });
          });
        });

        it(suiteName + "Big [integer] value bindings", function(done) {
          var db = openDatabase("Big-int-bindings.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (test_date INTEGER, test_text TEXT)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("insert into tt (test_date, test_text) VALUES (?,?)",
                  [1424174959894, 1424174959894], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);
                tx.executeSql("select * from tt", [], function(tx, res) {
                  // (Big integer number inserted properly)
                  var row = res.rows.item(0);
                  expect(row.test_date).toBe(1424174959894);

                  // NOTE: big number apparently stored in field with TEXT affinity with slightly
                  // different conversion in plugin vs. WebKit Web SQL!
                  if (isWebSql)
                    expect(row.test_text).toBe("1424174959894.0"); // ([Big] number inserted as string ok)
                  else
                    expect(row.test_text).toBe("1424174959894"); // (Big integer number inserted as string ok)

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
              });
            });
          });
        });

        it(suiteName + "Double precision decimal number insertion", function(done) {
          var db = openDatabase("Double-precision-number-insertion.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (tr REAL)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("insert into tt (tr) VALUES (?)", [123456.789], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql("select * from tt", [], function(tx, res) {
                  var row = res.rows.item(0);
                  expect(row.tr).toBe(123456.789); // (Decimal number inserted properly)

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
              });
            });
          });
        });

        it(suiteName + "executeSql parameter as array", function(done) {
          var db = openDatabase("array-parameter.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data1, data2)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("insert into test_table (data1, data2) VALUES (?,?)", ['abc', [1,2,3]], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);
                tx.executeSql("select * from test_table", [], function(tx, res) {
                  var row = res.rows.item(0);
                  expect(row.id).toBe(1);
                  expect(row.data1).toBe('abc');
                  expect(row.data2).toBe('1,2,3');

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
              });
            });
          });
        });

        it(suiteName + "executeSql parameter as 'boolean' true/false values (apparently stringified)", function(done) {
          var db = openDatabase("array-parameter.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // create columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data1, data2)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("INSERT INTO test_table (data1, data2) VALUES (?,?)", [true, false], function(tx, rs1) {
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql("select * from test_table", [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0).id).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('true');
                  expect(rs2.rows.item(0).data2).toBe('false');

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
              });
            });
          });
        });

      });

      describe(suiteName + 'SQL parameter count mismatch test(s)', function() {

        it(suiteName + 'executeSql with not enough parameters' +
           (isWebSql ? ' [REJECTED by Web SQL]' : ' [Plugin DEVIATION: NOT REJECTED]'), function(done) {
          var db = openDatabase("not-enough-parameters.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data1, data2)');

          }, function(error) {
            expect(false).toBe(true);
            expect(error.message).toBe('---');
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("INSERT INTO test_table (data1, data2) VALUES (?,?)", ['first'], function(tx, rs1) {
                // ACTUAL for plugin (Android/iOS/Windows):
                if (isWebSql) expect('RESULT NOT EXPECTED for Web SQL').toBe('--');
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql("select * from test_table", [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('first');
                  expect(rs2.rows.item(0).data2).toBeNull();
                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });

              }, function(ignored, error) {
                // CORRECT (Web SQL):
                if (!isWebSql) expect('Plugin behavior changed please update this test').toBe('--');
                expect(error).toBeDefined();
                expect(error.code).toBeDefined();
                expect(error.message).toBeDefined();
                // WebKit Web SQL reports correct error code (5 - SYNTAX_ERR) in this case.
                expect(error.code).toBe(5);
                // WebKit Web SQL error message (Android/iOS):
                expect(error.message).toMatch(/number of '\?'s in statement string does not match argument count/);
                // Close (plugin only) & finish:
                (isWebSql) ? done() : db.close(done, done);
              });
            });
          });
        });

        it(suiteName + 'executeSql with too many parameters' +
           ((!isWebSql && !isAndroid && !isWindows) ? ' [iOS PLUGIN BROKEN: extra parameter silently ignored]' : ' [REJECTED properly]'), function(done) {
          if (isWP8X) pending('SKIP for WP8'); // FUTURE TBD

          var db = openDatabase("too-many-parameters.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data1, data2)');

          }, function(error) {
            expect(false).toBe(true);
            expect(error.message).toBe('---');
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("INSERT INTO test_table (data1, data2) VALUES (?,?)", ['first', 'second', 'third'], function(tx, rs1) {
                // ACTUAL for iOS plugin ref: litehelpers/Cordova-sqlite-storage#552,
                // WP8 ref: litehelpers/Cordova-sqlite-legacy-build-support#8
                if (isWebSql) expect('RESULT NOT EXPECTED for Web SQL').toBe('--');
                if (!isWebSql && (isAndroid || isWindows)) expect('RESULT NOT EXPECTED for Android/Windows plugin').toBe('--');
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql("select * from test_table", [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('first');
                  expect(rs2.rows.item(0).data2).toBe('second');
                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });

              }, function(ignored, error) {
                // CORRECT (Web SQL; Android & Windows plugin):
                if (!isWebSql && !isAndroid && !isWindows) expect('Plugin behavior changed please update this test').toBe('--');
                expect(error).toBeDefined();
                expect(error.code).toBeDefined();
                expect(error.message).toBeDefined();

                // PLUGIN BROKEN:
                // Reports INVALID "SQLException" code -1 on Windows
                // Otherwise reports INCORRECT error code: 0 (UNKNOWN_ERR)
                // WebKit Web SQL reports correct error code: 5 (SYNTAX_ERR) in this case.
                // ref: https://www.w3.org/TR/webdatabase/#dom-sqlexception-code-syntax
                if (isWP8X)
                  expect(true).toBe(true); // SKIP for now
                else if (isWindows)
                  expect(error.code).toBe(-1); // INVALID (should be unsigned)
                else if (!isWebSql)
                  expect(error.code).toBe(0);
                else
                  expect(error.code).toBe(5);

                // WebKit Web SQL error message (Android/iOS) vs plugin error message [Plugin INCONSISTENT message on Windows]
                if (isWebSql)
                  expect(error.message).toMatch(/number of '\?'s in statement string does not match argument count/);
                else if (isWP8X)
                  expect(true).toBe(true); // SKIP for now
                else if (isWindows)
                  expect(error.message).toMatch(/Error 25 when binding argument to SQL query/);
                else
                  expect(error.message).toMatch(/index.*out of range/);

                // Close (plugin only) & finish:
                (isWebSql) ? done() : db.close(done, done);
              });
            });
          });
        });

      });

      describe(scenarioList[i] + ': additional tx column value binding test(s)', function() {

        // FUTURE TODO: fix these tests to follow the Jasmine style:

        test_it(suiteName + ' stores [Unicode] string with \\u0000 correctly', function () {
          if (isWindows) pending('BROKEN on Windows'); // XXX
          if (isWP8X) pending('BROKEN for WP8'); // [BUG #202] UNICODE characters not working with WP8
          if (isAndroid && !isWebSql && !isImpl2) pending('BROKEN for Android (default sqlite-connector version)'); // XXX

          stop();

          var dbName = "Database-Unicode";
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS test', [], function () {
              tx.executeSql('CREATE TABLE test (name, id)', [], function() {
                tx.executeSql('INSERT INTO test VALUES (?, "id1")', ['\u0000foo'], function () {
                  tx.executeSql('SELECT hex(name) AS `hex` FROM test', [], function (tx, res) {
                    // select hex() because even the native database doesn't
                    // give the full string. it's a bug in WebKit apparently
                    var hex = res.rows.item(0).hex;

                    // varies between Chrome-like (UTF-8)
                    // and Safari-like (UTF-16)
                    var expected = [
                      '000066006F006F00',
                      '00666F6F'
                    ];
                    ok(expected.indexOf(hex) !== -1, 'hex matches: ' +
                        JSON.stringify(hex) + ' should be in ' +
                        JSON.stringify(expected));

                    // ensure this matches our expectation of that database's
                    // default encoding
                    tx.executeSql('SELECT hex("foob") AS `hex`', [], function (tx, res) {
                      var otherHex = res.rows.item(0).hex;
                      equal(hex.length, otherHex.length,
                          'expect same length, i.e. same global db encoding');

                      checkCorrectOrdering(tx);
                    });
                  })
                });
              });
            });
          }, function(err) {
            ok(false, 'unexpected error: ' + err.message);
          }, function () {
          });
        });

        function checkCorrectOrdering(tx) {
          var least = "54key3\u0000\u0000";
          var most = "54key3\u00006\u0000\u0000";
          var key1 = "54key3\u00004bar\u000031\u0000\u0000";
          var key2 = "54key3\u00004foo\u000031\u0000\u0000";

          tx.executeSql('INSERT INTO test VALUES (?, "id2")', [key1], function () {
            tx.executeSql('INSERT INTO test VALUES (?, "id3")', [key2], function () {
              var sql = 'SELECT id FROM test WHERE name > ? AND name < ? ORDER BY name';
              tx.executeSql(sql, [least, most], function (tx, res) {
                equal(res.rows.length, 2, 'should get two results');
                equal(res.rows.item(0).id, 'id2', 'correct ordering');
                equal(res.rows.item(1).id, 'id3', 'correct ordering');

                start();
              });
            });
          });
        }

        test_it(suiteName + ' returns [Unicode] string with \\u0000 correctly', function () {
          if (isWindows) pending('BROKEN on Windows'); // XXX
          if (isWP8X) pending('BROKEN for WP8'); // [BUG #202] UNICODE characters not working with WP8

          stop();

          var dbName = "Database-Unicode";
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS test', [], function () {
              tx.executeSql('CREATE TABLE test (name, id)', [], function() {
                tx.executeSql('INSERT INTO test VALUES (?, "id1")', ['\u0000foo'], function () {
                  tx.executeSql('SELECT name FROM test', [], function (tx, res) {
                    var name = res.rows.item(0).name;

                    var expected = [
                      '\u0000foo'
                    ];

                    // There is a bug in WebKit and Chromium where strings are created
                    // using methods that rely on '\0' for termination instead of
                    // the specified byte length.
                    //
                    // https://bugs.webkit.org/show_bug.cgi?id=137637
                    //
                    // For now we expect this test to fail there, but when it is fixed
                    // we would like to know, so the test is coded to fail if it starts
                    // working there.
                    if(isWebSql) {
                        ok(expected.indexOf(name) === -1, 'field value: ' +
                            JSON.stringify(name) + ' should not be in this until a bug is fixed ' +
                            JSON.stringify(expected));

                        equal(name.length, 0, 'length of field === 0');
                        start();
                        return;
                    }

                    // correct result:
                    ok(expected.indexOf(name) !== -1, 'field value: ' +
                        JSON.stringify(name) + ' should be in ' +
                        JSON.stringify(expected));

                    equal(name.length, 4, 'length of field === 4');
                    start();
                  })
                });
              });
            });
          }, function(err) {
            ok(false, 'unexpected error: ' + err.message);
          }, function () {
          });
        });

        // XXX Brody NOTE: same issue is now reproduced in a string test.
        //           TBD ???: combine with other test
        // BUG #147 iOS version of plugin BROKEN:
        test_it(suiteName +
            ' handles UNICODE \\u2028 line separator correctly [in database]', function () {
          if (isWP8X) pending('BROKEN for WP8'); // [BUG #202] UNICODE characters not working with WP8
          if (!isWebSql && !isAndroid && !isWindows && !isWP8X) pending('BROKEN for iOS'); // [BUG #147] (no callback received)

          var dbName = "Unicode-line-separator.db";
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          stop(2);

          db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS test', [], function () {
              tx.executeSql('CREATE TABLE test (name, id)', [], function() {
                tx.executeSql('INSERT INTO test VALUES (?, "id1")', ['hello\u2028world'], function () {
                  tx.executeSql('SELECT name FROM test', [], function (tx, res) {
                    var name = res.rows.item(0).name;

                    var expected = [
                      'hello\u2028world'
                    ];

                    ok(expected.indexOf(name) !== -1, 'field value: ' +
                       JSON.stringify(name) + ' should be in ' +
                       JSON.stringify(expected));

                    equal(name.length, 11, 'length of field should be 15');
                    start();
                  })
                });
              });
            });
          }, function(err) {
            ok(false, 'unexpected error: ' + err.message);
            start(2);
          }, function () {
            ok(true, 'transaction ok');
            start();
          });
        });

      });

    });
  }

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
