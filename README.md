#Autodesk View and Data API JavaScript Wrapper Library


##Description

This sample contains JavaScript libraries providing high level wrappers and features for the Autodesk View & Data API:

- Autodesk.ADN.Toolkit.ViewData.js

Provides a high-level wrapper to work with the View & Data REST API:

    * Check existence of a bucket/Retrieve details of bucket
    * Create new bucket
    * Upload a file to bucket
    * Register file for translation
    * Check translation progress
    * Retrieve viewable details

- Autodesk.ADN.Toolkit.Viewer.js

Provides a high-level wrapper to work with the viewer client-side JavaScript API

- Autodesk.ADN.Viewing.Extension.API.js

Provides some additional methods to the viewer object. See [this blog post](http://adndevblog.typepad.com/cloud_and_mobile/2014/10/how-to-write-custom-extensions-for-the-large-model-viewer.html) for more information about how to use viewer extensions

##Dependencies

None

##Setup/Usage Instructions

* Include relevant js files in your html project
* See html sample files for example on how to use the libs:

    - Autodesk.ADN.Toolkit.ViewData.js: see view-data-wrapper-test.html
    
    - Autodesk.ADN.Toolkit.Viewer.js: see viewer-test.html for a complete example

        $(document).ready(function () {

            var config = {

                environment : 'AutodeskProduction' // 'AutodeskProduction' | 'AutodeskStaging'
                viewerType: '' //'GuiViewer3D' | 'Viewer3D'
            }

            var adnViewerMng = new Autodesk.ADN.Toolkit.Viewer.AdnViewerManager(
                tokenurl,  // url of your token service (ex reply: {token_type: "Bearer", expires_in: 1799, access_token: "..."}
                document.getElementById('viewerDiv'), //viewer div id
                config);

            adnViewerMng.loadDocument(urn, onViewerInitialized, onError);
        });

        function onViewerInitialized(viewer)
        {
            console.log('Viewer initialized');
        };

        function onError(error)
        {
            console.log(error);
        };


## License

library-javascript-view.and.data.api is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.

##Written by 

[Balaji Ramamoorthy](http://adndevblog.typepad.com/autocad/balaji-ramamoorthy.html) & [Philippe Leefsma](http://adndevblog.typepad.com/cloud_and_mobile/philippe-leefsma.html)



