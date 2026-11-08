#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p build/test-classes
javac -d build/test-classes app/src/main/java/io/firsthit/studio/FirstHitEngine.java tests/EngineSelfTest.java tests/PerformanceModeTest.java
java -cp build/test-classes EngineSelfTest
java -cp build/test-classes PerformanceModeTest
