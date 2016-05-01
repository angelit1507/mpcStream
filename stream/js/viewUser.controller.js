/**
 * Created by Angel on 5/1/2016.
 */
app.controller('viewUser.controller', viewUserController);
viewUserController.$inject = ['$scope','data', 'userService'];
function viewUserController($scope, data,userService) {
    $scope.user = {};
    if(!data.id){
        $scope.cancel();
    }
    $scope.isAdmin = function () {
        return userService.isAdmin();
    }
    userService.getUserInfo(data.id).success(function (user) {
        if (!user || user.code)
            return;
        $scope.user = user;
    });
}