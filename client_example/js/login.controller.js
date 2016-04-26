/**
 * Created by Angel on 4/26/2016.
 */
app.controller('login.controller', loginController);
loginController.$inject = ['$scope', 'userService','localStorageService']
function loginController($scope,userService,localStorageService) {
    $scope.user = {};
    $scope.login = function () {
        if($scope.form.$invalid){
            return;
        }
        userService.login($scope.user).success(function (rs) {
            if(rs.code)
            {
                return;
            }
            localStorageService.set('user', rs);
            $scope.$close(rs);
        })
    }
}