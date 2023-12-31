TARGET=~/Downloads/${PWD##*/}.zip
TARGET2=directory_config.zip
echo ---- creating $TARGET
rm $TARGET
cd src/hulop/directory
mkdir config
zip -r ./config/$TARGET2 . -x servlet\* ".*" "*/.*" "*.java"
zipinfo ./config/$TARGET2
zip -r $TARGET config
rm -rf config
cd -
echo ---- done $TARGET
