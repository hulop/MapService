<!--
The MIT License (MIT)

Copyright (c) 2014, 2023 IBM Corporation
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->
# DirectoryService (hulop-directory)

DirectoryService provides categorized list of destination places.

## How to use

To provide categorized list of destination places, please prepare your own hulop-derectory module by customizing json files below.
You also need to include "building", category ("major_category", "sub_category", etc.) information into your Map by using Map Editor of [MapService](https://github.com/hulop/MapService).

### Building/Area information

Please customize building/area information by modifying json files in hulop.directory.buildings.
This module provides categorized list of destination places by matching keys in the json files and "building" information in your Map.

### Categories information

1. Please customize categories information by modifying json files in hulop.directory.categories.
2. Please customize how to provide categorized list of destination places by modifying directory.json in hulop.directory.
3. Please specify category ("major_category", "sub_category", etc.) information of destination place into your Map.
    - Please note that you need to specify category information in your map without prefix "CAT_" in keys of json files in hulop.directory.categories.
(For example, please specify "SHOP" for category information in Map to use the key "CAT_SHOP" in the catgories information json.)


This module provides categorized list of destination places by matching keys in the json files and category ("major_category", "sub_category", etc.) information in your Map. 

## About
[About HULOP](https://github.com/hulop/00Readme)

## License
[MIT](http://opensource.org/licenses/MIT)

## Prerequisites
- [Apache Wink version 1.4.0](https://wink.apache.org/) (Apache License v2.0)
- [Apache HttpClient version 4.3.6](http://hc.apache.org/httpcomponents-client-ga/) (Apache License v2.0)

