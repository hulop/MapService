pwd=`pwd`

cd ./MapService/WebContent
curl -L -O https://github.com/openlayers/openlayers/releases/download/v4.6.4/v4.6.4-dist.zip
unzip v4.6.4-dist.zip && rm v4.6.4-dist.zip
mv v4.6.4-dist openlayers/v4.6.4

cd jquery
curl -L -O https://code.jquery.com/jquery-1.11.3.min.js
curl -L -O https://rawgit.com/arschmitz/jquery-mobile-nestedlists/master/jquery.mobile.nestedlists.js
curl -L -O https://jquerymobile.com/resources/download/jquery.mobile-1.4.5.zip
unzip jquery.mobile-1.4.5.zip -x "demos/**" "jquery.mobile.*" && rm jquery.mobile-1.4.5.zip

cd $pwd

