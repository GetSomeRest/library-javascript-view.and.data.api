#Autodesk View and Data API JavaScript Wrapper Library

[![LMV](https://img.shields.io/badge/View%20%26%20Data%20API-v1.2.17-green.svg)](http://developer-autodesk.github.io/)

##Description

Update to v1.2.14   - August 5th, 2015

This sample contains JavaScript libraries providing high level wrappers and features for the Autodesk View & Data API:

- Autodesk.ADN.Toolkit.ViewData.js

Provides a high-level wrapper to work with the server-side View & Data REST API:

- Check existence of a bucket/Retrieve details of bucket
- Create new bucket
- Upload a file to bucket
- Register file for translation
- Check translation progress
- Retrieve viewable details

Provides a high-level wrapper to work with the viewer client-side JavaScript API:

- Autodesk.ADN.Toolkit.Viewer.js


##Dependencies

None

##Setup/Usage Instructions

* Include relevant js files in your html project
* See html sample files for example on how to use the libs:

    - Autodesk.ADN.Toolkit.ViewData.js: see view-data-wrapper-test.html

    - Autodesk.ADN.Toolkit.Viewer.js: see viewer-wrapper-test.html for a complete example

            var viewerFactoryConfig = {

                environment: 'AutodeskProduction'
            };

            var viewerConfig = {

                lightPreset: 8,
                viewerType: 'Viewer3D', //['Viewer3D', 'GuiViewer3D']
                qualityLevel: [true, true],
                navigationTool:'freeorbit',
                progressiveRendering: true,
                backgroundColor:[3,4,5, 250, 250, 250]
            };

            var viewerFactory = new Autodesk.ADN.Toolkit.Viewer.AdnViewerFactory (
                document.getElementById("token").value,
                viewerFactoryConfig);

            viewerFactory.onInitialized (function() {

                viewerFactory.getViewablePath(viewable.urn,
                    function(pathCollection){

                        //the DOM container
                        var viewerContainer = document.getElementById("viewer");

                        viewer = viewerFactory.createViewer(
                                viewerContainer,
                                viewerConfig);

                        //loads the first 3d or 2d path available
                        if(pathCollection.path3d.length > 0) {

                            viewer.load(pathCollection.path3d[0].path);
                        }

                        else if(pathCollection.path2d.length > 0) {

                            viewer.load(pathCollection.path2d[0].path);
                        }
                    },
                    function(error) {

                        console.log(error);
                    });

## License

library-javascript-view.and.data.api is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.

##Written by

[Balaji Ramamoorthy](http://adndevblog.typepad.com/autocad/balaji-ramamoorthy.html), [Philippe Leefsma](http://adndevblog.typepad.com/cloud_and_mobile/philippe-leefsma.html) & [Daniel Du](http://adndevblog.typepad.com/cloud_and_mobile/daniel-du.html)
