var screenShareExtensionId = '';
var screenStreamId = null;
// Old API
MediaStreamTrack.orgGetSources = MediaStreamTrack.getSources;
MediaStreamTrack.getSources = func => {
    console.log('call MediaStreamTrack.orgGetSources');
    MediaStreamTrack.orgGetSources(devices => {
        console.log('videos', devices.filter(device => device.kind === 'video'));
        console.log('audios', devices.filter(device => device.kind === 'audio'));
        chrome.runtime.sendMessage(screenShareExtensionId, 'getScreenStreamId', streamId => {
            screenStreamId = streamId;
            var screenSourceInfo = {
                facing: '',
                id: streamId,
                kind: 'video',
                label: 'Screen_Capture_oldapi'
            }
            devices.push(screenSourceInfo);
            func(devices);
        });
    });
}


// Newest API
navigator.mediaDevices.orgEnumerateDevices = navigator.mediaDevices.enumerateDevices;
navigator.mediaDevices.enumerateDevices = _ => {
    console.log('call navigator.mediaDevices.enumerateDevices');
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.orgEnumerateDevices.then(devices => {
            console.log('videoinputs', devices.filter(device => device.kind === 'videoinput'));
            console.log('audioinputs', devices.filter(device => device.kind === 'audioinput'));
            chrome.runtime.sendMessage(screenShareExtensionId, 'getScreenStreamId', streamId => {
                screenStreamId = streamId;
                var screenDeviceInfo = {
                    deviceId: screenStreamId,
                    groupId: null,
                    kind: 'videoinput',
                    label: 'Screen_Capture_newapi'
                };
                devices.push(screenDeviceInfo);
                resolve(devices);
            });
        }, reject);
    });
}
navigator.mediaDevices.orgGetUserMedia = navigator.mediaDevices.getUserMedia;
navigator.mediaDevices.getUserMedia = constraints => {
    console.log(constraints);
    return navigator.mediaDevices.orgGetUserMedia(constraints);
    // return new Promise((resolve, reject) => {
    //     resolve()
    // });
};
