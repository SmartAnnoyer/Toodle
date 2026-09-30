@echo off
setlocal
if exist "%USERPROFILE%\.jdks\jdk-21.0.12.1+1\bin\java.exe" set "JAVA_HOME=%USERPROFILE%\.jdks\jdk-21.0.12.1+1"
if exist "C:\Android\Sdk" set "ANDROID_HOME=C:\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
call "%~dp0gradlew.bat" bundleRelease %*
