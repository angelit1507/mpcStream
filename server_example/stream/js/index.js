var selfEasyrtcid = "";
var haveSelfVideo = false;
var otherEasyrtcid = null;

isConnected = false;


var app = angular.module('mpcStream', ['ngRoute', 'ui.bootstrap', 'angular-confirm', 'youtube-embed', 'LocalStorageModule', 'toaster', 'ngAnimate']);
app.config(function (localStorageServiceProvider) {
    localStorageServiceProvider
        .setPrefix('mpc');
});


app.directive('countdown', ['Util', '$interval', function (Util, $interval) {
    return {
        restrict: 'A',
        scope: {
            date: '@'
        },
        link: function (scope, element) {
            var future = new Date(scope.date)
            $interval(function () {
                diff = Math.floor(future.getTime() - new Date().getTime()) / 1000
                $(element).html(Util.dhms(diff, 1000));
            }, 1000);
        }
    }
}]);

app.factory('Util', [function () {
    return {
        dhms: function (t) {
            days = Math.floor(t / 86400);
            t -= days * 86400;
            hours = Math.floor(t / 3600) % 24;
            t -= hours * 3600;
            minutes = Math.floor(t / 60) % 60;
            t -= minutes * 60;
            seconds = parseInt(t % 60);
            return [days + 'd', hours + 'h', minutes + 'm', seconds + 's'].join(' ');
        }
    }
}]);

app.factory('userService', ['$http', 'localStorageService', function ($http, localStorageService) {
    var api = '/'
    var currentRoom = {
        room_id: 1,
        room_slug: 'mpcStream',
        manager: 28
    };
    var waitingSream = {
        imageUrl: 'http://mpc.edu.vn/f/img/logo.png',
        videoIds: ['iRugN3aUbHM'],
        playerVars: {
            controls: 0,
            autoplay: 0
        },
        currentVideoId: 'iRugN3aUbHM'
    };
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
        },
        deleteQuestion: function (id) {
            return $http.post(api + 'deleteQuestion', {id: id});
        },
        listSchedules: function (model) {
            return $http.post(api + 'listSchedules', {});
        },
        addSchedule: function (question) {
            return $http.post(api + 'addSchedule', question);
        },
        deleteSchedule: function (id) {
            return $http.post(api + 'deleteSchedule', {id: id});
        },
        banChat: function (id) {
            return $http.post(api + 'banChat', {id: id});
        },
        banView: function (id) {
            return $http.post(api + 'banView', {id: id});
        },
        unBanChat: function (id) {
            return $http.post(api + 'unBanChat', {id: id});
        },
        unBanView: function (id) {
            return $http.post(api + 'unBanView', {id: id});
        },
        currentRoom: currentRoom,
        isAdmin: function isAdmin() {
            var user = localStorageService.get('user');
            if (user == null || user.UserID != currentRoom.manager)
                return false;
            return true;
        },
        getWaitingStreamData: function () {
            var dt = localStorageService.get('wtData')
            if (dt == null || dt.videoIds == null || dt.videoIds.length == 0)
            {
                localStorageService.set('wtData', waitingSream);
                return waitingSream;
            }
            return dt;
        },
        setWaitingStreamData: function (dt) {
            localStorageService.set('wtData', dt);
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
    // $confirmModalDefaults.templateUrl = 'views/addImage.html';
    // $confirmModalDefaults.defaultLabels.title = 'Modal Title';
    $confirmModalDefaults.defaultLabels.ok = 'Có';
    $confirmModalDefaults.defaultLabels.cancel = 'Không';
})
app.controller('mainController', mainController);

mainController.$inject = ['$scope', 'userService', '$location', '$q', '$confirm', 'localStorageService', 'toaster', '$filter', '$window'];
function mainController($scope, userService, $location, $q, $confirm, localStorageService, toaster, $filter, $window) {
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
        $scope.currentUser = {UserId: 0, UserName: 'Khách_' + Date.now()};
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
            if (!$scope.currentUser.Stream_CanView) {
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
        if (!isConnected)
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
            $scope.questions = [];
            getListQuestions();
        })
    };


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
                log('get waiting image...');
                $scope.needGetAdminInfo = false;
                SendPeerMessageToUser(who, "GetWaitingStreamData");
                if (isConnected && !$scope.isStreaming)
                    callToAdmin(who)
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
                return;
            case "Chat_Delete":
                $scope.$apply(function () {
                    var chats = $filter('filter')($scope.chats, {id: content.id});
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
                //stopWaitingVideo();
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