//Change '3dViewDiv' to the Div id in your application that will be associated with the viewer
var divid = '3dViewDiv';

// Bucket to use for uploading the file
var bucketName = null;

var baseurl = "https://developer.api.autodesk.com";

// File to upload
var fileName2Upload = null;

// Access token to use for http requests to the view and data api server
var _accessToken = null;

// Viewer 3D
var viewer3D;

var xmlhttp;

// Timer to check the translation progress
var translationProgressTimer = null;

// Geometry nodes
var geometryItems;
var geometryFilter3d = { 'type': 'geometry', 'role': '3d' };

// Viewer Document
var currentViewerDoc;

// Document Id that is to be loaded
var documentId;

// Load the viewer document after we have the document urn
function LoadViewerDocument() {
    var options = {
        'document': documentId,
        'accessToken': _accessToken,
        'env': 'AutodeskProduction'
    };

    Autodesk.Viewing.Initializer(options, function () {
        // Create a Viewer3D. 
        var viewer3DContainerDiv = htmlDoc.getElementById(divid);

        viewer3D = new Autodesk.Viewing.BaseViewer3D(viewer3DContainerDiv, {});
        
        // Initialize the viewer
        viewer3D.initialize();

        // Load the document and associate the document with our Viewer3D
        Autodesk.Viewing.Document.load(documentId, Autodesk.Viewing.Private.getAuthObject(), onSuccessDocumentLoadCB, onErrorDocumentLoadCB);
    });
}

// Document successfully loaded 
function onSuccessDocumentLoadCB(viewerDocument) {

    currentViewerDoc = viewerDocument;
    var rootItem = viewerDocument.getRootItem();

    //store in globle variable
    geometryItems = Autodesk.Viewing.Document.getSubItemsWithProperties(rootItem, geometryFilter3d, true);

    if (geometryItems.length > 0) {

        var item3d = viewerDocument.getViewablePath(geometryItems[0]);

        // Load the viewable to the viewer
        viewer3D.load(item3d);

        console.log("Loading 3d Geometry from document : " + documentId);
    }
    else {
        console.log("3d Geometry not found in document : " + documentId);
    }
}

// Some error during document load
function onErrorDocumentLoadCB(errorMsg, errorCode) {
    console.log("Unable to load the document : " + documentId + errorMsg);
}

function xmlHttpRequestHandler() {
    //console.log(xmlhttp.responseText);
    //if (xmlhttp.readyState == 4 && xmlhttp.status==200)  
    //{
    //  OK 
    //}
}

function xmlHttpRequestErrorHandler() {
    //console.log(xmlhttp.responseText);
}

// This is expected to set the cookie upon server response
// Subsequent http requests to this domain will automatically send the cookie for authentication
function setToken() {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open('POST', baseurl + '/utility/v1/settoken', false);
    xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xmlhttp.onreadystatechange = xmlHttpRequestHandler;
    xmlhttp.onerror = xmlHttpRequestErrorHandler;
    xmlhttp.withCredentials = true;
    xmlhttp.send("access-token=" + _accessToken);
}

// This function will be called periodically to check the status of the 
// file translation. If the translation is done, it will call try loading the document in viewer
function CheckTranslationProgress() {
    var objkey = escape(fileName2Upload.name);
    var urn = "urn:adsk.objects:os.object:" + bucketName + "/" + objkey;
    var base64URN = utf8_to_b64(urn);
    var check = b64_to_utf8(base64URN);
    var base64URNold = window.btoa(urn);
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', baseurl + '/viewingservice/v1/' + base64URN, false);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            // From the response string, get the progress.
            var response = xmlhttp.responseText;
            var passedTXT = response;
            var index = passedTXT.indexOf("\"progress\":\"") + "\"progress\":\"".length;
            var status = passedTXT.substring(index, passedTXT.indexOf("\"", index + 1));

            if (status == "complete") {
                // Done, lets load the document in viewer.
                Ready();
            }
        }
    };
    xmlhttp.onerror = xmlHttpRequestErrorHandler;
    xmlhttp.withCredentials = true;
    xmlhttp.send();
}

// Get details about an existing bucket.
// Not used in this project
// It can help get the details of an existing bucket in case we need it.
function getBucketDetails() {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', baseurl + "/oss/v1/buckets/" + bucketName + "/details", false);
    xmlhttp.onreadystatechange = xmlHttpRequestHandler;
    xmlhttp.onerror = xmlHttpRequestErrorHandler;
    xmlhttp.withCredentials = true;
    xmlhttp.send();
}

// Uploads the file to the bucket.
// On successful upload, it starts the translation of the uploaded file.
function uploadFile() {

    var f = fileName2Upload;
    var objkey = f.name;
    var url = baseurl + '/oss/v1/buckets/' + bucketName + '/objects/' + objkey;
    var headers = {
        'Authorization': _accessToken,
        'Content-Type': f.type || 'application/stream'
    };

    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        xhr.open('PUT', url, true);
        xhr.withCredentials = true;
        for (var h in headers) {
            xhr.setRequestHeader(h, headers[h]);
        }
    }

    xhr.onload = function () {
        // File uploaded to the bucket. 
        // To get the Base64URN of the OSS file urn from the OSS upload response
        // and POST a call to start translation process
        StartTranslation(xhr.responseText);
    };

    xhr.onerror = function () { alert('Sorry, there was an error making the request.'); };
    xhr.onprogress = updateProgress;

    var reader = new FileReader();

    reader.onerror = errorHandler;

    reader.onabort = function (e) {
        alert('File read cancelled');
    };

    reader.onloadstart = function (e) {
    };

    reader.onload = function (e) {
    }

    // FileReader completed reading the file
    reader.onloadend = function (evt) {
        if (evt.target.readyState == FileReader.DONE) {
            // Upload the file contents to the bucket
            xhr.send(evt.target.result);
        }
    };

    // Read the file contents 
    var blob = f.slice(0, f.size);
    reader.readAsArrayBuffer(blob);
}

// To get the Base64URN of the OSS file urn from the upload response
// and POST a call to start translation process
function StartTranslation(ossUploadResponse) {
    // POST call to start translation
    // This will start the translation process for a design file/assembly,
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open('POST', baseurl + '/viewingservice/v1/register', false);
    xmlhttp.setRequestHeader('Content-Type', 'application/json');
    xmlhttp.onreadystatechange = submittedRequestForTranslation;
    xmlhttp.withCredentials = true;

    // From the response that we received during our file upload,
    // get the document urn.
    var passedTXT = ossUploadResponse;
    var index = passedTXT.indexOf("\"id\" : \"") + "\"id\" : \"".length;
    var urn = passedTXT.substring(index, passedTXT.indexOf("\"", index + 1));

    // base64 encode it
    var base64URN = utf8_to_b64(urn);
    //var check = b64_to_utf8(base64URN);

    // Append urn: to the document urn for loading it in viewer
    documentId = "urn:" + base64URN;

    var tosend = "{ \"urn\": \"" + base64URN + "\"}";
    xmlhttp.send(tosend);
}

// Callback for http web request
function xmlHttpRequestHandler() {
    //if (xmlhttp.readyState == 4 && xmlhttp.status==200)  
    //{
    //  OK 
    //}
}

// Encoding of a string
function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

// Decoding of a string
function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

// Callback in case of error for http web request
function xmlHttpRequestErrorHandler() {
    // Reset busy indicator
    normal();
}

function submittedRequestForTranslation() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        // Translation is started, but may not be complete
        //  So lets periodically check the translation progress.
        if (translationProgressTimer == null) {
            translationProgressTimer = setInterval(CheckTranslationProgress, 3000);
        }

        // Show busy indicator
        busy();

        // Change to wait cursor
        $("body").css("cursor", "progress");
    }
    else if (xmlhttp.status == 201) {// Translation is done. 

        // Translation is done, we can load the document in viewer
        Ready();
    }
}

// Resets the busy indicator and loads the document in viewer.
function Ready() {

    // Reset busy indicator
    normal();

    // Restore normal cursor
    $("body").css("cursor", "default");

    if (translationProgressTimer != null) {
        // Stop the translation progress check timer.
        window.clearInterval(translationProgressTimer);
        translationProgressTimer = null;
    }

    // Load the document in viewer
    LoadViewerDocument();
}

// Error callback in case of issues in reading the file contents
function errorHandler(evt) {

    // Reset busy indicator
    normal();

    switch (evt.target.error.code) {
        case evt.target.error.NOT_FOUND_ERR:
            UpdateCommandLine("FileReader error : File Not Found!");
            break;

        case evt.target.error.NOT_READABLE_ERR:
            UpdateCommandLine("FileReader error : File is not readable");
            break;

        case evt.target.error.ABORT_ERR:
            UpdateCommandLine("FileReader error : Abort error");
            break;  // noop

        default:
            UpdateCommandLine("FileReader error : Unknown error");
            break;
    };
}

function updateProgress(evt) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
        var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
        // Increase the progress bar length.
        if (percentLoaded < 100) {
        }
    }
}

// These two functions can be reimplemented in your app
// to show background work in progress.
function busy() {
    // Display busy...
	// You can implement this function to indicate background work in progress
	// or simply change the cursor.
}

function normal() {
  // Display normal...
  // You can implement this function to indicate background work completed
  // or simply change the cursor to default.
}