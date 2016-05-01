/**
 * Created by Angel on 4/26/2016.
 */
app.controller('login.controller', loginController);
loginController.$inject = ['$scope', 'userService','localStorageService', 'toaster']
function loginController($scope,userService,localStorageService, toaster) {
    $scope.user = {};
    $scope.login = function () {
        if($scope.form.$invalid){
            toaster.pop('error', 'Vui lòng nhập đầy đủ thông tin')
            return;
        }
        userService.login($scope.user).success(function (rs) {
            if(rs.code)
            {
                toaster.pop('error', 'Đăng nhập thất bại!')
                return;
            }
            localStorageService.set('user', rs);
            $scope.$close(rs);
        })
    }

    $scope.viewOnly = function () {
        $scope.$close();
    }
}