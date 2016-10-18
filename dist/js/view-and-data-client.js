///////////////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Philippe Leefsma 2014 - ADN/Developer Technical Services
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// Namespace declaration
//
///////////////////////////////////////////////////////////////////////////////
var Autodesk = Autodesk || {};
Autodesk.ADN = Autodesk.ADN || {};
Autodesk.ADN.Toolkit = Autodesk.ADN.Toolkit || {};
Autodesk.ADN.Toolkit.ViewAndData = Autodesk.ADN.Toolkit.ViewAndData || {};

///////////////////////////////////////////////////////////////////////////////
// Autodesk.ADN.Toolkit.ViewAndData.ViewAndDataClient
//
// Parameters:
//      baseUrl: url of view and data API service,
//               for production environment, it is 'https://developer.api.autodesk.com'
//      accessTokenOrUrl :  An url which returns the access token in JSON format,
//              for example: http://still-spire-1606.herokuapp.com/api/rawtoken,
//              it returns token  like :
//                  {"token_type":"Bearer",
//                   "expires_in":1799,
//                    "access_token":"nTeOdsiNRckNbiBF7lzdEZ3yjHRx"}
//      callback (Optional): A callback function where you can get the access token in JSON format
///////////////////////////////////////////////////////////////////////////////
Autodesk.ADN.Toolkit.ViewAndData.ViewAndDataClient = function (
  baseUrl,
  accessTokenOrUrl,
  callback) {

  ///////////////////////////////////////////////////////////////////////////
  // Private Members
  //
  ///////////////////////////////////////////////////////////////////////////
  var _acessTokenUrl = accessTokenOrUrl;

  var _accessTokenResponse = null;

  var _onInitialized = null;

  var _baseUrl = baseUrl;

  ///////////////////////////////////////////////////////////////////////////
  // Get error description from request status
  //
  ///////////////////////////////////////////////////////////////////////////
  function getErrorDescription(status) {

    switch (status) {

      case 200:
        return 'Success';

      case 400: //BAD REQUEST
        return "The request could not be understood by the server due " +
          "to malformed syntax or missing request headers. " +
          "The client SHOULD NOT repeat the request without modification.";

      case 401: //UNAUTHORIZED
        return "The supplied authorization header was not valid or " +
          "the supplied token scope was not acceptable. " +
          "Verify authentication and try again.";

      case 403: //FORBIDDEN
        return "The authorization was successfully validated but " +
          "permission is not granted.  Do not try again unless you " +
          "resolve permissions first.";

      case 404: //NOT FOUND
        return "Object does not exist.";

      case 409:
        return "Object already exists.";

      case 423: //THROTTLE
        return "Server is busy.  Please retry after some time.";

      case 500: //INTERNAL SERVER ERROR
        return "Internal failure while processing the request, " +
          "reason depends on error.";

      default:
        return "Unknown error."
    }
  }

  ///////////////////////////////////////////////////////////////////////////
  // Get access token from the server
  //
  ///////////////////////////////////////////////////////////////////////////
  var _requestTokenAsync = function (onSuccess, onError) {

    try {

      var xhr = new XMLHttpRequest();

      xhr.open("GET", _acessTokenUrl, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {

            try {

              var response = JSON.parse(xhr.responseText);

              onSuccess(response);
            }
            catch (ex) {

              _accessTokenResponse = "";
            }
          }
          else {

            onError({
              status: xhr.status,
              description: getErrorDescription(xhr.status),
              response: xhr.responseText
            });
          }
        }
      }

      xhr.send(null);
    }
    catch (ex) {

      onError(ex);
    }
  };

  _requestTokenAsync(function(response){

    var args = arguments.callee;

    setTimeout(function() {
      _requestTokenAsync(args);
    }, response.expires_in * 1000);

    _accessTokenResponse = response;

    if (callback){
      callback(response);
    }
    if(_onInitialized) {

      _onInitialized();

      _onInitialized = null;
    }

  }, function(error) {

    console.log('ViewAndDataClient error requesting token: '  + error)
  });

  this.onInitialized = function(callback) {

    if(_accessTokenResponse) {

      callback()
    }
    else {

      _onInitialized = callback;
    }
  }

  ///////////////////////////////////////////////////////////////////////////
  // Set the cookie (24 hours) upon server response
  // Subsequent http requests to this domain
  // will automatically send the cookie for authentication
  //
  ///////////////////////////////////////////////////////////////////////////
  this.setToken = function () {

    var token_payload ={
      'oauth2' : {
        'token' : _accessTokenResponse.access_token
      }
    };

    var xhr = new XMLHttpRequest();

    xhr.open('POST',
      _baseUrl + '/derivativeservice/v2/token',
      true);

    xhr.setRequestHeader(
        'Authorization',
        'Bearer ' + _accessTokenResponse.access_token);

    xhr.setRequestHeader(
      'Content-Type',
      'application/json');

    xhr.withCredentials = true;
    xhr.send(JSON.stringify(token_payload));
  };

  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Create bucket
  //
  // bucketCreationData = {
  //      bucketKey : "bucketKey",
  //      servicesAllowed: {},
  //      policyKey: "temporary/transient/persistent
  // }
  //
  // API:
  // POST /oss/{apiversion}/buckets
  //
  // Response:
  //
  // {
  // "bucketKey": "sampletestbucketdanieldu12345",
  // "bucketOwner": "mvMpJWBGyBuGpVycB77FFgP45T4dBycD",
  // "createdDate": 1435633089537,
  // "permissions": [
  // {
  // "authId": "mvMpJWBGyBuGpVycB77FFgP45T4dBycD",
  // "access": "full"
  // }
  // ],
  // "policyKey": "temporary"
  // }
  ///////////////////////////////////////////////////////////////////////////
  this.createBucketAsync = function (
    bucketCreationData,
    onSuccess,
    onError) {

    try {

      var xhr = new XMLHttpRequest();

      xhr.open('POST',
        _baseUrl + "/oss/v2/buckets",
        true);

      xhr.setRequestHeader(
        'Authorization',
        'Bearer ' + _accessTokenResponse.access_token);

      xhr.setRequestHeader(
        'Content-Type',
        'application/json');

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if(xhr.status == 200) {
            onSuccess(JSON.parse(xhr.responseText));
          }
          else {
            onError({
              status: xhr.status,
              description: getErrorDescription(xhr.status),
              response:JSON.parse(xhr.responseText)
            });
          }
        }
      }

      xhr.send(JSON.stringify(bucketCreationData));
    }
    catch (ex) {

      onError(ex);
    }
  };


  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Get all buckets
  //
  // API:
  // GET /oss/{apiversion}/buckets
  //
  // Response:
  //
  // {
  //   "items": [
  //   {
  //     "bucketKey": "dev_portal_test-10april2016-greg",
  //     "createDate": 1460297822493,
  //     "policyKey": "transient"
  //   },
  //   {
  //     "bucketKey": "dev_portal_test-10april2016-greg2",
  //     "createDate": 1460321084138,
  //     "policyKey": "temporary"
  //   },
  //     ...
  // ]
  // }
  ///////////////////////////////////////////////////////////////////////////
  this.getAllBucketsAsync = function(onSuccess, onError){
    try {

      var xhr = new XMLHttpRequest();

      xhr.open('GET',
          _baseUrl + "/oss/v2/buckets",
          true);

      xhr.setRequestHeader(
          'Authorization',
          'Bearer ' + _accessTokenResponse.access_token);

      xhr.setRequestHeader(
          'Content-Type',
          'application/json');

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if(xhr.status == 200) {
            onSuccess(JSON.parse(xhr.responseText));
          }
          else {
            onError({
              status: xhr.status,
              description: getErrorDescription(xhr.status),
              response:JSON.parse(xhr.responseText)
            });
          }
        }
      }

      xhr.send();
    }
    catch (ex) {

      onError(ex);
    }
  }

  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Get bucket details
  //
  // API:
  // GET /oss/{apiversion}/buckets/{bucketkey}/details
  //
  // Response:
  //
  // "{
  //      "key":"bucketKey",
  //      "owner":"tAp1fqjjtcgqS4CKpCYDjAyNbKW4IVCC",
  //      "createDate":1404984496468,
  //      "permissions":[{
  //          "serviceId":"tAp1fqjjtcgqS4CKpCYDjAyNbKW4IVCC",
  //          "access":"full"}],
  //      "policyKey":"persistent"
  //  }"
  ///////////////////////////////////////////////////////////////////////////
  this.getBucketDetailsAsync = function (
    bucketKey,
    onSuccess,
    onError) {

    try {

      var xhr = new XMLHttpRequest();

      xhr.open('GET',
        _baseUrl + "/oss/v1/buckets/" + bucketKey + "/details",
        true);

      xhr.setRequestHeader(
        'Authorization',
        'Bearer ' + _accessTokenResponse.access_token);

      xhr.setRequestHeader(
        'Content-Type',
        'application/json');

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            onSuccess(JSON.parse(xhr.responseText));
          }
          else {
            onError({
              status: xhr.status,
              description: getErrorDescription(xhr.status),
              response:JSON.parse(xhr.responseText)
            });
          }
        }
      }

      xhr.send();
    }
    catch (ex) {

      onError(ex);
    }
  };

  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Upload a file to bucket
  //
  // API:
  // PUT /oss/{apiversion}/buckets/{bucketkey}/objects/{objectkey}
  //
  // Response:
  //
  //v1
  // "{   "bucket-key" : "adn-10.07.2014-11.28.15",
  //      "file": file,
  //      "objects" : [ {
  //          "location" : "baseUrl/oss/v1/buckets/bucketKey/objects/file.name",
  //          "size" : 1493911,
  //          "key" : "file.name",
  //          "id" : "urn:adsk.objects:os.object:bucketKey/file.name",
  //          "sha-1" : "ba824b22a6df9d0fc30943ffcf8129e2b9de80f6",
  //          "content-type" : "application/stream"  } ]
  //  }"
  //
  //  v2
  //  {
  // "bucketKey": "sampletestbucketdanieldu12345",
  // "objectId": "urn:adsk.objects:os.object:sampletestbucketdanieldu12345/Drill.dwfx",
  // "objectKey": "Drill.dwfx",
  // "sha1": "28f3e01b0050fbc8a619b68b229947f18ebe94ee",
  // "size": 945973,
  // "contentType": "application/json",
  // "location": "https://developer.api.autodesk.com/oss/v2/buckets/sampletestbucketdanieldu12345/objects/Drill.dwfx"
  // }
  ///////////////////////////////////////////////////////////////////////////
  this.uploadFileAsync = function (
    file,
    bucketKey,
    objectKey,
    onSuccess,
    onError) {

    var xhr = new XMLHttpRequest();

    xhr.open('PUT',
      _baseUrl + '/oss/v2/buckets/' + bucketKey + '/objects/' + objectKey,
      true);

    xhr.setRequestHeader(
      'Authorization',
      'Bearer ' + _accessTokenResponse.access_token);

    xhr.setRequestHeader(
      'Content-Type',
      'application/stream');

    xhr.onload = function () {
      var response = JSON.parse(xhr.responseText);
      response.file = file;

      onSuccess(response);
    };

    var reader = new FileReader();

    reader.onerror = onError;
    reader.onabort = onError;

    reader.onloadend = function (event) {
      if (event.target.readyState == FileReader.DONE) {
        try {
          xhr.send(event.target.result);
        }
        catch (ex) {
          onError(ex);
        }
      }
      else {
        onError(event);
      }
    };

    var blob = file.slice(0, file.size);

    reader.readAsArrayBuffer(blob);
  };

  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Register an uploaded file
  //
  // API:
  // POST /derivativeservice/{apiversion}/registration
  //
  // Response:
  //
  // "{"Result":"Success"}"
  ///////////////////////////////////////////////////////////////////////////
  this.registerAsync = function (
    fileId,
    onSuccess,
    onError) {

    try {

      var xhr = new XMLHttpRequest();

      xhr.open('POST',
        _baseUrl + '/derivativeservice/v2/registration',
        true);

      xhr.setRequestHeader(
        'Authorization',
        'Bearer ' + _accessTokenResponse.access_token);

      xhr.setRequestHeader(
        'Content-Type',
        'application/json');

      //xhr.setRequestHeader(
      //  'x-ads-force',
      //  'true');

      var body = {
        design: this.toBase64(fileId)
      };

      xhr.onreadystatechange = function () {

        if (xhr.readyState == 4) {

          if(xhr.status == 200) {

            onSuccess(JSON.parse(xhr.responseText));
          }
          else {

            onError({
              status: xhr.status,
              description: getErrorDescription(xhr.status),
              response:JSON.parse(xhr.statusText)
            });
          }
        }
      }

      xhr.send(JSON.stringify(body));
    }
    catch (ex) {

      onError(ex);
    }
  };

  this.register = function (fileId) {

    var xhr = new XMLHttpRequest();

    xhr.open('POST',
      _baseUrl + '/derivativeservice/v2/registration',
      false);

    xhr.setRequestHeader(
      'Authorization',
      'Bearer ' + _accessTokenResponse.access_token);

    xhr.setRequestHeader(
      'Content-Type',
      'application/json');

    //xhr.setRequestHeader(
    //  'x-ads-force',
    //  'true');

    //xhr.onreadystatechange = ...;

    var body = {
      design: this.toBase64(fileId)
    };

    try {

      xhr.send(JSON.stringify(body));

      return JSON.parse(xhr.responseText);
    }
    catch (ex) {

      return ex;
    }
  };

  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Get model thumbnail
  //
  // API:
  // GET /derivativeservice/v2/thumbnails/{urn}?guid=$GUID$ & width=$WIDTH$ & height=$HEIGHT$
  // (& type=$TYPE$ & role=$ROLE$ & fileType=$FILETYPE$ & mimeType=$MIMETYPE$)
  //
  // Response:
  //
  //
  ///////////////////////////////////////////////////////////////////////////
  this.getThumbnailAsync = function (
    fileId,
    onSuccess,
    onError,
    width,
    height,
    guid) {

    try {

      var parameters =
        '?width=' + (width ? width : '150') +
        '&height=' + (height ? height : '150') +
        (guid ? '&guid=' + guid : '');

      var xhr = new XMLHttpRequest();

      xhr.open('GET',
        _baseUrl +
        "/derivativeservice/v2/thumbnails/" +
        this.toBase64(fileId),
        true);

      xhr.setRequestHeader(
        'Authorization',
        'Bearer ' + _accessTokenResponse.access_token);

      xhr.responseType = 'arraybuffer';

      xhr.onload = function (e) {

        if (this.status == 200) {

          //converts raw data to base64 img
          var base64 = btoa(String.fromCharCode.apply(
            null, new Uint8Array(this.response)));

          onSuccess(base64);
        }
        else {

          onError({
            status: xhr.status,
            description: getErrorDescription(xhr.status),
            response: ''
          });
        }
      };

      xhr.send();
    }
    catch (ex) {
      onError(ex);
    }
  };

  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Get model viewable
  //
  // API:
  // GET /derivativeservice/{apiversion}/manifest/{urn}?guid=$GUID$
  // GET /derivativeservice/{apiversion}/manifest/{urn}/status?guid=$GUID$
  // GET /derivativeservice/{apiversion}/manifest/{urn}/all?guid=$GUID$
  //
  // Response:
  //
  //{"guid":"dXJuOmFkc2sub...","type":"design","hasThumbnail":"true",
  //"progress":"complete","startedAt":"Mon Jun 23 11:28:18 UTC 2014",
  //"status":"success","success":"100%","urn":"dXJuOmFkc2sub...",
  //"children":[{"guid":"4cf5994a25ba","type":"folder","hasThumbnail":"true",
  //"name":"Trailer.dwf","progress":"complete","role":"viewable",
  //"status":"success","success":"100%","version":"2.0",
  //"children":[{"guid":"12EB52A2-7281-44D8-A704-02D8D4A2C69C_Sheets",
  //"type":"folder","hasThumbnail":"true","name":"Sheets",
  //"progress":"complete","status":"success","success":"100%",
  //"children":[{"guid":"com.autodesk.dwf.eModel","type":"geometry",
  //"hasThumbnail":"true","name":"Trailer.iam","order":0,"progress":"Complete",
  //"role":"3d","status":"Success","viewableID":"com.autodesk.dwf.eModel",
  //"properties":{"":{"Description":""},
  //"hidden":{"_InitialURI":"presentation=49c8fb97,d4121f60",
  //"_LabelIconResourceID":"12EB52A6"}},
  //"children":[{"guid":"d1fe2007","type":"view",
  //"camera":[5,-7,5,-0.1,-2,-5,-0.1,0.2,0.1,0.3,0.4,483.5,1],
  //"hasThumbnail":"false","name":"Home View","role":"3d"},{"guid":"45291936",
  //"type":"resource","hasThumbnail":"false",
  //"mime":"application/autodesk-svf","role":"graphics",
  //"urn":"urn:adsk.viewing:fs.file:sfsfsghs==/output/com.autodesk/0.svf"},
  //{"guid":"9a5c1bcb","type":"resource",
  //"mime":"application/autodesk-db",
  //"role":"Autodesk.CloudPlatform.PropertyDatabase",
  //"urn":"urn:...ssdd==/output/com.autodesk.dwf/section_properties.db"}]}]}]}]}
  //
  ///////////////////////////////////////////////////////////////////////////
  this.getViewableAsync = function (
    fileId,
    onSuccess,
    onError,
    option,
    guid) {

    try {

      var parameters = (guid ? '?guid=' + guid : '');

      var optionStr = "";

      switch (option) {

        case 'status':
          optionStr = "/status";
          break;

        case 'all':
          optionStr = "/all";
          break;

        default:
          break;
      }

      var xhr = new XMLHttpRequest();

      xhr.open('GET',
        _baseUrl +
        "/derivativeservice/v2/manifest/" +
        this.toBase64(fileId) +
        optionStr +
        parameters,
        true);

      xhr.setRequestHeader(
        'Authorization',
        'Bearer ' + _accessTokenResponse.access_token);

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            onSuccess(JSON.parse(xhr.responseText));
          }
          else {
            onError({
              status: xhr.status,
              description: getErrorDescription(xhr.status),
              response:JSON.parse(xhr.responseText)
            });
          }
        }
      }

      xhr.send();
    }
    catch (ex) {
      onError(ex);
    }
  };

  ///////////////////////////////////////////////////////////////////////////
  // Get subitems with properties
  //
  ///////////////////////////////////////////////////////////////////////////
  this.getSubItemsWithProperties = function (
    fileId,
    properties,
    onSuccess,
    onError) {

    function hasProperties(item, properties) {

      var hasProperties = true;

      for(var propName in properties) {

        if(!item.hasOwnProperty(propName)) {

          hasProperties = false;
          break;
        }

        if(item[propName] !== properties[propName]) {

          hasProperties = false;
          break;
        }
      }

      return hasProperties;
    }

    function getSubItemsWithPropertiesRec(
      viewable, properties) {

      var items = [];

      if(hasProperties(viewable, properties)) {

        items.push(viewable);
      }

      if (typeof viewable.children !== 'undefined') {

        for (var i=0; i<viewable.children.length; ++i) {

          var subItems = getSubItemsWithPropertiesRec(
            viewable.children[i], properties);

          items = items.concat(subItems);
        }
      }

      return items;
    }

    this.getViewableAsync (
      fileId,
      function(viewable) {

        var items = getSubItemsWithPropertiesRec(
          viewable,
          properties);

        onSuccess(items);
      },
      onError,
      'all');
  };

  ///////////////////////////////////////////////////////////////////////////
  // Utilities
  //
  ///////////////////////////////////////////////////////////////////////////
  this.toBase64 = function (str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  };

  this.fromBase64 = function (str) {
    return decodeURIComponent(escape(window.atob(str)));
  };
}
