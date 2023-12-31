TARGET=~/Downloads/${PWD##*/}.zip
echo ---- creating $TARGET
rm $TARGET
zip -r $TARGET . -x ".*" "*/.*" "*.sh"
zipinfo $TARGET
echo ---- done $TARGET
