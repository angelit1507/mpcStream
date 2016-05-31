var selfEasyrtcid = "";
var haveSelfVideo = false;
var otherEasyrtcid = null;

isConnected = false;


var app = angular.module('mpcStream', ['ngRoute', 'ui.bootstrap', 'angular-confirm', 'youtube-embed', 'LocalStorageModule', 'toaster', 'ngAnimate', 'luegg.directives']);
app.config(function (localStorageServiceProvider) {
    localStorageServiceProvider
        .setPrefix('mpc');
});


app.run(function ($confirmModalDefaults) {
    $confirmModalDefaults.defaultLabels.ok = 'Có';
    $confirmModalDefaults.defaultLabels.cancel = 'Không';
})
app.controller('mainController', mainController);

mainController.$inject = ['$scope', 'userService', '$location', '$q', '$confirm', 'localStorageService', 'toaster', '$filter', '$window', '$document'];
function mainController($scope, userService, $location, $q, $confirm, localStorageService, toaster, $filter, $window, $document) {
    console.log('new connect');
    if (!localStorageService.isSupported) {
        log('not supported!');
        return;
    }
    $scope.canStream = false;
    $scope.isStreaming = false;
    $scope.listUsers = [];
    $scope.currentUser = {};
    $scope.currentRoom = userService.currentRoom;
    $scope.chats = [];
    $scope.questions = [];
    $scope.needGetAdminInfo = true;
    $scope.hasSubStreamer = false;
    $scope.stream = {
        streamerCount: 0,
        isSubStreamer: false
    }
    $scope.waitingStream = userService.getWaitingStreamData();
    $scope.currentQuestion = {};
    var qs = localStorageService.get('user');
    if (!qs || !qs.UserID) {
        showLoginForm();
    } else
        onUserLoginSuccess();

    function onViewOnlyMode() {
        $scope.isViewOnly = true;
        $scope.isLoggedIn = false;
        $scope.currentUser = { UserId: 0, UserName: 'Khách_' + Date.now() };
        connect($scope.currentRoom, $scope.currentUser);
    }

    function onUserLoginSuccess() {
        $scope.isLoggedIn = true;
        $scope.isViewOnly = false;
        var userDefered = $q.defer();
        log('check user info');
        userService.getUserInfo(qs.UserID).success(function (user) {
            if (!user || user.code)
                return;
            $scope.currentUser = user;
            log('logged in with user info: ');
            console.log(user);
            userDefered.resolve();
        });
        $q.all([userDefered.promise]).then(function () {
            if (!$scope.currentUser || !$scope.currentUser.UserID) {
                log('user not found');
                return;
            }
            if ($scope.currentUser.Stream_CanView === false) {
                if (!isAdmin())
                    showBanStreamDialog();
                else
                    toaster.info('Admin đừng tự ban mình nha thím!')
                return;
            }
            connect($scope.currentRoom, $scope.currentUser)
        });
    }

    $scope.onSendChat = function () {
        if (!isConnected || $scope.chatInput.length == 0)
            return;
        var chat = {
            id: Date.now(),
            userRtcId: selfEasyrtcid,
            content: $scope.chatInput,
            user: $scope.currentUser
        };
        $scope.chats.push(chat);
        SendPeerMessageToUsers("Chat", chat);
        $scope.chatInput = '';
    }
    
    $scope.deleteChat = function (chat, index) {
        SendPeerMessageToUsers("Chat_Delete", chat);
        $scope.chats.splice(index, 1);
    }

    $scope.startStream = function () {
        if (!isAdmin()) {
            return;
        }
        log('start stream');
        $scope.sysMessage('admin starting stream...');
        easyrtc.setVideoDims(640, 480);
        stopWaitingVideo()
        var buttonLabel = "AdminSource";
        easyrtc.initMediaSource(
            function (stream) {
                createLocalVideo(stream, buttonLabel);
                isConnected = true;
                // notify to clients
                $scope.$apply(function () {
                    $scope.isStreaming = true;
                    $scope.stream.isStreaming = true;
                    $scope.stream.sourceName = buttonLabel;
                })
                for (var user in $scope.listUsers) {
                    easyrtc.sendPeerMessage(user, 'AdminStartStream', { adminEasyrtcId: selfEasyrtcid },
                        function (msgType, msgBody) {
                            console.log("message was sent");
                        },
                        function (errorCode, errorText) {
                            console.log("error was " + errorText);
                        });

                }
                if (otherEasyrtcid) {
                    easyrtc.addStreamToCall(otherEasyrtcid, buttonLabel, function (easyrtcid, streamName) {
                        easyrtc.showError("Informational", "other party " + easyrtcid + " acknowledges receiving " + streamName);
                    });
                }
            },
            function (errCode, errText) {
                easyrtc.showError(errCode, errText);
            }, buttonLabel);
    }

    $scope.stopStream = function () {
        hangup();
        $scope.isStreaming = false;
        $scope.stream.isStreaming = false;
    }
    $scope.setStreamWaiting = function () {
        $confirm({
            oldData: $scope.waitingStream
        }, {
                controller: 'addImage.controller',
                templateUrl: 'views/addImage.html'
            }).then(function (result) {
                SendPeerMessageToUsers('SetWaitingStreamImage', result);
                $scope.waitingStream.videoIds = result.videoIds;
                $scope.waitingStream.imageUrl = result.imageUrl;

                log('try play video')

                if ($scope.waitingStream.videoIds.length > 0) {
                    if ($scope.waitingStream.currentVideoId != $scope.waitingStream.videoIds[0])
                        $scope.waitingStream.currentVideoId = $scope.waitingStream.videoIds[0];
                }
                userService.setWaitingStreamData($scope.waitingStream);
            })
    };
    $scope.setSubStreamer = function (easyId) {
        SendPeerMessageToUser(easyId, 'SubStreamerCanStream', {});
    }
    $scope.stopSubStreamer = function (easyId) {
        SendPeerMessageToUser(easyId, 'SubStreamerStopStream', {});
        $scope.stream.subStreamId = '';
    }
    $scope.isAdminStreamOnly = function () {
        return !$scope.stream.isSubStreamerStreaming;
    }

    $scope.$on('youtube.player.ended', function ($event, player) {
        console.log('video end')
        var index = $scope.waitingStream.videoIds.indexOf($scope.waitingStream.currentVideoId);
        if (index >= 0 && $scope.waitingStream.videoIds.length > index + 1) {
            $scope.waitingStream.currentVideoId = $scope.waitingStream.videoIds[index + 1];
        } else {
            $scope.waitingStream.currentVideoId = $scope.waitingStream.videoIds[0];
        }
        player.playVideo();
    });

    $scope.$on('youtube.player.ready', function ($event, player) {
        console.log('video ready')
        player.playVideo();
    });
    $scope.$on('youtube.player.paused', function ($event, player) {
        console.log('video paused')
        player.playVideo();
    });
    $scope.$on('Permision', function ($event, data) {
        SendPeerMessageToUsers(data.type, data, true);
    });
    $scope.sendQuestion = function () {
        $confirm({}, {
            controller: 'sendQuestion.controller',
            templateUrl: 'views/sendQuestion.html'
        }).then(function (result) {

        })
    };
    $scope.sysMessage = function sysMessage(text) {
        var chat = {
            id: Date.now(),
            userRtcId: selfEasyrtcid,
            content: text,
            user: { UserID: -1, UserName: 'system' }
        };
        $scope.chats.push(chat);
        SendPeerMessageToUsers("Chat", chat);
    }


    $scope.isAdmin = isAdmin;
    $scope.listQuestions = function () {
        $confirm({}, {
            controller: 'listQuestion.controller',
            templateUrl: 'views/listQuestion.html'
        }).then(function (result) {
            if (!result)
                return;
            SendPeerMessageToUsers("SetStreamQuestion", result);
            $scope.currentQuestion = result;
            toaster.pop('success', 'Câu hỏi đã được hiện ở trang chủ!');
        })
    };

    $scope.listStreamSchedules = function () {
        $confirm({}, {
            controller: 'listStreamSchedules.controller',
            templateUrl: 'views/listSchedule.html',
            size: 'lg'
        }).then(function (result) {

        })
    };


    $scope.viewQuestion = function (question) {
        $confirm({
            question: question
        }, {
                controller: 'viewQuestion.controller',
                templateUrl: 'views/viewQuestion.html'
            }).then(function (result) {
            })
    }
    $scope.logout = function () {
        localStorageService.remove('user');
        hangup();
        $scope.currentUser = null;
        showLoginForm();
    }
    $scope.showLoginForm = showLoginForm;
    $scope.viewUser = function (id) {
        $confirm({
            id: id
        }, {
                controller: 'viewUser.controller',
                templateUrl: 'views/viewUser.html'
            }).then(function (result) {
            })
    }
    function onBannedChat() {
        $scope.currentUser.Stream_CanChat = false;
        toaster.pop('warning', 'Bạn đã bị cấm chat');
    }

    function onUnBanChat() {
        $scope.currentUser.Stream_CanChat = true;
        toaster.pop('info', 'Bạn đã được admin cho phép chat');
    }

    function reloadPage() {
        $window.location.reload();
    }

    function showBanStreamDialog() {
        $confirm({
            title: 'Thông báo!',
            text: 'Bạn đã bị cấm xem stream',
            ok: 'Tải lại trang',
            cancel: 'Thử lại'
        }).then(reloadPage, reloadPage);
    }

    function onBannedView() {
        $scope.currentUser.Stream_CanView = false;
        disconnect();
        showBanStreamDialog();
    }

    function onUnBanView() {
        $scope.currentUser.Stream_CanView = true;
        $confirm({
            title: 'Thông báo!',
            text: 'Bạn đã được admin cho phép xem stream',
            ok: 'Tải lại trang'
        }).then(reloadPage, reloadPage);
    }

    function showLoginForm() {
        $confirm({}, {
            templateUrl: 'views/login.html',
            controller: 'login.controller',
            size: 'sm',
            backdrop: false,
        }).then(function (rs) {
            qs = localStorageService.get('user');
            if (!qs)
                onViewOnlyMode();
            else
                onUserLoginSuccess();
        }, function () {
            showLoginForm();
        });
    }

    function disable(domId) {
        log("about to try disabling " + domId);
        document.getElementById(domId).disabled = "disabled";
    }

    function hide(domId) {
        $('#' + domId).hide();
    }

    function show(domId) {
        $('#' + domId).show();
    }

    function enable(domId) {
        log("about to try enabling " + domId);
        //document.getElementById(domId).disabled = "";
    }


    function createLabelledButton(buttonLabel) {
        var button = document.createElement("button");
        button.appendChild(document.createTextNode(buttonLabel));
        document.getElementById("videoSrcBlk").appendChild(button);
        return button;
    }


    function addMediaStreamToDiv(divId, stream, streamName, isLocal) {
        // reset
        document.getElementById(divId).innerHTML = '';
        var container = document.createElement("div");
        //container.style.marginBottom = "10px";
        var formattedName = streamName.replace("(", "<br>").replace(")", "");
        var labelBlock = document.createElement("div");
        // labelBlock.style.width = "220px";
        // labelBlock.style.cssFloat = "left";
        labelBlock.innerHTML = "<pre>" + formattedName + "</pre><br>";
        //container.appendChild(labelBlock);
        var video = document.createElement("video");
        // video.height = 240;
        video.muted = isLocal;
        video.style.width = "100%";
        video.style.verticalAlign = "middle";
        container.appendChild(video);
        document.getElementById(divId).appendChild(container);
        video.autoplay = true;
        easyrtc.setVideoObjectSrc(video, stream);
        return labelBlock;
    }


    function createLocalVideo(stream, streamName) {
        var labelBlock = addMediaStreamToDiv("localVideos", stream, streamName, true);
        // var closeButton = createLabelledButton("close");
        // closeButton.onclick = function() {
        //     easyrtc.closeLocalStream(streamName);
        //     labelBlock.parentNode.parentNode.removeChild(labelBlock.parentNode);
        // }
        // labelBlock.appendChild(closeButton);

        log("created local video, stream.streamName = " + stream.streamName);
    }

    function addSrcButton(buttonLabel, videoId) {
        var button = createLabelledButton(buttonLabel);
        button.onclick = function () {
            //easyrtc.setVideoSource(videoId);
            easyrtc.initMediaSource(
                function (stream) {
                    createLocalVideo(stream, buttonLabel);
                    if (otherEasyrtcid) {
                        console.log('Admin had stream..');
                        easyrtc.addStreamToCall(otherEasyrtcid, buttonLabel, function (easyrtcid, streamName) {
                            easyrtc.showError("Informational", "other party " + easyrtcid + " acknowledges receiving " + streamName);
                        });
                    }
                },
                function (errCode, errText) {
                    easyrtc.showError(errCode, errText);
                }, buttonLabel);
        };
    }

    function receivePeerMessage(who, msgType, content) {
        console.log('receivePeerMessage ' + msgType);
        switch (msgType) {
            case "AdminStartStream":
                callToAdmin(who)
                return;
            case "WhoIsAdmin":
                if (isAdmin())
                    SendPeerMessageToUser(who, "IAMAdmin", null)
                return;
            case "IAMAdmin":
                log('get waiting image...');
                $scope.needGetAdminInfo = false;
                SendPeerMessageToUser(who, "GetWaitingStreamData");
                // if (isConnected && !$scope.isStreaming)
                //     callToAdmin(who)
                return;
            case "SetWaitingStreamImage":
                $scope.$apply(function () {
                    $scope.waitingStream.videoIds = content.videoIds;
                    $scope.waitingStream.imageUrl = content.imageUrl;
                    log('try play video')
                    if ($scope.waitingStream.videoIds.length > 0) {
                        if ($scope.waitingStream.currentVideoId != $scope.waitingStream.videoIds[0])
                            $scope.waitingStream.currentVideoId = $scope.waitingStream.videoIds[0];
                    }
                    userService.setWaitingStreamData($scope.waitingStream);
                })
                return;
            case "SetStreamQuestion":
                $scope.$apply(function () {
                    $scope.currentQuestion = content;
                })
                return;
            case "GetWaitingStreamData":
                SendPeerMessageToUser(who, "SetWaitingStreamImage", $scope.waitingStream);
                SendPeerMessageToUser(who, "SetStreamData", $scope.stream);
                return;
            case "Chat_Delete":
                $scope.$apply(function () {
                    var chats = $filter('filter')($scope.chats, { id: content.id });
                    chats.forEach(function (c) {
                        var index = $scope.chats.indexOf(c);
                        $scope.chats.splice(index, 1)
                    })
                })
                return;
            case "BanChat":
                if (content.userId != $scope.currentUser.UserID)
                    return;
                if (who == selfEasyrtcid) {
                    onBannedChat();
                    return;
                }
                $scope.$apply(function () {
                    onBannedChat();
                })
                return;
            case "UnBanChat":
                if (content.userId != $scope.currentUser.UserID)
                    return;
                if (who == selfEasyrtcid) {
                    onUnBanChat();
                    return;
                }
                $scope.$apply(function () {
                    onUnBanChat();
                })
                return;
            case "BanView":
                if (content.userId != $scope.currentUser.UserID)
                    return;
                if (who == selfEasyrtcid) {
                    onBannedView();
                    return;
                }
                $scope.$apply(function () {
                    onBannedView();
                })
                return;
            case "UnBanView":
                if (content.userId != $scope.currentUser.UserID)
                    return;
                if (who == selfEasyrtcid) {
                    onUnBanView();
                    return;
                }
                $scope.$apply(function () {
                    onUnBanView();
                })
                return;
            case "SubStreamerCanStream":
                startStream();
                $scope.$apply(function () {
                    $scope.isStreaming = true;
                })
                return;
            case "SubStreamerStopStream":
                log('close local stream');
                easyrtc.closeLocalStream('SubStreamSource');
                $scope.$apply(function () {
                    $scope.isStreaming = false;
                    $scope.stream.isSubStreamerStreaming = false;
                })
                return;
            case "SubStreamerStartStream":
                if (!isAdmin() && $scope.isStreaming) {
                    log('close local stream');
                    easyrtc.closeLocalStream($scope.stream.sourceName);
                }
                callToStreamer(who);
                $scope.$apply(function () {
                    $scope.sysMessage('subStreamer start streaming');
                    $scope.hasSubStreamer = true;
                    $scope.stream.subStreamId = who;
                    $scope.stream.hasSubStreamer = true;
                    $scope.stream.isSubStreamerStreaming = true;
                })
                return;
            case "SetStreamData":
                log('get stream data');
                $scope.$apply(function () {
                    $scope.stream = angular.extend($scope.stream, content);
                    $scope.stream.streamerCount = 0;
                })
                if ($scope.stream.isStreaming) {
                    callToAdmin(who);
                }
                if ($scope.stream.isSubStreamerStreaming) {
                    callToStreamer($scope.stream.subStreamId)
                }
                return;
        }
        content.from = who;
        $scope.chats.push(content);
        
        $scope.$apply();
    }

    function connect(room, user) {
        if (isConnected) {
            log('already connected!');
            if (!$scope.isViewOnly) {
                easyrtc.setUsername(user.UserName);
            }
            return;
        }
        log("Initializing.");

        easyrtc.setPeerListener(receivePeerMessage);
        // audio only
        log("Enable video stream....");
        easyrtc.enableVideo(true);
        easyrtc.enableVideoReceive(true);
        log('create rom ' + room.room_slug);

        console.log('connect with user name: ' + user.UserName);

        easyrtc.setUsername(user.UserName);

        easyrtc.joinRoom(room.room_slug, null, function () {
            log("joined room " + room.room_slug);
        }, function () {
            log("error when join room")
        })

        log("Registering room listener.");
        easyrtc.setRoomOccupantListener(convertListToButtons);

        log("Connecting...");
        easyrtc.connect("easyrtc.multistream", loginSuccess, loginFailure);
        easyrtc.setAutoInitUserMedia(false);


        easyrtc.getVideoSourceList(function (videoSrcList) {
            if (videoSrcList.length == 0) {
                easyrtc.showError("You don't have media source - please prepare before stream");
                return;
            }
            $scope.videoSrcList = videoSrcList;
            $scope.$apply();
            for (var i = 0; i < videoSrcList.length; i++) {
                var videoEle = videoSrcList[i];
                var videoLabel = (videoSrcList[i].label && videoSrcList[i].label.length > 0) ?
                    (videoSrcList[i].label) : ("src_" + i);
                //addSrcButton(videoLabel, videoSrcList[i].id);
                //addSrcButton("StreamSource_" + i, videoSrcList[i].id);
            }
        });
    }


    function hangup() {
        easyrtc.hangupAll();
        easyrtc.closeLocalStream($scope.stream.sourceName);
        hide('hangupButton');
    }


    function clearConnectList() {
        var otherClientDiv = document.getElementById('otherClients');
        while (otherClientDiv.hasChildNodes()) {
            otherClientDiv.removeChild(otherClientDiv.lastChild);
        }
    }


    function convertListToButtons(roomName, occupants, isPrimary) {
        $scope.listUsers = occupants;
        $scope.$apply();
        if (!isAdmin() && isConnected && !$scope.isStreaming && $scope.needGetAdminInfo) {
            SendPeerMessageToUsers('WhoIsAdmin', null);
        }
    }

    function stopWaitingVideo() {
        try {
            $scope.waitingPlayer.stopVideo();
        }
        catch (e) {
            setTimeout(stopWaitingVideo, 1000)
        }
    }

    var iceServers = [];
    function performCall(targetEasyrtcId) {
        var acceptedCB = function (accepted, easyrtcid) {
            if (!accepted) {
                log('call rejected');
                easyrtc.showError("CALL-REJECTED", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
                enable('otherClients');
            }
            else {
                log('call accepted')
                //stopWaitingVideo();
                otherEasyrtcid = targetEasyrtcId;
            }
        };

        var successCB = function (caller, mediaType) {
            console.log('call successfull', caller, mediaType)
            isConnected = true;
            show('hangupButton');
        };
        var failureCB = function (errorCode, errMessage) {
            enable('otherClients');
            log('call failed', errorCode, errMessage);
        };
        var keys = easyrtc.getLocalMediaIds();
        easyrtc.setIceUsedInCalls(iceServers);
        easyrtc.call(targetEasyrtcId, successCB, failureCB, acceptedCB, keys);
        show('hangupButton');
    }

    function isAdmin() {
        return $scope.currentUser.UserID == $scope.currentRoom.manager
    }

    function loginSuccess(easyrtcid) {
        selfEasyrtcid = easyrtcid;
        $scope.sysMessage('Kết nối thành công!')
        iceServers = easyrtc.getServerIce();
        easyrtc.setVideoBandwidth(0);
        $scope.$apply(function () {
            isConnected = true;
            $scope.canStream = true;
        });
    }

    function SendPeerMessageToUsers(msgType, data, includeMe) {
        for (var user in $scope.listUsers) {
            SendPeerMessageToUser(user, msgType, data);
        }
        if (includeMe) {
            receivePeerMessage(selfEasyrtcid, msgType, data);
        }
    }

    function SendPeerMessageToUser(user, msgType, data) {
        console.log('Send message ' + msgType + ' to user ' + user);
        easyrtc.sendPeerMessage(user, msgType, data,
            function (msgType, msgBody) {
                console.log("message " + msgType + "was sent");
            },
            function (errorCode, errorText) {
                console.log("error was " + errorText);
            });
    }

    function loginFailure(errorCode, message) {
        easyrtc.showError(errorCode, message);
    }


    function disconnect() {
        //document.getElementById("iam").innerHTML = "logged out";
        easyrtc.disconnect();
        show("connectButton");
        //    disable("disconnectButton");
        //clearConnectList();
        //easyrtc.setVideoObjectSrc(document.getElementById('selfVideo'), "");
    }

    easyrtc.setStreamAcceptor(function (easyrtcid, stream, streamName) {
        console.log('accepter')
        $scope.$apply(function () {
            $scope.isStreaming = true;
            $scope.stream = angular.extend($scope.stream, { isStreaming: true, streamerCount: $scope.stream.streamerCount + 1 })
            stopWaitingVideo();
        });
        var labelBlock;
        if (streamName == "AdminSource" || isAdmin())
            labelBlock = addMediaStreamToDiv("videoStream", stream, streamName, false);
        else
            labelBlock = addMediaStreamToDiv("videoStream1", stream, streamName, false);
        //labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;
        log("accepted incoming stream with name " + stream.streamName);
        log("checking incoming " + easyrtc.getNameOfRemoteStream(easyrtcid, stream));
    });


    easyrtc.setOnStreamClosed(function (easyrtcid, stream, streamName) {
        log('stream close');
        $scope.$apply(function () {
            if (streamName == "AdminSource") {
                if ($scope.isStreaming) {
                    log('close local stream');
                    easyrtc.closeLocalStream("SubStreamSource");
                }
                $scope.stream.isStreaming = false;
                $scope.isStreaming = false;
                $scope.stream.isSubStreamerStreaming = false;
            }
            else {
                $scope.stream.isSubStreamerStreaming = false;
            }
        })
    });


    var callerPending = null;

    easyrtc.setCallCancelled(function (easyrtcid) {
        if (easyrtcid === callerPending) {
            document.getElementById('acceptCallBox').style.display = "none";
            callerPending = false;
        }
    });

    easyrtc.setAcceptChecker(function (easyrtcid, callback) {
        otherEasyrtcid = easyrtcid;
        callback(true, easyrtc.getLocalMediaIds());
    });


    function log(text) {
        console.log(text);
        $('.chat_text_top').append('<p>' + text + '</p>');
    }


    function callToAdmin(adminId) {
        log('call to admin');
        performCall(adminId);
    }
    function callToStreamer(easyrtcid) {
        log('call to subStreamer....');
        performCall(easyrtcid);
    }
    function startStream() {
        log('subStreamer start stream.....');
        var buttonLabel = "SubStreamSource";
        easyrtc.initMediaSource(
            function (stream) {
                createLocalVideo(stream, buttonLabel);
                $scope.$apply(function () {
                    $scope.isStreaming = true;
                    $scope.stream.isSubStreamerStreaming = true;
                })
                SendPeerMessageToUsers('SubStreamerStartStream', {})
            },
            function (errCode, errText) {
                easyrtc.showError(errCode, errText);
            }, buttonLabel);
    }
}