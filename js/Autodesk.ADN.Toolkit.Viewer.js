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
Autodesk.ADN.Toolkit.Viewer = Autodesk.ADN.Toolkit.Viewer || {};

///////////////////////////////////////////////////////////////////////////////
// Autodesk.ADN.Toolkit.Viewer.AdnViewerManager
//
///////////////////////////////////////////////////////////////////////////////
Autodesk.ADN.Toolkit.Viewer.AdnViewerManager = function (
    tokenOrUrl,
    viewerContainer) {

    ///////////////////////////////////////////////////////////////////////////
    // Generate GUID
    //
    ///////////////////////////////////////////////////////////////////////////
    var _newGUID = function () {

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
    // Check if string is a valid url
    //
    ///////////////////////////////////////////////////////////////////////////
    var _validateURL = function(str) {

        return(str.indexOf('http:') > -1 || str.indexOf('https:') > -1);
    }

    ///////////////////////////////////////////////////////////////////////////
    // Private Members
    //
    ///////////////////////////////////////////////////////////////////////////
    var _viewerContainer = viewerContainer;

    var _overlayDivId = _newGUID();

    var _viewerDivId = _newGUID();

    var _onGeometryLoadedCbs = [];

    var _overlay = null;

    var _viewer = null;

    var _self = this;

    //Motion intervals

    var _explodeMotion = null;

    var _rotateMotion = null;

    var _extensions = [];

    ///////////////////////////////////////////////////////////////////////////
    // Returns adsk viewer
    //
    ///////////////////////////////////////////////////////////////////////////
    this.getViewer = function () {
        return _viewer;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Returns viewer div id
    //
    ///////////////////////////////////////////////////////////////////////////
    this.getViewerDivId = function () {
        return _viewerDivId;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Adds an extension
    //
    ///////////////////////////////////////////////////////////////////////////
    this.addExtension = function (extension) {

        _extensions.push(extension);
    };

    ///////////////////////////////////////////////////////////////////////////
    // Initialize Viewer and load document
    //
    ///////////////////////////////////////////////////////////////////////////
    this.loadDocument = function (urn, onViewerInitialized, onError) {

        var options = {
            env: "AutodeskProduction"
            //env: "AutodeskStaging"
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

                        _viewer.uninitialize();
                    }

                    if (role === '3d') {

                        _viewer = new Autodesk.Viewing.Private.GuiViewer3D(
                            //_viewer = new Autodesk.Viewing.Viewer3D(
                            viewerElement, { extensions: _extensions });

                        _viewer.start();

                        _viewer.setProgressiveRendering(true);

                        _viewer.setQualityLevel(true, true);

                        _viewer.impl.setLightPreset(8);
                    }

                    else if (role === '2d'){

                        _viewer = new Autodesk.Viewing.Private.GuiViewer2D(
                            viewerElement, { extensions: _extensions });

                        _viewer.start();
                    }

                    else {

                        //error
                        return;
                    }

                    _viewer.addEventListener(
                        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
                        _onGeometryLoaded);

                    if (onViewerInitialized)
                        onViewerInitialized(_viewer);

                    _viewer.load(path);

                    _overlay = _createOverlay(viewerElement);
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
    // Register for geometry loaded callback
    //
    ///////////////////////////////////////////////////////////////////////////
    this.registerForGeometryLoaded = function (callback) {

        _onGeometryLoadedCbs.push(callback);

    };

    ///////////////////////////////////////////////////////////////////////////
    // Get current view
    //
    ///////////////////////////////////////////////////////////////////////////
    this.getCurrentView = function (viewname) {

        var view = {

            id: _newGUID(),
            name: viewname,

            position: _viewer.navigation.getPosition(),
            target: _viewer.navigation.getTarget(),
            fov: _viewer.getFOV(),
            up: _viewer.navigation.getCameraUpVector()
        };

        return view;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Set view 
    //
    ///////////////////////////////////////////////////////////////////////////
    this.setView = function (view) {

        _viewer.navigation.setRequestTransitionWithUp(
            true,

            new THREE.Vector3(
                view.position.x,
                view.position.y,
                view.position.z),

            new THREE.Vector3(
                view.target.x,
                view.target.y,
                view.target.z),

            view.fov,

            new THREE.Vector3(
                view.up.x,
                view.up.y,
                view.up.z));

        _viewer.resize();
    };

    ///////////////////////////////////////////////////////////////////////////
    // Set view from current to argument with 
    // smooth transition in 'duration' milliseconds
    //
    ///////////////////////////////////////////////////////////////////////////
    this.setViewWithTransition = function (
        view,
        duration,
        onFinish) {
        var currentView = _self.getCurrentView('current');

        var startTime = new Date().getTime();

        var timer = setInterval(function () {
            var dt = (new Date().getTime() - startTime) / duration;

            if (dt >= 1.0) {

                clearInterval(timer);
                _self.setView(view);

                if (onFinish)
                    onFinish();

                return;
            }

            var tmpView = {
                position: _cosVectorInterpolation(
                    currentView.position, view.position, dt),

                target: _cosVectorInterpolation(
                    currentView.target, view.target, dt),

                fov: view.fov
            };

            _self.setView(tmpView);

        }, 100);
    };

    // interpolation function for scalar
    var _cosScalarInterpolation = function (s1, s2, f) {

        var tmp = (1.0 - Math.cos(f * Math.PI)) / 2.0;

        return (s1 * (1 - tmp) + s2 * tmp);
    };

    // interpolation function for THREE.Vector3
    var _cosVectorInterpolation = function (v1, v2, f) {

        var v = new THREE.Vector3(

            _cosScalarInterpolation(v1.x, v2.x, f),
            _cosScalarInterpolation(v1.y, v2.y, f),
            _cosScalarInterpolation(v1.z, v2.z, f));

        return v;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Get Property Value
    //
    ///////////////////////////////////////////////////////////////////////////
    this.getPropertyValue = function (dbId, displayName, callback) {

        function _cb(result) {

            if (result.properties) {

                for (var i = 0; i < result.properties.length; i++) {

                    var prop = result.properties[i];

                    if (prop.displayName === displayName) {

                        callback(prop.displayValue);
                        return;
                    }
                }

                callback('undefined');
            }
        }

        _viewer.getProperties(dbId, _cb);
    };

    ///////////////////////////////////////////////////////////////////////////
    // Get all leaf components
    //
    ///////////////////////////////////////////////////////////////////////////
    this.getAllLeafComponents = function (callback) {

        function getLeafComponentsRec(parent) {

            var components = [];

            if (typeof parent.children !== "undefined") {

                var children = parent.children;

                for (var i = 0; i < children.length; i++) {

                    var child = children[i];

                    if (typeof child.children !== "undefined") {

                        var subComps = getLeafComponentsRec(child);

                        components.push.apply(components, subComps);
                    }
                    else {
                        components.push(child);
                    }
                }
            }

            return components;
        }

        _viewer.getObjectTree(function (result) {

            var allLeafComponents = getLeafComponentsRec(result);

            callback(allLeafComponents);
        });
    };

    ///////////////////////////////////////////////////////////////////////////
    // callback(table)
    //
    ///////////////////////////////////////////////////////////////////////////
    this.onDisplayPropertiesTable = function (callback) {

        var maxRetry = 50; //5 sec timeout

        var interval = setInterval(function () {

            var table = document.getElementById(
                "propertygrid");

            if(table) {

                if (table.rows.length !== 0) {

                    clearInterval(interval);

                    callback(table);
                }
                else if ((--maxRetry) === 0) {
                    clearInterval(interval);
                }
            }
        }, 100);
    }

    ///////////////////////////////////////////////////////////////////////////
    // Insert properties in viewer properties dialog
    //
    //  var properties = [
    //    {
    //        index: 0, 
    //        displayName: 'Name 1',
    //        displayValue: 'Top property'
    //    },
    //    {
    //        displayName: 'Name 2',
    //        displayValue: 'Bottom property'
    //    }
    //  ];
    //
    ///////////////////////////////////////////////////////////////////////////
    this.insertProperties = function(properties, table) {

        for (var i = 0; i < properties.length; ++i) {

            var property = properties[i];

            if (typeof property.displayName != 'undefined' &&
                typeof property.displayValue != 'undefined') {

                var idx = table.rows.length;

                if (typeof property.index != 'undefined' &&
                    property.index > -1 &&
                    property.index < table.rows.length) {

                    idx = property.index;
                }

                var row = table.insertRow(idx);

                var name = row.insertCell(0);
                var value = row.insertCell(1);

                name.innerHTML =
                    property.displayName;

                value.innerHTML =
                    property.displayValue;
            }
        }
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
    //
    //
    ///////////////////////////////////////////////////////////////////////////
    this.startExplodeMotion = function (speed, min, max) {

        this.stopExplodeMotion();

        var explode = min;

        var watch = new Stopwatch();

        _explodeMotion = setInterval(function () {

            explode += speed * 0.001 * watch.getElapsedMs();

            if(explode > max) {

                explode = max;
                speed = -speed;
            }

            else if (explode < min) {

                explode = min;
                speed = -speed;
            }

            _viewer.explode(explode);

        }, 100);
    }

    this.stopExplodeMotion = function () {

        if(_explodeMotion) {

            clearInterval(_explodeMotion);
            _explodeMotion = null;
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    //
    //
    ///////////////////////////////////////////////////////////////////////////
    this.startRotateMotion = function (speed, axis) {

        this.stopRotateMotion();

        var watch = new Stopwatch();

        _rotateMotion = setInterval(function () {

            var view = _self.getCurrentView('animate');

            var position = new THREE.Vector3(
                view.position.x,
                view.position.y,
                view.position.z
            );

            var rAxis = new THREE.Vector3(
                axis.x, axis.y, axis.z
            );

            var matrix = new THREE.Matrix4().makeRotationAxis(
                rAxis,
                    speed * 0.001 * watch.getElapsedMs());

            position.applyMatrix4(matrix);

            _viewer.navigation.setPosition(position);

        }, 100);
    }

    this.stopRotateMotion = function () {

        if(_rotateMotion){

            clearInterval(_rotateMotion);
            _rotateMotion = null;
        }
    }

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

    ///////////////////////////////////////////////////////////////////////////
    // Geometry Loaded event
    //
    ///////////////////////////////////////////////////////////////////////////
    var _onGeometryLoaded = function (event) {

        _viewer.removeEventListener(
            Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
            _onGeometryLoaded);

        _viewer.fitToView(false);

        _onGeometryLoadedCbs.forEach(
            function (callback) {
                callback(_viewer);
            });
    };

    ///////////////////////////////////////////////////////////////////////////
    // Create overlay div for 2d graphics
    //
    ///////////////////////////////////////////////////////////////////////////
    var _createOverlay = function (parent) {

        if (typeof Raphael === 'undefined') {
            return null;
        }

        var overlayDiv = document.createElement("div");

        overlayDiv.id = _overlayDivId;

        parent.appendChild(overlayDiv);

        overlayDiv.style.top = "0";
        overlayDiv.style.left = "0";
        overlayDiv.style.right = "0";
        overlayDiv.style.bottom = "0";
        overlayDiv.style.zIndex = "1";
        overlayDiv.style.position = "absolute";
        overlayDiv.style.pointerEvents = "none";

        var overlay = new Raphael(
            overlayDiv,
            overlayDiv.clientWidth,
            overlayDiv.clientHeight);

        return overlay;
    }

    this.startAnnotate = function () {

        var circle = _overlay.circle(
            0, 0, 5.0);

        function getPosition(element) {

            var x = 0;
            var y = 0;

            while (element) {

                x += element.offsetLeft -
                    element.scrollLeft +
                    element.clientLeft;

                y += element.offsetTop -
                    element.scrollTop +
                    element.clientTop;

                element = element.offsetParent;
            }

            return { x: x, y: y };
        }

        var click = function(e) {

            var parentPos = getPosition(e.currentTarget);

            var x = e.clientX - parentPos.x;
            var y = e.clientY - parentPos.y;

            circle.attr({
                cx: x,
                cy: y
            })
        }

        $("#" + _viewerDivId).bind( "click", click);
    }
}

function Stopwatch() {

    var _startTime = new Date().getTime();

    this.start = function (){

        _startTime = new Date().getTime();
    };

    this.getElapsedMs = function(){

        var elapsedMs = new Date().getTime() - _startTime;

        _startTime = new Date().getTime();

        return elapsedMs;
    }
}