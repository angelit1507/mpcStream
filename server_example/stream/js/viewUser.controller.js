/**
 * Created by Angel on 5/1/2016.
 */
app.controller('viewUser.controller', viewUserController);
viewUserController.$inject = ['$scope', 'data', 'userService', 'toaster', '$rootScope'];
function viewUserController($scope, data, userService, toaster, $rootScope) {
    $scope.user = {};
    if (!data.id) {
        $scope.cancel();
    }
    $scope.btnChatDisabled = false;
    $scope.btnViewDisabled = false;
    $scope.isAdmin = function () {
        return userService.isAdmin();
    }
    userService.getUserInfo(data.id).success(function (user) {
        if (!user || user.code)
            return;
        $scope.user = user;
    });
    $scope.banChatOfUser = function () {
        $scope.btnChatDisabled = true;
        var promise = userService.banChat(data.id);
        promise.then(function () {
                $scope.btnChatDisabled = false;
            })
        promise.success(function () {
                toaster.pop('success', 'User đã bị cấm chat')
                $scope.user.Stream_CanChat = false;
                $rootScope.$broadcast('Permision', {
                    type: 'BanChat',
                    userId: data.id
                });
            });
    }
    $scope.unBanChatOfUser = function () {
        var promise = userService.unBanChat(data.id);
        promise.then(function () {
                $scope.btnChatDisabled = false;
            });
        promise.success(function () {
                toaster.pop('success', 'bỏ cấm chat')
                $scope.user.Stream_CanChat = true;
                $rootScope.$broadcast('Permision', {
                    type: 'UnBanChat',
                    userId: data.id
                });
            });
    }
    $scope.banStreamOfUser = function () {
        $scope.btnViewDisabled = true;
        var promise = userService.banView(data.id);
        promise.then(function () {
                $scope.btnViewDisabled = false;
            });
        promise.success(function () {
                toaster.pop('success', 'User đã bị cấm xem stream')
                $scope.user.Stream_CanView = false;
                $rootScope.$broadcast('Permision', {
                    type: 'BanView',
                    userId: data.id
                });
            });
    }
    $scope.unBanStreamOfUser = function () {
        $scope.btnViewDisabled = true;
        var promise = userService.unBanView(data.id);
        promise.then(function () {
                $scope.btnViewDisabled = false;
            });
        promise.success(function () {
                toaster.pop('success', 'Cho phép user xem stream')
                $scope.user.Stream_CanView = true;
                $rootScope.$broadcast('Permision', {
                    type: 'UnBanView',
                    userId: data.id
                });
            });
    }
}