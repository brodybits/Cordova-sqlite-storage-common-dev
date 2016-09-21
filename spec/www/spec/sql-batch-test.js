/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows (8.1)
var isAndroid = !isWindows && /Android/.test(navigator.userAgent);

// NOTE: In the common storage-master branch there is no difference between the
// default implementation and implementation #2. But the test will also apply
// the androidLockWorkaround: 1 option in the case of implementation #2.
var pluginScenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'Plugin-implementation-2'
];

var pluginScenarioCount = isAndroid ? 2 : 1;

// simple tests:
var mytests = function() {

  for (var i=0; i<pluginScenarioCount; ++i) {

    describe(pluginScenarioList[i] + ': BATCH SQL test(s)', function() {
      var scenarioName = pluginScenarioList[i];
      var suiteName = scenarioName + ': ';
      var isImpl2 = (i === 1);

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
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 0});
        }
      }

      describe(pluginScenarioList[i] + ': Basic sql batch test(s)', function() {

        it(suiteName + 'Single-column batch sql test', function(done) {
          var db = openDatabase('Single-column-batch-sql-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            'CREATE TABLE MyTable (data)',
            [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
          ], function() {
            db.executeSql('SELECT * FROM MyTable', [], function (rs) {
              expect(rs.rows).toBeDefined();
              expect(rs.rows.length).toBe(1);
              expect(rs.rows.item(0).data).toBe('test-value');
              done();
            });
          }, function(error) {
            expect(true).toBe(false);
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'Single-column batch sql test values', function(done) {
          var db = openDatabase('Single-column-batch-sql-test-values.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            'CREATE TABLE MyTable (data)',
            [ 'INSERT INTO MyTable VALUES (?)', [0] ],
            [ 'INSERT INTO MyTable VALUES (?)', [101] ],
            [ 'INSERT INTO MyTable VALUES (?)', [1.01] ],
            [ 'INSERT INTO MyTable VALUES (?)', [true] ],
            [ 'INSERT INTO MyTable VALUES (?)', [false] ],
            [ 'INSERT INTO MyTable VALUES (?)', [null] ],
            [ 'INSERT INTO MyTable VALUES (?)', [undefined] ],
            [ 'INSERT INTO MyTable VALUES (?)', [Infinity] ],
            [ 'INSERT INTO MyTable VALUES (?)', [-Infinity] ],
            [ 'INSERT INTO MyTable VALUES (?)', [NaN] ],
          ], function() {
            db.executeSql('SELECT * FROM MyTable', [], function (rs) {
              expect(rs.rows).toBeDefined();
              expect(rs.rows.length).toBe(10);
              expect(rs.rows.item(0).data).toBe(0);
              expect(rs.rows.item(1).data).toBe(101);
              expect(rs.rows.item(2).data).toBe(1.01);
              expect(rs.rows.item(3).data).toBe('true');
              expect(rs.rows.item(4).data).toBe('false');
              expect(rs.rows.item(5).data).toBe(null);
              expect(rs.rows.item(6).data).toBe(null);
              expect(rs.rows.item(7).data).toBe(null);
              expect(rs.rows.item(8).data).toBe(null);
              expect(rs.rows.item(9).data).toBe(null);
              done();
            });
          }, function(error) {
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'batch sql with dynamic object for SQL [INCONSISTENT BEHAVIOR]', function(done) {
          // MyDynamicObject "class":
          function MyDynamicObject() { this.name = 'Alice'; };
          MyDynamicObject.prototype.toString = function() {return "INSERT INTO MyTable VALUES ('" + this.name + "')";}

          var myObject = new MyDynamicObject();
          // Check myObject:
          expect(myObject.toString()).toBe("INSERT INTO MyTable VALUES ('Alice')");

          var db = openDatabase('batch-sql-with-dynamic-object-for-sql.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          myObject.name = 'Betty';
          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            'CREATE TABLE MyTable (data)',
            myObject
          ], function() {
            db.executeSql('SELECT * FROM MyTable', [], function (res) {
              expect(res.rows.item(0).data).toBe('Carol');
              done();
            });
          }, function(error) {
            expect(true).toBe(false);
            done();
          });
          myObject.name = 'Carol';
        }, MYTIMEOUT);

        it(suiteName + 'batch sql with dynamic object for SQL arg value [INCONSISTENT BEHAVIOR]', function(done) {
          // MyDynamicParameterObject "class":
          function MyDynamicParameterObject() {this.name='Alice';};
          MyDynamicParameterObject.prototype.toString = function() {return this.name;};

          var myObject = new MyDynamicParameterObject();

          // Check myObject:
          expect(myObject.toString()).toBe('Alice');

          var db = openDatabase('batch-sql-with-dynamic-object-for-sql-arg-value.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          myObject.name = 'Betty';
          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            'CREATE TABLE MyTable (data)',
            [ 'INSERT INTO MyTable VALUES (?)', [myObject] ],
          ], function() {
            db.executeSql('SELECT * FROM MyTable', [], function (res) {
              expect(res.rows.item(0).data).toBe('Carol');
              done();
            });
          }, function(error) {
            expect(true).toBe(false);
            done();
          });
          myObject.name = 'Carol';
        }, MYTIMEOUT);

        it(suiteName + 'batch sql with syntax error', function(done) {
          var db = openDatabase('batch-sql-syntax-error-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            // syntax error below:
            'CRETE TABLE MyTable (SampleColumn)',
            [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
          ], function() {
            // not expected:
            expect(true).toBe(false);
            done();
          }, function(error) {
            // expected:
            expect(true).toBe(true);
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'batch sql failure-safe semantics', function(done) {
          var db = openDatabase('batch-sql-failure-safe-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.executeSql('DROP TABLE IF EXISTS MyTable');
          db.executeSql('CREATE TABLE MyTable (SampleColumn)');
          db.executeSql('INSERT INTO MyTable VALUES (?)', ['test-value'], function() {
            db.sqlBatch([
              'DELETE FROM MyTable',
              // syntax error below:
              [ 'INSRT INTO MyTable VALUES (?)', 'test-value' ]
            ], function() {
              // not expected:
              expect(true).toBe(false);
              done();
            }, function(error) {
              // check integrity:
              db.executeSql('SELECT * FROM MyTable', [], function (res) {
                expect(res.rows.item(0).SampleColumn).toBe('test-value');
                done();
              });
            });

          }, function(error) {
            expect(true).toBe(false);
            done();
          });
        }, MYTIMEOUT);

      });

    });
  }
}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
