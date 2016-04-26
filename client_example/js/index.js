var selfEasyrtcid = "";
var haveSelfVideo = false;
var otherEasyrtcid = null;

isConnected = false;


var app = angular.module('mpcStream', ['ngRoute', 'ui.bootstrap', 'angular-confirm', 'youtube-embed', 'LocalStorageModule']);
app.config(function (localStorageServiceProvider) {
    localStorageServiceProvider
        .setPrefix('mpc');
});
app.factory('userService', ['$http', function ($http) {
    var api = '/'
    return {
        getUserInfo: function (id) {
            return $http.get(api + 'getuser/' + id);
        },
        getRoomInfo: function (id) {
            return $http.get(api + 'getroom/' + id);
        },
        login: function (data) {
            return $http.post(api + 'login', data);
        },
        listQuestions: function (model) {
            return $http.post(api + 'listQuestions', {});
        },
        sendQuestion: function (question) {
            return $http.post(api + 'sendQuestion', question);
        }
    }
}])

app.directive('errSrc', function () {
    var errSrc = {
        link: function postLink(scope, iElement, iAttrs) {
            iElement.bind('error', function () {
                if (iAttrs.errHide)
                    $(iElement).hide();
                else
                    angular.element(this).attr("src", iAttrs.errSrc);
            });
        }
    }
    return errSrc;
});
app.directive("fileread", [function () {
    return {
        scope: {
            fileread: "="
        },
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                var reader = new FileReader();
                reader.onload = function (loadEvent) {
                    scope.$apply(function () {
                        scope.fileread = loadEvent.target.result;
                    });
                }
                reader.readAsDataURL(changeEvent.target.files[0]);
            });
        }
    }
}]);

app.run(function ($confirmModalDefaults) {
    $confirmModalDefaults.templateUrl = 'views/addImage.html';
    $confirmModalDefaults.defaultLabels.title = 'Modal Title';
    $confirmModalDefaults.defaultLabels.ok = 'Có';
    $confirmModalDefaults.defaultLabels.cancel = 'Không';
})
app.controller('mainController', mainController);

mainController.$inject = ['$scope', 'userService', '$location', '$q', '$confirm', 'localStorageService'];
function mainController($scope, userService, $location, $q, $confirm, localStorageService) {
    console.log('new connect');
    if (!localStorageService.isSupported) {
        log('not supported!');
        return;
    }
    $scope.canStream = false;
    $scope.isStreaming = false;
    $scope.listUsers = [];
    $scope.currentUser = {};
    $scope.currentRoom = {
        room_id: 1,
        room_slug: 'mpcStream',
        manager: 28
    };
    $scope.chats = [];
    $scope.questions = [];
    $scope.waitingStream = {
        imageUrl: 'http://mpc.edu.vn/f/img/logo.png',
        videoId: 'sMKoNBRZM1M',
        playerVars: {
            controls: 0,
            autoplay: 1
        }
    }
    var qs = localStorageService.get('user');
    if (!qs || !qs.UserID) {
        showLoginForm();
    } else
        onUserLoginSuccess();

    function onViewOnlyMode() {
        $scope.isViewOnly = true;
        connect($scope.currentRoom, {UserId: 0, UserName: 'Khách_' + Date.now()})
    }

    function onUserLoginSuccess() {
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
            connect($scope.currentRoom, $scope.currentUser)
        });
    }

    $scope.onSendChat = function () {
        if (!isConnected)
            return;
        $scope.chats.push({
            id: selfEasyrtcid,
            content: $scope.chatInput
        });
        SendPeerMessageToUsers("Chat", $scope.chatInput);
        $scope.chatInput = '';
    }

    $scope.startStream = function () {
        log('start stream');
        if (isAdmin()) {
            $scope.waitingPlayer.stopVideo();
            var buttonLabel = "Admin Source";
            easyrtc.initMediaSource(
                function (stream) {
                    createLocalVideo(stream, buttonLabel);
                    isConnected = true;
                    // notify to clients
                    $scope.$apply(function () {
                        $scope.isStreaming = true;
                    })
                    for (var user in $scope.listUsers) {
                        easyrtc.sendPeerMessage(user, 'AdminStartStream', {adminEasyrtcId: selfEasyrtcid},
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
    }

    $scope.stopStream = function () {
        hangup();
        $scope.isStreaming = false;
    }
    $scope.setStreamWaiting = function () {
        $confirm({
            oldData: $scope.waitingStream
        }, {
            controller: 'addImage.controller',
            templateUrl: 'views/addImage.html'
        }).then(function (result) {
            SendPeerMessageToUsers('SetWaitingStreamImage', result);
            angular.extend($scope.waitingStream, result);
        })
    };

    $scope.sendQuestion = function () {
        $confirm({
        },{
            controller: 'sendQuestion.controller',
            templateUrl: 'views/sendQuestion.html'
        }).then(function (result) {
            $scope.questions= [];
            getListQuestions();
        })
    };

    $scope.viewQuestion = function (question) {
        $confirm({
            question: question
        },{
            controller: 'viewQuestion.controller',
            templateUrl: 'views/viewQuestion.html'
        }).then(function (result) {
        })
    }
    $scope.isAdmin = isAdmin;


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

    function getListQuestions() {
        userService.listQuestions({}).success(function (result) {
            result.forEach(function (item) {
                $scope.questions.push(item);
            });
        })
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
        document.getElementById('videoStream').innerHTML = '';
        var container = document.createElement("div");
        //container.style.marginBottom = "10px";
        var formattedName = streamName.replace("(", "<br>").replace(")", "");
        var labelBlock = document.createElement("div");
        labelBlock.style.width = "220px";
        labelBlock.style.cssFloat = "left";
        labelBlock.innerHTML = "<pre>" + formattedName + "</pre><br>";
        //container.appendChild(labelBlock);
        var video = document.createElement("video");
        // video.width = 320;
        // video.height = 240;
        video.muted = isLocal;
        video.style.verticalAlign = "middle";
        container.appendChild(video);
        document.getElementById('videoStream').appendChild(container);
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
                if (isConnected && !$scope.isStreaming)
                    callToAdmin(who)
                return;
            case "SetWaitingStreamImage":
                $scope.$apply(function () {
                    $scope.waitingStream = content;
                    // waitingPlayer.playVideo();
                })
                return;
        }
        $scope.chats.push({
            id: who,
            content: content
        });
        $scope.$apply();
        // // Escape html special characters, then add linefeeds.
        // content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // content = content.replace(/\n/g, '<br />');
        // console.log(content);
    }

    function connect(room, user) {
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
        hide('hangupButton');
        isConnected = false;
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
        if (!isAdmin() && isConnected && !$scope.isStreaming) {
            SendPeerMessageToUsers('WhoIsAdmin', null);
        }
    }

    function stopWaitingVideo() {
        $scope.$apply(function () {
            try {
                $scope.waitingPlayer.stopVideo();
            }
            catch (e) {
                setTimeout(stopWaitingVideo, 1000)
            }
        })
    }

    function performCall(targetEasyrtcId) {
        var acceptedCB = function (accepted, easyrtcid) {
            if (!accepted) {
                log('call rehected');
                easyrtc.showError("CALL-REJECTED", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
                enable('otherClients');
            }
            else {
                log('call accepted')
                $scope.$apply(function () {
                    $scope.isStreaming = true;
                })
                stopWaitingVideo();
                otherEasyrtcid = targetEasyrtcId;
            }
        };

        var successCB = function () {
            log('call successfull')
            isConnected = true;
            show('hangupButton');
        };
        var failureCB = function () {
            enable('otherClients');
            log('call failed')
        };
        var keys = easyrtc.getLocalMediaIds();

        easyrtc.call(targetEasyrtcId, successCB, failureCB, acceptedCB, keys);
        show('hangupButton');
    }

    function isAdmin() {
        return $scope.currentUser.UserID == $scope.currentRoom.manager
    }

    function loginSuccess(easyrtcid) {
        hide("connectButton");
        show("disconnectButton");
        enable('otherClients');
        selfEasyrtcid = easyrtcid;
        log('connect to rtc success')
        $scope.$apply(function () {
            isConnected = true;
            $scope.canStream = true;
            getListQuestions();
        });
    }

    function SendPeerMessageToUsers(msgType, data) {
        for (var user in $scope.listUsers) {
            SendPeerMessageToUser(user, msgType, data);

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
        document.getElementById("iam").innerHTML = "logged out";
        easyrtc.disconnect();
        show("connectButton");
        //    disable("disconnectButton");
        clearConnectList();
        easyrtc.setVideoObjectSrc(document.getElementById('selfVideo'), "");
    }

    easyrtc.setStreamAcceptor(function (easyrtcid, stream, streamName) {
        console.log('accepter')
        var labelBlock = addMediaStreamToDiv("remoteVideos", stream, streamName, false);
        $scope.$apply(function () {
            $scope.isStreaming = true;
            $scope.waitingPlayer.stopVideo();
        });
        //labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;
        log("accepted incoming stream with name " + stream.streamName);
        log("checking incoming " + easyrtc.getNameOfRemoteStream(easyrtcid, stream));
    });


    easyrtc.setOnStreamClosed(function (easyrtcid, stream, streamName) {
        var item = document.getElementById("remoteBlock" + easyrtcid + streamName);
        $scope.$apply(function () {
            $scope.isStreaming = false;
        })
        //item.parentNode.removeChild(item);
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
        // if (easyrtc.getConnectionCount() > 0) {
        //     easyrtc.hangupAll();
        // }
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
}