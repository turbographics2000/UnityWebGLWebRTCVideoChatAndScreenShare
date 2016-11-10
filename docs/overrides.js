var screenShareExtensionId = '';
var screenStreamId = null;
// // Old API
// MediaStreamTrack.orgGetSources = MediaStreamTrack.getSources;
// MediaStreamTrack.getSources = func => {
//     console.log('call MediaStreamTrack.orgGetSources');
//     MediaStreamTrack.orgGetSources(devices => {
//         console.log('videos', devices.filter(device => device.kind === 'video'));
//         console.log('audios', devices.filter(device => device.kind === 'audio'));
//         chrome.runtime.sendMessage(screenShareExtensionId, 'getScreenStreamId', streamId => {
//             screenStreamId = streamId;
//             var screenSourceInfo = {
//                 facing: '',
//                 id: streamId,
//                 kind: 'video',
//                 label: 'Screen_Capture_oldapi'
//             }
//             devices.push(screenSourceInfo);
//             func(devices);
//         });
//     });
// }
// navigator.orgGetUserMedia = navigator.getUserMedia;
// navigator.getUserMedia = constraints => {
//     console.log('call navigator.getUserMedia');
//     navigator.getUserMedia(constraints, )
// };
// navigator.orgWebkitGetUserMedia = navigator.webkitGetUserMedia;
// navigator.webkitGetUserMedia = constraints => {
//     console.log('call navigator.webkitGetUserMedia');
    
// };
// navigator.orgMozGetUserMedia = navigator.mozGetUserMedia;
// navigator.mozGetUserMedia = constraints => {
//     console.log('call navigator.mozGetUserMedia');

// };

// // Newest API
// navigator.mediaDevices.orgEnumerateDevices = navigator.mediaDevices.enumerateDevices;
// navigator.mediaDevices.enumerateDevices = _ => {
//     console.log('call navigator.mediaDevices.enumerateDevices');
//     return new Promise((resolve, reject) => {
//         navigator.mediaDevices.orgEnumerateDevices.then(devices => {
//             console.log('videoinputs', devices.filter(device => device.kind === 'videoinput'));
//             console.log('audioinputs', devices.filter(device => device.kind === 'audioinput'));
//             chrome.runtime.sendMessage(screenShareExtensionId, 'getScreenStreamId', streamId => {
//                 screenStreamId = streamId;
//                 var screenDeviceInfo = {
//                     deviceId: screenStreamId,
//                     groupId: null,
//                     kind: 'videoinput',
//                     label: 'Screen_Capture_newapi'
//                 };
//                 devices.push(screenDeviceInfo);
//                 resolve(devices);
//             });
//         }, reject);
//     });
// }
// navigator.mediaDevices.orgGetUserMedia = navigator.mediaDevices.getUserMedia;
// navigator.mediaDevices.getUserMedia = constraints => {
//     console.log('call navigator.mediaDevices.getUserMedia');
//     console.log(constraints);
//     return navigator.mediaDevices.orgGetUserMedia(constraints);
//     // return new Promise((resolve, reject) => {
//     //     resolve()
//     // });
// };

// Module["preRun"].push((function(){
//     var unityFileSystemInit = Module["unityFileSystemInit"]||(function(){
//         if(!Module.indexedDB){
//             console.log("IndexedDB is not available. Data will not persist in cache and PlayerPrefs will not be saved.")
        
//         }
//         FS.mkdir("/idbfs");
//         FS.mount(IDBFS,{},"/idbfs");
//         Module.addRunDependency("JS_FileSystem_Mount");
//         FS.syncfs(true,(function(err){
//             Module.removeRunDependency("JS_FileSystem_Mount")
//         }))
//     });
//     unityFileSystemInit()
// }));
// var MediaDevices = [];
// Module["preRun"].push((function(){
//     var enumerateMediaDevices = (function(){
//         var getMedia = navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia;
//         if(!getMedia){
//             return
//         }
//         function addDevice(label){
//             label = label?label: "device #"+MediaDevices.length;
//             var device = {
//                 deviceName: label,
//                 refCount: 0,
//                 video: null
//             };
//             MediaDevices.push(device)
//         }
//         if(typeof MediaStreamTrack == "undefined"||typeof MediaStreamTrack.getSources == "undefined"){
//             if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices){
//                 console.log("Media Devices cannot be enumerated on this browser.");
//                 return
//             }
//             navigator.mediaDevices.enumerateDevices()
//                 .then((function(devices){
//                     devices.forEach((function(device){
//                         if(device.kind == "videoinput"){
//                             addDevice(device.label)
//                         }
//                     }))
//                 }))
//                 .catch((function(err){
//                     console.log(err.name+":  "+error.message)
//                 }))
//         }else{
//             function gotSources(sourceInfos){
//                 for(var i = 0;i!==sourceInfos.length;++i){
//                     var sourceInfo = sourceInfos[i];
//                     if(sourceInfo.kind==="video"){
//                         addDevice(sourceInfo.label)
//                     }
//                 }
//             }
//             MediaStreamTrack.getSources(gotSources)
//         }
//     });
//     enumerateMediaDevices()
// }));

var consoleLog = false; 
function override_enumerateMediaDevices() {
    if(!navigator.mediaDevices) return;
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            devices.forEach(device => {
                if(device.kind === 'videoinput'){
                    MediaDevices.push({
                        deviceName: device.label ? device.label : 'device #' + MediaDevices.length,
                        refCount: 0,
                        deviceId: device.deviceId,
                        video: null
                    });
                }
            });
            chrome.runtime.sendMessage('hnbcannpblldhckchhopjgoicginlkfj', 'getScreenStreamId', streamId => {
                if(!streamId) return;
                MediaDevices.push({
                    deviceName: 'screen',
                    refCount: 0,
                    deviceId: streamId,
                    video: null
                });
            });
        })
        .catch(function(err){
            console.log(err.name + ':  ' + error.message);
        });
}

function override_JS_WebCamVideo_GetNativeWidth(deviceIndex) {
    consoleLog && console.log('_JS_WebCamVideo_GetNativeWidth', deviceIndex);
    return MediaDevices[deviceIndex].video ? MediaDevices[deviceIndex].video.videoWidth : 0;
}

function override_JS_WebCamVideo_GetNativeHeight(deviceIndex) {
    consoleLog && console.log('_JS_WebCamVideo_GetNativeWidth', deviceIndex);
    return MediaDevices[deviceIndex].video ? MediaDevices[deviceIndex].video.videoHeight : 0;
}

function override_JS_WebCamVideo_GrabFrame(deviceIndex, buffer, destWidth, destHeight) {
    consoleLog && console.log('_JS_WebCamVideo_GrabFrame', deviceIndex, buffer, destWidth, destHeight);
    if(!MediaDevices[deviceIndex].video) {
        console.error('WebCam not initialized.');
        return;
    }
    var context = webcam.canvas.getContext('2d');
    if(context) {
        canvas.width = destWidth;
        canvas.height = destHeight;
        var video = MediaDevices[deviceIndex].video;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, destWidth, destHeight);
        var imageData = context.getImageData(0, 0, destWidth, destHeight);
        writeArrayToMemory(imageData.data, buffer);
    } else {
        console.log('2d Context is null');
    }
}

function override_JS_WebCamVideo_CanPlay(deviceIndex) {
    consoleLog && console.log('_JS_WebCamVideo_CanPlay', deviceIndex);
    return MediaDevices[deviceIndex].video && MediaDevices[deviceIndex].video.videoWidth > 0 && MediaDevices[deviceIndex].video.videoHeight > 0;
}

function override_JS_WebCamVideo_GetNumDevices() {
    consoleLog && console.log('_JS_WebCamVideo_GetNumDevices');
    return MediaDevices.length;
}

function override_JS_WebCamVideo_GetDeviceName(deviceIndex, buffer) {
    consoleLog && console.log('_JS_WebCamVideo_GetDeviceName', deviceIndex, buffer);
    if(buffer) writeStringToMemory(MediaDevices[deviceIndex].deviceName, buffer, false);
    return MediaDevices[deviceIndex].length;
}

function override_JS_WebCam_IsSupported() {
    consoleLog && console.log('_JS_WebCam_IsSupported');
    return !!navigator.mediaDevices.getUserMedia;
}

function override_JS_WebCamVideo_Stop(deviceIndex) {
    consoleLog && console.log('_JS_WebCamVideo_Stop', deviceIndex);
    if(!MediaDevices[deviceIndex].video) {
        console.error('WebCam not initialized.');
        return;
    }
    if(--MediaDevices[deviceIndex].refCount === 0) {
        var stream = MediaDevices[deviceIndex].video.srcObject;
        var streamTracks = stream.getTracks();
        for(var streamTrack of streamTracks) {
            streamTrack.stop();
        }
        MediaDevices[deviceIndex].video.srcObject = null;
        webcam.canvas.removeChild(MediaDevices[deviceIndex].video);
        MediaDevices[deviceIndex].video = null;
    }
}

function override_JS_WebCamVideo_Start(deviceIndex) {
    consoleLog && console.log('_JS_WebCamVideo_Start', deviceIndex);
    if(MediaDevices[deviceIndex].video) {
        MediaDevices[deviceIndex].refCount++;
        return;
    }
    if(!navigator.mediaDevices.getUserMedia) {
        console.log('WebCam is not supported. Try a different browser.');
        return;
    }
    if(!webcam.canvas) {
        canvas = document.createElement('canvas');
        canvas.style.display = 'none';
        var context2d = canvas.getContext('2d');
        if(!context2d){
            console.log('context2d is null');
            return;
        }
        //document.body.appendChild(canvas);
        webcam.canvas = canvas;
    }
    var video = document.createElement('video');
    var constraints = null;
    if(MediaDevices[deviceIndex].label === 'screen') {
        constraints = {
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: MediaDevices[deviceIndex].deviceId,
                    maxWidth: 1280,
                    maxHeight: 1280
                }
            },
            audio: false
        };
    } else {
        constraints = {
            video: {
                deviceId: MediaDevices[deviceIndex].deviceId
            }, 
            audio: false
        };
    }
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
            webcam.canvas.appendChild(video);
            video.play();
            MediaDevices[deviceIndex].video = video;
            MediaDevices[deviceIndex].refCount++;
        })
        .catch(err => {
            console.log('An error occured! ' + err);
        });
}


Array.prototype.push = (function(){
    var original = Array.prototype.push;
    return function() {
        for(var i = 0; i < arguments.length; i++) {
            if(typeof arguments[i] === 'function' && arguments[i].toString().includes('addDevice')) {
                arguments[i] = override_enumerateMediaDevices;
            }
        }
        return original.apply(this, arguments);
    };
})();

Object.defineProperties(Module, {
    _asmLibraryArg: {
        value: true,
        writable: true
    }
});

Object.defineProperty(Module, 'asmLibraryArg', {
    get: function () {
        return this._asmLibraryArg;
    },
    set: function(val) {
        val._JS_WebCamVideo_GetNativeWidth = override_JS_WebCamVideo_GetNativeWidth;
        val._JS_WebCamVideo_GetNativeHeight = override_JS_WebCamVideo_GetNativeHeight;
        val._JS_WebCamVideo_GrabFrame = override_JS_WebCamVideo_GrabFrame;
        val._JS_WebCamVideo_CanPlay = override_JS_WebCamVideo_CanPlay;
        val._JS_WebCamVideo_GetNumDevices = override_JS_WebCamVideo_GetNumDevices;
        val._JS_WebCamVideo_GetDeviceName = override_JS_WebCamVideo_GetDeviceName;
        val._JS_WebCam_IsSupported = override_JS_WebCam_IsSupported;
        val._JS_WebCamVideo_Stop = override_JS_WebCamVideo_Stop;
        val._JS_WebCamVideo_Start = override_JS_WebCamVideo_Start;
        this._asmLibraryArg = val;
    }
});
