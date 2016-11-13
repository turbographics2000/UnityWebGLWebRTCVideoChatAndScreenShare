let signalingChannels = {};
const configuration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };
let pcs = {};
let dcs = {};
let localStreams = null;
let senders = null;
let myId = null;

window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;

function webrtcStart(remoteId) {
    //signalingChannels[remoteId] = signalingChannels[remoteId] || {};
    //let signalingChannel = signalingChannels[remoteId] = new BroadcastChannel('unitywebrtc-' + [myId, remoteId].sort().join('-'));
    let signalingChannel = new BroadcastChannel('unitywebrtc');

    let pc = new RTCPeerConnection(configuration);
    pc.remoteId = remoteId;
    pcs[remoteId] = pc;
    pc.oniceconnectionstatechange = evt => {
        console.log('oniceconnectionstatechange', evt);
    };
    pc.onicecandidate = evt => {
        if(evt.candidate)
            //signalingChannel.postMessage(JSON.stringify({candidate: evt.candidate, remoteId: myId}));
            signalingChannel.postMessage(JSON.stringify({candidate: evt.candidate}));
    }
    pc.onnegotiationneeded = _ => {
        console.log('onnegotiationneeded');
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            //.then(_ => signalingChannel.postMessage(JSON.stringify({desc: pc.localDescription, remoteId: myId})))
            .then(_ => signalingChannel.postMessage(JSON.stringify({desc: pc.localDescription})))
            .catch(error => {
                console.log(error.name + ": " + error.message);
            });
    };
    pc.oniceconnectionstatechange = function(evt) {
        if(pc.iceConnectionState === 'closed') {
            delete pcs[this.remoteId];
        }
    }

    if('ontrack' in pc) {
        pc.ontrack = function(evt) {
            const remoteIndex = remotes.indexOf(this.remoteId);
            if(evt.track.kind === 'video') {
                MediaDevices[remoteIndex] = evt.streams[remoteIndex];
                SendMessage('userManager', 'attatchTexture', 'remote');
            }
        };
    } else {
        pc.onaddstream = function(evt) {
            const remoteIndex = remotes.indexOf(this.remoteId);
            MediaDevices[remoteIndex] = evt.streams[remoteIndex];
            SendMessage('userManager', 'attatchTexture', 'remote');
        }
    }

    // reliableChannels[remoteId] = orderdDCs[remoteId] || {};
    // reliableChannels[remoteId] = pc.createDataChannel('unitywebgl-orderd');
    // unreliableChannels[remoteId] = unreliableChannels[remoteId] || {};
    // unreliableChannels[remoteId] = pc.createDataChannel('unitywebgl-noneorderd', { orderd: false, maxRetransmits: 0});

    navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                // 最初はMediaDevices[0]のストリームを適用
                deviceId: MediaDevices[0].deviceId 
            }
        })
        .then(stream => {
            appendVideo('selfStream', stream);
            if(pc.addTrack) {
                senders = senders || {};
                if(stream.getAudioTracks().length)
                    senders.audio = pc.addTrack(stream.getAudioTracks()[0], stream);
                if(stream.getVideoTracks().length)
                    senders.video = pc.addTrack(stream.getVideoTracks()[0], stream);
            } else {
                pc.addStream(stream);
            }
        })
        .catch(error => {
            console.log(error.name + ": " + error.message);
        });
}

signalingChannel.onmessage = function(evt) {
    let message = JSON.parse(evt.data);
    if (!pc)
        webrtcStart(message.remoteId);
    if (message.desc) {
        let desc = message.desc;
        if (desc.type == "offer") {
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .then(_ =>{
                    return pc.createAnswer();
                })
                .then(answer => {
                    return pc.setLocalDescription(new RTCSessionDescription(answer));
                })
                .then(_ => {
                    //signalingChannel.postMessage(JSON.stringify({desc: pc.localDescription, remoteId: myId}));
                    signalingChannel.postMessage(JSON.stringify({desc: pc.localDescription}));
                })
                .catch(error => {
                    console.log(error.name + ": " + error.message);
                });
        } else if (desc.type == "answer") {
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .catch(error => {
                    console.log(error.name + ": " + error.message);
                })
                .then(_ => {
                    if(window.chrome) {
                        setTimeout(function() {
                            if(window.chromeGetStats) chromeGetStats().then(displayReport);
                        }, 1000);
                    } else {
                        setTimeout(function() {
                            if(window.firefoxGetStats) firefoxGetStats().then(displayReport);
                        }, 1000);
                    }
                });
        } else
            console.log("Unsupported SDP type. Your code may differ here.");
    } else {
        pc.addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch(error => {
                console.log(error.name + ": " + error.message);
            });
    }
};

function webrtcClose() {
    for(let remoteId in pcs) {
        pcs[remoteId].close();
        delete pcs[remoteId];
    }
}

// function broadcastData(data, reliable = true) {
//     const channels = reliable ? reliableChannels : unreliableChannels; 
//     for(channel of channels) {
//         channel.send(data);
//     }
// }

// function sendData(remoteId, data, reliable = true) {
//     const channels = reliable ? reliableChannels : unreliableChannels;
//     channels[remoteId].send(data); 
// }

// function sendFiles(files, ) {
//     var file = fileInput.files[0];
//     trace('File is ' + [file.name, file.size, file.type,
//         file.lastModifiedDate
//     ].join(' '));

//     // Handle 0 size files.
//     statusMessage.textContent = '';
//     downloadAnchor.textContent = '';
//     if (file.size === 0) {
//         bitrateDiv.innerHTML = '';
//         statusMessage.textContent = 'File is empty, please select a non-empty file';
//         closeDataChannels();
//         return;
//     }
//     sendProgress.max = file.size;
//     receiveProgress.max = file.size;
//     var chunkSize = 16384;
//     var sliceFile = function(offset) {
//         var reader = new window.FileReader();
//         reader.onload = (function() {
//         return function(e) {
//             sendChannel.send(e.target.result);
//             if (file.size > offset + e.target.result.byteLength) {
//             window.setTimeout(sliceFile, 0, offset + chunkSize);
//             }
//             sendProgress.value = offset + e.target.result.byteLength;
//         };
//         })(file);
//         var slice = file.slice(offset, offset + chunkSize);
//         reader.readAsArrayBuffer(slice);
//     };
//     sliceFile(0);
// }
