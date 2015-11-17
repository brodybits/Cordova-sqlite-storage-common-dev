# Automated cordova tests.  Installs the correct cordova platform,
# installs the plugin, installs the test app, and then runs it on
# a device or emulator.
#
# usage: coffee bin/test.coffee [android|ios|windows]
#
# Based on: bin/test.sh by @nolanlawson

require 'shelljs/global'

if process.argv.length < 3
  echo 'Usage: coffee t1.coffee android|ios|windows'
  exit 1

$platform = process.argv[2]

if not which 'coffee'
  echo "you need coffeescript. please install with:"
  echo "npm install -g coffee-script"
 
if not which 'cordova'
  echo "you need cordova. please install with:"
  echo "npm install -g cordova"
  exit 1

cd 'spec'

# compile coffeescript
if (exec 'coffee --no-header -cl -o ../www ../SQLitePlugin.coffee.md').code != 0
  echo 'Could not compile coffeescript'
  exit 1

# move everything to a temp folder to avoid infinite recursion errors
rm '-fr', '../.plugin'
mkdir '-p', '../.plugin'
cp '-r', '../src', '../plugin.xml', '../www', '../.plugin'

# update the plugin, run the test app
# XXX
rm '-fr', 'platforms/*'
rm '-fr', 'plugins/*.json'
rm '-fr', 'plugins/cordova*'
# FUTURE TBD:
#exec "cordova platform add #{$platform}"
#exec 'cordova plugin rm com.brodysoft.sqlitePlugin'
# TODO error checking
exec "cordova platform add #{$platform}"
exec 'cordova plugin add ../.plugin'
exec "cordova run #{$platform}"
