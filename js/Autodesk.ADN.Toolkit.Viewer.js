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
AutodeskNamespace("Autodesk.ADN.Toolkit.Viewer");

///////////////////////////////////////////////////////////////////////////////
// Autodesk.ADN.Toolkit.Viewer.AdnViewerManager
//
///////////////////////////////////////////////////////////////////////////////
Autodesk.ADN.Toolkit.Viewer.AdnViewerManager = function (
    tokenOrUrl,
    viewerContainer,
    enviroment) {


    if (!enviroment) {
        enviroment = 'AutodeskProduction';
    };
    ///////////////////////////////////////////////////////////////////////////
    // Check if string is a valid url
    //
    ///////////////////////////////////////////////////////////////////////////
    var _validateURL = function(str) {

        return(str.indexOf('http:') > -1 || str.indexOf('https:') > -1);
    }

    var _newGuid = function () {

        var d = new Date().getTime();

        var guid = 'xxxx-xxxx-xxxx-xxxx-xxxx'.replace(
            /[xy]/g,
            function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
            });

        return guid;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Private Members
    //
    ///////////////////////////////////////////////////////////////////////////
    var _viewerDivId = _newGuid();

    var _viewerContainer = viewerContainer;

    var _viewer = null;

    var _self = this;

    //Motion intervals

    var _explodeMotion = null;

    var _rotateMotion = null;

    ///////////////////////////////////////////////////////////////////////////
    // Returns adsk viewer
    // Do not use this, use onViewerInitialized callback instead
    ///////////////////////////////////////////////////////////////////////////
    this.getViewer = function () {

        return _viewer;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Initialize Viewer and load document
    //
    ///////////////////////////////////////////////////////////////////////////
    this.loadDocument = function (urn, onViewerInitialized, onError) {

        var options = {
            //env: "AutodeskProduction"
            //env: "AutodeskStaging"
            env: enviroment
        };

        // initialized with getToken callback
        if (_validateURL(tokenOrUrl)) {

            var getToken =  function() {

                var xhr = new XMLHttpRequest();

                xhr.open("GET", tokenOrUrl, false);
                xhr.send(null);

                return xhr.responseText;
            }

            options.getAccessToken = getToken;
            options.refreshToken = getToken;
        }

        // initialized with access token
        else {

            options.accessToken = tokenOrUrl;
        }

        var viewerElement = _createViewerElement(_viewerContainer);

        Autodesk.Viewing.Initializer(options, function () {

            _getViewablePath(
                urn, null, function (path, role) {

                    if (!path ) {

                        // error loading document
                        if(onError)
                            onError(role);

                        return;
                    }

                    if (_viewer) {

                        _viewer.finish();
                    }

                    if (role === '3d' || role === '2d') {

                        _viewer = new Autodesk.Viewing.Private.GuiViewer3D(
                            //_viewer = new Autodesk.Viewing.Viewer3D(
                            viewerElement);

                        _viewer.start();

                        _viewer.setProgressiveRendering(true);

                        _viewer.setQualityLevel(true, true);

                        _viewer.impl.setLightPreset(8);

                        _viewer.setBackgroundColor(3,4,5, 250, 250, 250);
                    }

                    else {

                        //error
                        return;
                    }

                    _viewer.addEventListener(

                        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,

                        function(event) {
                            _viewer.fitToView(false);
                        });

                    if (onViewerInitialized)
                        onViewerInitialized(_viewer);

                    _viewer.load(path);
                });
        });

        //fit view on escape
        $(document).keyup(function (e) {
            // esc
            if (e.keyCode == 27) {
                _viewer.fitToView(false);
            }
        });
    };

    ///////////////////////////////////////////////////////////////////////////
    // Close current document if any
    //
    ///////////////////////////////////////////////////////////////////////////
    this.closeDocument = function () {

        var viewerDiv = document.getElementById(_viewerDivId);

        if (viewerDiv) {

            viewerDiv.parentNode.removeChild(viewerDiv);
        }

        _viewer = null;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Creates new viewer div element
    //
    ///////////////////////////////////////////////////////////////////////////
    var _createViewerElement = function (viewerContainer) {

        var viewerDiv = document.getElementById(
            _viewerDivId);

        if (viewerDiv) {

            viewerDiv.parentNode.removeChild(
                viewerDiv);
        }

        viewerDiv = document.createElement("div");

        viewerDiv.id = _viewerDivId;

        viewerDiv.style.height = "100%";

        viewerContainer.appendChild(viewerDiv);

        // disable default context menu on viewer div 
        $('#' + _viewerDivId).on('contextmenu',
            function (e) {
                e.preventDefault();
            });

        // disable scrolling on DOM document 
        // while mouse pointer is over viewer area
        $('#' + _viewerDivId).hover(
            function () {
                var x = window.scrollX;
                var y = window.scrollY;
                window.onscroll = function () {
                    window.scrollTo(x, y);
                };
            },
            function () {
                window.onscroll = null;
            }
        );

        return viewerDiv;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Get 2d or 3d viewable path
    //
    ///////////////////////////////////////////////////////////////////////////
    var _getViewablePath = function (documentId, initialItemId, callback) {

        if (documentId.indexOf('urn:') !== 0)
            documentId = 'urn:' + documentId;

        Autodesk.Viewing.Document.load(
            documentId,
            function (document) {

                var items = [];

                if (initialItemId) {
                    items = Autodesk.Viewing.Document.getSubItemsWithProperties(
                        document.getRootItem(),
                        { 'guid': initialItemId },
                        true);
                }

                if (items.length == 0) {

                    items = Autodesk.Viewing.Document.getSubItemsWithProperties(
                        document.getRootItem(),
                        { 'type': 'geometry', 'role': '2d' },
                        true);

                    if (items.length > 0) {

                        var path2d = document.getViewablePath(items[0]);

                        callback(path2d, '2d');
                        return;
                    }
                }

                if (items.length == 0) {

                    items = Autodesk.Viewing.Document.getSubItemsWithProperties(
                        document.getRootItem(),
                        { 'type': 'geometry', 'role': '3d' },
                        true);

                    if (items.length > 0) {

                        var path3d = document.getViewablePath(items[0]);

                        callback(path3d, '3d');
                        return;
                    }
                }
            },
            function (error) {
                console.log("Error loading document: " + error)
                callback(null, error);
            }
        );
    };
}

