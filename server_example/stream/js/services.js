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
            return $http.post(api + 'deleteQuestion', { id: id });
        },
        listSchedules: function (model) {
            return $http.post(api + 'listSchedules', {});
        },
        addSchedule: function (question) {
            return $http.post(api + 'addSchedule', question);
        },
        deleteSchedule: function (id) {
            return $http.post(api + 'deleteSchedule', { id: id });
        },
        banChat: function (id) {
            return $http.post(api + 'banChat', { id: id });
        },
        banView: function (id) {
            return $http.post(api + 'banView', { id: id });
        },
        unBanChat: function (id) {
            return $http.post(api + 'unBanChat', { id: id });
        },
        unBanView: function (id) {
            return $http.post(api + 'unBanView', { id: id });
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
            if (dt == null || dt.videoIds == null || dt.videoIds.length == 0) {
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